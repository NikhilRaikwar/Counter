"""Add Phase 2 offer and immutable policy snapshot fields."""

from typing import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260820_0002"
down_revision: str | None = "20260820_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("offers", sa.Column("image_url", sa.String(2048), nullable=True))
    with op.batch_alter_table("offers") as batch:
        batch.alter_column("public_slug", existing_type=sa.String(160), nullable=True)

    op.execute("DROP TRIGGER IF EXISTS policy_versions_immutable_update")
    op.execute("DROP TRIGGER IF EXISTS policy_versions_immutable_delete")
    op.add_column(
        "policy_versions",
        sa.Column("list_price_paise", sa.BigInteger(), nullable=False, server_default="1"),
    )
    op.add_column(
        "policy_versions",
        sa.Column("expiry_minutes", sa.Integer(), nullable=False, server_default="30"),
    )
    with op.batch_alter_table("policy_versions", recreate="always") as batch:
        batch.alter_column(
            "list_price_paise", existing_type=sa.BigInteger(), nullable=False, server_default=None
        )
        batch.alter_column(
            "expiry_minutes", existing_type=sa.Integer(), nullable=False, server_default=None
        )
        batch.drop_constraint("ck_policy_versions_positive_floor", type_="check")
        batch.create_check_constraint("ck_policy_versions_positive_list_price", "list_price_paise > 0")
        batch.create_check_constraint("ck_policy_versions_nonnegative_floor", "floor_price_paise >= 0")
        batch.create_check_constraint("ck_policy_versions_positive_expiry", "expiry_minutes > 0")
    op.execute("CREATE TRIGGER policy_versions_immutable_update BEFORE UPDATE ON policy_versions BEGIN SELECT RAISE(ABORT, 'policy_versions are immutable'); END")
    op.execute("CREATE TRIGGER policy_versions_immutable_delete BEFORE DELETE ON policy_versions BEGIN SELECT RAISE(ABORT, 'policy_versions are immutable'); END")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS policy_versions_immutable_update")
    op.execute("DROP TRIGGER IF EXISTS policy_versions_immutable_delete")
    with op.batch_alter_table("policy_versions", recreate="always") as batch:
        batch.drop_constraint("ck_policy_versions_positive_expiry", type_="check")
        batch.drop_constraint("ck_policy_versions_nonnegative_floor", type_="check")
        batch.drop_constraint("ck_policy_versions_positive_list_price", type_="check")
        batch.create_check_constraint("ck_policy_versions_positive_floor", "floor_price_paise > 0")
        batch.drop_column("expiry_minutes")
        batch.drop_column("list_price_paise")
    op.execute("CREATE TRIGGER policy_versions_immutable_update BEFORE UPDATE ON policy_versions BEGIN SELECT RAISE(ABORT, 'policy_versions are immutable'); END")
    op.execute("CREATE TRIGGER policy_versions_immutable_delete BEFORE DELETE ON policy_versions BEGIN SELECT RAISE(ABORT, 'policy_versions are immutable'); END")
    with op.batch_alter_table("offers") as batch:
        batch.alter_column("public_slug", existing_type=sa.String(160), nullable=False)
    op.drop_column("offers", "image_url")
