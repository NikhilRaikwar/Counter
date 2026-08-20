from __future__ import annotations

import os
import re
import sqlite3
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.domain.offers.service import OfferService
from app.errors import ApplicationError
from app.main import create_app

BACKEND_ROOT = Path(__file__).resolve().parents[1]
CAPABILITY_HEADER = "X-Counter-Management-Capability"


def migrated_database(path: Path) -> str:
    database_url = f"sqlite+aiosqlite:///{path.as_posix()}"
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    return database_url


@pytest.fixture
def api(tmp_path):
    database_path = tmp_path / "offers.db"
    database_url = migrated_database(database_path)
    app = create_app(Settings(database_url=database_url, _env_file=None))
    with TestClient(app) as client:
        yield client, database_path, database_url


def offer_payload(**overrides):
    payload = {
        "merchant_display_name": "Acme Studio",
        "product_name": "SEO Audit Pro",
        "description": "A complete technical SEO audit.",
        "image_url": None,
        "list_price_paise": 2_000_000,
        "currency": "INR",
    }
    payload.update(overrides)
    return payload


def policy_payload(**overrides):
    payload = {
        "currency": "INR",
        "floor_price_paise": 1_750_000,
        "max_discount_paise": 250_000,
        "max_rounds": 4,
        "expiry_minutes": 30,
        "allowed_bundles": [
            {
                "id": "strategy-call",
                "name": "30-minute strategy call",
                "additional_cost_paise": 0,
            }
        ],
        "allowed_actions": ["negotiate_price", "offer_bundle", "accept_deal", "create_checkout"],
        "forbidden_actions": ["price_below_floor", "invent_bundle", "change_product"],
        "concession_strategy": {
            "mode": "immediate",
            "min_buyer_improvement_paise": 0,
            "max_concession_per_round_paise": 0,
            "hold_on_repeat_offer": False,
            "hold_on_worse_offer": False,
            "accept_buyer_offer_if_authorized": True,
            "hold_at_floor": True,
        },
        "original_rules_text": "Merchant-confirmed structured authority.",
    }
    payload.update(overrides)
    return payload


def create_draft(client: TestClient):
    response = client.post("/api/offers", json=offer_payload())
    assert response.status_code == 201, response.text
    body = response.json()
    return body["offer"], body["management_capability"]


def publish(client: TestClient, offer_id: str, capability: str, payload=None):
    return client.post(
        f"/api/offers/{offer_id}/publish",
        json=payload or policy_payload(),
        headers={CAPABILITY_HEADER: capability},
    )


def test_create_draft_is_durable_integer_money_and_raw_capability_is_not_stored(api) -> None:
    client, database_path, _ = api
    offer, capability = create_draft(client)
    assert offer["status"] == "draft"
    assert offer["public_slug"] is None
    assert offer["list_price_paise"] == 2_000_000
    assert isinstance(offer["list_price_paise"], int)
    assert len(capability) >= 43

    connection = sqlite3.connect(database_path)
    try:
        stored_hash = connection.execute(
            "SELECT management_capability_hash FROM offers WHERE id = ?", (offer["id"],)
        ).fetchone()[0]
    finally:
        connection.close()
    assert capability != stored_hash
    assert len(stored_hash) == 64
    assert capability not in database_path.read_bytes().decode("latin1", errors="ignore")


@pytest.mark.parametrize(
    "changes",
    [
        {"list_price_paise": 0},
        {"list_price_paise": -1},
        {"list_price_paise": 20_000.50},
        {"currency": "USD"},
        {"floor_price_paise": 1},
    ],
)
def test_invalid_or_unknown_offer_fields_are_rejected(api, changes) -> None:
    client, _, _ = api
    response = client.post("/api/offers", json=offer_payload(**changes))
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_capability_is_required_and_public_slug_is_not_merchant_authority(api) -> None:
    client, _, _ = api
    offer, capability = create_draft(client)
    assert client.get(f"/api/offers/{offer['id']}").status_code == 403
    assert client.get(
        f"/api/offers/{offer['id']}", headers={CAPABILITY_HEADER: "wrong"}
    ).status_code == 403
    successful = client.get(
        f"/api/offers/{offer['id']}", headers={CAPABILITY_HEADER: capability}
    )
    assert successful.status_code == 200

    published = publish(client, offer["id"], capability)
    slug = published.json()["offer"]["public_slug"]
    assert client.patch(
        f"/api/offers/{offer['id']}",
        json={"description": "tampered"},
        headers={CAPABILITY_HEADER: slug},
    ).status_code == 403


def test_update_draft_then_publish_valid_policy_atomically(api) -> None:
    client, database_path, _ = api
    offer, capability = create_draft(client)
    update = client.patch(
        f"/api/offers/{offer['id']}",
        json={"description": "Updated draft description."},
        headers={CAPABILITY_HEADER: capability},
    )
    assert update.status_code == 200
    assert update.json()["offer"]["description"] == "Updated draft description."

    response = publish(client, offer["id"], capability)
    assert response.status_code == 200, response.text
    body = response.json()
    slug = body["offer"]["public_slug"]
    assert body["offer"]["status"] == "live"
    assert body["policy"]["version"] == 1
    assert body["public_url_path"] == f"/d/{slug}"
    assert re.fullmatch(r"seo-audit-pro-[a-z0-9]{10}", slug)

    connection = sqlite3.connect(database_path)
    try:
        status, count = connection.execute(
            "SELECT status, (SELECT count(*) FROM policy_versions WHERE offer_id = offers.id) FROM offers WHERE id = ?",
            (offer["id"],),
        ).fetchone()
    finally:
        connection.close()
    assert status == "LIVE"
    assert count == 1


@pytest.mark.parametrize(
    "changes",
    [
        {"floor_price_paise": 2_000_001},
        {"floor_price_paise": -1},
        {"max_discount_paise": -1},
        {"floor_price_paise": 1_800_000, "max_discount_paise": 250_000},
        {"max_rounds": 0},
        {"max_rounds": 11},
        {"expiry_minutes": 4},
        {"expiry_minutes": 1441},
        {"currency": "USD"},
    ],
)
def test_invalid_policy_never_partially_publishes(api, changes) -> None:
    client, database_path, _ = api
    offer, capability = create_draft(client)
    response = publish(client, offer["id"], capability, policy_payload(**changes))
    assert response.status_code in {400, 422}

    connection = sqlite3.connect(database_path)
    try:
        status, slug = connection.execute(
            "SELECT status, public_slug FROM offers WHERE id = ?", (offer["id"],)
        ).fetchone()
        policies = connection.execute(
            "SELECT count(*) FROM policy_versions WHERE offer_id = ?", (offer["id"],)
        ).fetchone()[0]
    finally:
        connection.close()
    assert status == "DRAFT"
    assert slug is None
    assert policies == 0


def test_failure_after_slug_allocation_rolls_back_everything(api, monkeypatch) -> None:
    client, database_path, _ = api
    offer, capability = create_draft(client)

    async def fail_slug(*_args, **_kwargs):
        raise ApplicationError("slug_generation_failed", "Could not allocate a public URL", 503)

    monkeypatch.setattr(OfferService, "_unique_slug", fail_slug)
    response = publish(client, offer["id"], capability)
    assert response.status_code == 503

    connection = sqlite3.connect(database_path)
    try:
        row = connection.execute(
            "SELECT status, public_slug FROM offers WHERE id = ?", (offer["id"],)
        ).fetchone()
        policies = connection.execute("SELECT count(*) FROM policy_versions").fetchone()[0]
    finally:
        connection.close()
    assert row == ("DRAFT", None)
    assert policies == 0


def test_public_contract_has_zero_private_authority(api) -> None:
    client, _, _ = api
    offer, capability = create_draft(client)
    published = publish(client, offer["id"], capability).json()
    slug = published["offer"]["public_slug"]

    response = client.get(f"/api/public/offers/{slug}")
    assert response.status_code == 200
    public = response.json()
    assert public == {
        "slug": slug,
        "merchant_display_name": "Acme Studio",
        "product_name": "SEO Audit Pro",
        "description": "A complete technical SEO audit.",
        "image_url": None,
        "list_price_paise": 2_000_000,
        "currency": "INR",
        "status": "live",
    }
    serialized = response.text.lower()
    for forbidden in (
        "floor",
        "max_discount",
        "max_rounds",
        "policy",
        "management",
        "capability",
        "allowed_actions",
        "forbidden_actions",
        offer["id"].lower(),
    ):
        assert forbidden not in serialized


def test_random_or_draft_public_slug_returns_safe_404(api) -> None:
    client, _, _ = api
    create_draft(client)
    response = client.get("/api/public/offers/not-real-a8s7d6f5g4")
    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "public_offer_not_found", "message": "Public offer not found"}
    }


def test_repeat_publish_is_idempotent_but_changed_authority_is_rejected(api) -> None:
    client, database_path, _ = api
    offer, capability = create_draft(client)
    first = publish(client, offer["id"], capability)
    second = publish(client, offer["id"], capability)
    changed = publish(
        client, offer["id"], capability, policy_payload(max_discount_paise=200_000)
    )
    assert first.status_code == second.status_code == 200
    assert first.json()["offer"]["public_slug"] == second.json()["offer"]["public_slug"]
    assert changed.status_code == 409

    connection = sqlite3.connect(database_path)
    try:
        assert connection.execute("SELECT count(*) FROM policy_versions").fetchone()[0] == 1
        assert connection.execute(
            "SELECT max_discount_paise FROM policy_versions"
        ).fetchone()[0] == 250_000
    finally:
        connection.close()


def test_concurrent_publish_produces_one_coherent_publication(tmp_path) -> None:
    database_path = tmp_path / "concurrent.db"
    database_url = migrated_database(database_path)
    app = create_app(Settings(database_url=database_url, _env_file=None))
    with TestClient(app) as client:
        offer, capability = create_draft(client)

    def do_publish() -> int:
        local_app = create_app(Settings(database_url=database_url, _env_file=None))
        with TestClient(local_app) as local_client:
            return publish(local_client, offer["id"], capability).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = list(executor.map(lambda _index: do_publish(), range(2)))
    assert statuses == [200, 200]

    connection = sqlite3.connect(database_path)
    try:
        row = connection.execute(
            "SELECT status, public_slug FROM offers WHERE id = ?", (offer["id"],)
        ).fetchone()
        policies = connection.execute("SELECT count(*) FROM policy_versions").fetchone()[0]
    finally:
        connection.close()
    assert row[0] == "LIVE"
    assert row[1]
    assert policies == 1


def test_public_offer_survives_application_restart(tmp_path) -> None:
    database_path = tmp_path / "restart.db"
    database_url = migrated_database(database_path)
    settings = Settings(database_url=database_url, _env_file=None)
    with TestClient(create_app(settings)) as client:
        offer, capability = create_draft(client)
        slug = publish(client, offer["id"], capability).json()["offer"]["public_slug"]

    with TestClient(create_app(settings)) as restarted:
        response = restarted.get(f"/api/public/offers/{slug}")
    assert response.status_code == 200
    assert response.json()["slug"] == slug


def test_published_policy_remains_database_immutable(api) -> None:
    client, database_path, _ = api
    offer, capability = create_draft(client)
    publish(client, offer["id"], capability)
    connection = sqlite3.connect(database_path)
    try:
        with pytest.raises(sqlite3.IntegrityError, match="immutable"):
            connection.execute("UPDATE policy_versions SET max_rounds = 8")
    finally:
        connection.close()


def test_openapi_uses_header_credential_without_secret_examples(api) -> None:
    client, _, _ = api
    document = client.get("/openapi.json")
    assert document.status_code == 200
    text = document.text
    assert "X-Counter-Management-Capability" in text
    assert "management_capability_hash" not in text
    assert "example" not in text.lower() or "secret" not in text.lower()
