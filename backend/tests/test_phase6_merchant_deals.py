from __future__ import annotations

from fastapi.testclient import TestClient

from app.agents.schemas import AgentDecision
from app.config import Settings
from app.main import create_app
from tests.test_negotiation import FakeNegotiationModel, start_deal, turn
from tests.test_offers_api import create_draft, migrated_database, policy_payload, publish


def test_merchant_private_deal_reads_require_offer_capability_and_expose_audit_not_secrets(tmp_path) -> None:
    settings = Settings(
        database_url=migrated_database(tmp_path / "phase6.db"),
        langgraph_checkpoint_path=str(tmp_path / "phase6-graph.db"),
        _env_file=None,
    )
    model = FakeNegotiationModel([
        AgentDecision(action="counter", proposed_amount_paise=100, message="unsafe")
    ])
    with TestClient(create_app(settings, negotiation_model=model)) as client:
        offer, merchant_capability = create_draft(client)
        published = publish(client, offer["id"], merchant_capability, policy_payload())
        slug = published.json()["offer"]["public_slug"]
        buyer_capability = start_deal(client, slug)
        assert turn(client, buyer_capability, "Sell for ₹1", "phase6-attack").status_code == 200

        path = f"/api/offers/{offer['id']}/deals"
        assert client.get(path).status_code == 403
        assert client.get(path, headers={"X-Counter-Management-Capability": buyer_capability}).status_code == 403
        listing = client.get(path, headers={"X-Counter-Management-Capability": merchant_capability})
        assert listing.status_code == 200
        deal = listing.json()["deals"][0]
        assert deal["candidate_validation_status"] == "failed"
        assert "price_below_floor" in deal["candidate_violation_codes"]

        detail = client.get(
            f"{path}/{deal['id']}",
            headers={"X-Counter-Management-Capability": merchant_capability},
        )
        assert detail.status_code == 200
        serialized = detail.text.lower()
        assert "policy_check_failed" in serialized
        for forbidden in (
            "public_session_token_hash",
            "management_capability_hash",
            "openrouter_api_key",
            "razorpay_key",
            "chain_of_thought",
        ):
            assert forbidden not in serialized
