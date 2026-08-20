"""Add trusted negotiation strategy state.

Revision ID: 20260821_0006
Revises: 20260821_0005
"""

from alembic import op
import sqlalchemy as sa

revision = "20260821_0006"
down_revision = "20260821_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("deals") as batch:
        batch.add_column(sa.Column("best_buyer_offer_paise", sa.BigInteger(), nullable=True))
        batch.add_column(sa.Column("last_buyer_offer_paise", sa.BigInteger(), nullable=True))
        batch.add_column(sa.Column("last_valid_counter_amount_paise", sa.BigInteger(), nullable=True))
        batch.add_column(sa.Column("commercial_rounds_used", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("deals") as batch:
        batch.drop_column("commercial_rounds_used")
        batch.drop_column("last_valid_counter_amount_paise")
        batch.drop_column("last_buyer_offer_paise")
        batch.drop_column("best_buyer_offer_paise")
