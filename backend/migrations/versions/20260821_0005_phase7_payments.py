"""phase 7 payment verification fields

Revision ID: 20260821_0005
Revises: 20260820_0004
"""

from alembic import op
import sqlalchemy as sa

revision = "20260821_0005"
down_revision = "20260820_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payment_executions", sa.Column("paid_at", sa.DateTime(timezone=True)))
    op.add_column(
        "payment_executions", sa.Column("verified_webhook_event_id", sa.String(160))
    )


def downgrade() -> None:
    op.drop_column("payment_executions", "verified_webhook_event_id")
    op.drop_column("payment_executions", "paid_at")
