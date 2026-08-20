"""Create Counter durable schema foundation."""

from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260820_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

offer_status = sa.Enum("DRAFT", "LIVE", "PAUSED", "ARCHIVED", name="offer_status", native_enum=False)
deal_status = sa.Enum("NEGOTIATING", "AGREED", "PAYMENT_PENDING", "PAID", "BLOCKED", "EXPIRED", "CANCELLED", name="deal_status", native_enum=False)
message_sender = sa.Enum("BUYER", "COUNTER", "SYSTEM", name="message_sender", native_enum=False)
payment_status = sa.Enum("CLAIMED", "CREATING", "READY", "PAID", "FAILED", "UNKNOWN", "EXPIRED", "CANCELLED", name="payment_execution_status", native_enum=False)
webhook_status = sa.Enum("RECEIVED", "PROCESSED", "IGNORED", "FAILED", name="webhook_processing_status", native_enum=False)


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "offers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("public_slug", sa.String(160), nullable=False, unique=True),
        sa.Column("management_capability_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("merchant_name", sa.String(160), nullable=False),
        sa.Column("product_name", sa.String(240), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("list_price_paise", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", offer_status, nullable=False),
        *timestamps(),
        sa.CheckConstraint("list_price_paise > 0", name="ck_offers_positive_list_price"),
        sa.CheckConstraint("length(currency) = 3", name="ck_offers_currency_length"),
    )
    op.create_table(
        "policy_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("offer_id", sa.String(36), sa.ForeignKey("offers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("floor_price_paise", sa.BigInteger(), nullable=False),
        sa.Column("max_discount_paise", sa.BigInteger(), nullable=False),
        sa.Column("max_rounds", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("raw_rules", sa.Text(), nullable=False),
        sa.Column("policy_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("offer_id", "version", name="uq_policy_versions_offer_id"),
        sa.CheckConstraint("version > 0", name="ck_policy_versions_positive_version"),
        sa.CheckConstraint("floor_price_paise > 0", name="ck_policy_versions_positive_floor"),
        sa.CheckConstraint("max_discount_paise >= 0", name="ck_policy_versions_nonnegative_discount"),
        sa.CheckConstraint("max_rounds > 0", name="ck_policy_versions_positive_max_rounds"),
        sa.CheckConstraint("length(currency) = 3", name="ck_policy_versions_currency_length"),
    )
    op.execute("CREATE TRIGGER policy_versions_immutable_update BEFORE UPDATE ON policy_versions BEGIN SELECT RAISE(ABORT, 'policy_versions are immutable'); END")
    op.execute("CREATE TRIGGER policy_versions_immutable_delete BEFORE DELETE ON policy_versions BEGIN SELECT RAISE(ABORT, 'policy_versions are immutable'); END")
    op.create_table(
        "deals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("offer_id", sa.String(36), sa.ForeignKey("offers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("policy_version_id", sa.String(36), sa.ForeignKey("policy_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("public_session_token_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("status", deal_status, nullable=False),
        sa.Column("current_round", sa.Integer(), nullable=False),
        sa.Column("accepted_amount_paise", sa.BigInteger()),
        sa.Column("accepted_currency", sa.String(3)),
        sa.Column("accepted_bundle_id", sa.String(120)),
        sa.Column("agreement_locked_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.CheckConstraint("current_round >= 0", name="ck_deals_nonnegative_round"),
        sa.CheckConstraint("accepted_amount_paise IS NULL OR accepted_amount_paise > 0", name="ck_deals_positive_accepted_amount"),
    )
    op.create_table(
        "deal_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("deal_id", sa.String(36), sa.ForeignKey("deals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("sender", message_sender, nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("deal_id", "sequence", name="uq_deal_messages_deal_id"),
        sa.CheckConstraint("sequence >= 0", name="ck_deal_messages_nonnegative_sequence"),
    )
    op.create_table(
        "payment_executions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("deal_id", sa.String(36), sa.ForeignKey("deals.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("execution_identity", sa.String(128), nullable=False, unique=True),
        sa.Column("reference_id", sa.String(40), nullable=False, unique=True),
        sa.Column("amount_paise", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", payment_status, nullable=False),
        sa.Column("provider_payment_link_id", sa.String(80), unique=True),
        sa.Column("provider_payment_id", sa.String(80), unique=True),
        sa.Column("short_url", sa.String(500)),
        sa.Column("error_code", sa.String(120)),
        *timestamps(),
        sa.CheckConstraint("amount_paise > 0", name="ck_payment_executions_positive_amount"),
        sa.CheckConstraint("length(currency) = 3", name="ck_payment_executions_currency_length"),
    )
    op.create_index("ix_payment_executions_deal_status", "payment_executions", ["deal_id", "status"])
    op.create_table(
        "webhook_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("provider_event_id", sa.String(160), nullable=False, unique=True),
        sa.Column("event_type", sa.String(120), nullable=False),
        sa.Column("processing_status", webhook_status, nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("error_code", sa.String(120)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("webhook_events")
    op.drop_index("ix_payment_executions_deal_status", table_name="payment_executions")
    op.drop_table("payment_executions")
    op.drop_table("deal_messages")
    op.drop_table("deals")
    op.execute("DROP TRIGGER IF EXISTS policy_versions_immutable_delete")
    op.execute("DROP TRIGGER IF EXISTS policy_versions_immutable_update")
    op.drop_table("policy_versions")
    op.drop_table("offers")
