"""phase 5 candidate policy results

Revision ID: 20260820_0004
Revises: 20260820_0003
"""

from alembic import op
import sqlalchemy as sa

revision = "20260820_0004"
down_revision = "20260820_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("deals", sa.Column("candidate_violation_codes", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("deals", "candidate_violation_codes")
