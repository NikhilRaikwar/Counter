"""Add Phase 4 non-authoritative negotiation candidate fields."""

from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260820_0003"
down_revision: str | None = "20260820_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("deals", sa.Column("last_counter_amount_paise", sa.BigInteger(), nullable=True))
    op.add_column("deals", sa.Column("candidate_action", sa.String(32), nullable=True))
    op.add_column("deals", sa.Column("candidate_amount_paise", sa.BigInteger(), nullable=True))
    op.add_column("deals", sa.Column("candidate_bundle_id", sa.String(120), nullable=True))
    op.add_column("deals", sa.Column("candidate_validation_status", sa.String(32), nullable=True))
    with op.batch_alter_table("deals") as batch:
        batch.create_check_constraint(
            "ck_deals_positive_candidate_amount",
            "candidate_amount_paise IS NULL OR candidate_amount_paise > 0",
        )

    op.add_column("deal_messages", sa.Column("client_message_id", sa.String(80), nullable=True))
    op.create_index(
        "uq_deal_messages_client_turn",
        "deal_messages",
        ["deal_id", "client_message_id"],
        unique=True,
        sqlite_where=sa.text("client_message_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_deal_messages_client_turn", table_name="deal_messages")
    op.drop_column("deal_messages", "client_message_id")
    with op.batch_alter_table("deals") as batch:
        batch.drop_constraint("ck_deals_positive_candidate_amount", type_="check")
    op.drop_column("deals", "candidate_validation_status")
    op.drop_column("deals", "candidate_bundle_id")
    op.drop_column("deals", "candidate_amount_paise")
    op.drop_column("deals", "candidate_action")
    op.drop_column("deals", "last_counter_amount_paise")
