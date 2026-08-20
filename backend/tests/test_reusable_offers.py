from __future__ import annotations

import sqlite3

from fastapi.testclient import TestClient

from app.config import Settings
from app.db.models import DealStatus
from app.main import create_app
from tests.test_negotiation import FakeNegotiationModel, published_offer, start_deal
from tests.test_offers_api import migrated_database


def test_live_offer_creates_isolated_deals_after_a_previous_deal_is_paid(tmp_path) -> None:
    db_path = tmp_path / "reusable.db"
    settings = Settings(
        database_url=migrated_database(db_path),
        langgraph_checkpoint_path=str(tmp_path / "reusable-graph.db"),
        _env_file=None,
    )
    with TestClient(create_app(settings, negotiation_model=FakeNegotiationModel())) as client:
        _offer, _merchant, slug = published_offer(client)
        first = start_deal(client, slug)
        second = start_deal(client, slug)
        assert first != second
        with sqlite3.connect(db_path) as db:
            deals = db.execute(
                "SELECT id, offer_id, policy_version_id, public_session_token_hash FROM deals ORDER BY created_at"
            ).fetchall()
            assert len(deals) == 2
            assert deals[0][0] != deals[1][0]
            assert deals[0][1] == deals[1][1]
            assert deals[0][2] == deals[1][2]
            assert deals[0][3] != deals[1][3]
            db.execute("UPDATE deals SET status = ? WHERE id = ?", (DealStatus.PAID.value, deals[0][0]))
            db.commit()

        assert client.get(f"/api/public/offers/{slug}").status_code == 200
        third = start_deal(client, slug)
        assert third not in {first, second}
        with sqlite3.connect(db_path) as db:
            statuses = [row[0] for row in db.execute("SELECT status FROM deals ORDER BY created_at")]
            assert statuses == ["paid", "NEGOTIATING", "NEGOTIATING"]


def test_demo_seed_is_idempotent_and_every_visitor_gets_a_fresh_deal(tmp_path) -> None:
    db_path = tmp_path / "demo.db"
    settings = Settings(
        database_url=migrated_database(db_path),
        langgraph_checkpoint_path=str(tmp_path / "demo-graph.db"),
        demo_offer_seed_enabled=True,
        _env_file=None,
    )

    with TestClient(create_app(settings, negotiation_model=FakeNegotiationModel())) as first_client:
        assert first_client.get("/api/public/offers/growth-sprint-demo").status_code == 200
        capabilities = [start_deal(first_client, "growth-sprint-demo") for _ in range(3)]
        assert len(set(capabilities)) == 3

    # A restart reuses the canonical offer and immutable policy rather than adding seed records.
    with TestClient(create_app(settings, negotiation_model=FakeNegotiationModel())) as second_client:
        assert second_client.get("/api/public/offers/growth-sprint-demo").status_code == 200
        fourth = start_deal(second_client, "growth-sprint-demo")
        assert fourth not in capabilities

    with sqlite3.connect(db_path) as db:
        offers = db.execute(
            "SELECT count(*) FROM offers WHERE public_slug = 'growth-sprint-demo'"
        ).fetchone()[0]
        policies = db.execute(
            "SELECT count(*) FROM policy_versions p JOIN offers o ON o.id = p.offer_id "
            "WHERE o.public_slug = 'growth-sprint-demo'"
        ).fetchone()[0]
        deals = db.execute(
            "SELECT count(*) FROM deals d JOIN offers o ON o.id = d.offer_id "
            "WHERE o.public_slug = 'growth-sprint-demo'"
        ).fetchone()[0]
    assert offers == 1
    assert policies == 1
    assert deals == 4
