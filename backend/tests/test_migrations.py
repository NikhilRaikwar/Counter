from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
EXPECTED_TABLES = {
    "offers",
    "policy_versions",
    "deals",
    "deal_messages",
    "payment_executions",
    "webhook_events",
}


def migrate(database_path: Path) -> None:
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{database_path.as_posix()}"
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )


def test_empty_database_migrates_and_has_required_constraints(tmp_path) -> None:
    database_path = tmp_path / "migrated.db"
    migrate(database_path)

    connection = sqlite3.connect(database_path)
    try:
        tables = {
            row[0]
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }
        assert EXPECTED_TABLES <= tables

        triggers = {
            row[0]
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type='trigger'")
        }
        assert "policy_versions_immutable_update" in triggers
        assert "policy_versions_immutable_delete" in triggers

        def unique_index_columns(table: str) -> set[tuple[str, ...]]:
            columns: set[tuple[str, ...]] = set()
            for index_row in connection.execute(f"PRAGMA index_list('{table}')"):
                index_name, is_unique = index_row[1], index_row[2]
                if is_unique:
                    columns.add(
                        tuple(
                            info_row[2]
                            for info_row in connection.execute(
                                f"PRAGMA index_info('{index_name}')"
                            )
                        )
                    )
            return columns

        assert ("execution_identity",) in unique_index_columns("payment_executions")
        assert ("provider_event_id",) in unique_index_columns("webhook_events")
    finally:
        connection.close()


def test_policy_versions_are_immutable(tmp_path) -> None:
    database_path = tmp_path / "immutable.db"
    migrate(database_path)
    connection = sqlite3.connect(database_path)
    try:
        connection.execute(
            "INSERT INTO offers (id, public_slug, management_capability_hash, merchant_name, product_name, description, list_price_paise, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("o1", "offer-public-x9", "hash", "Merchant", "Product", "Description", 10000, "INR", "LIVE"),
        )
        connection.execute(
            "INSERT INTO policy_versions (id, offer_id, version, list_price_paise, floor_price_paise, max_discount_paise, max_rounds, expiry_minutes, currency, raw_rules, policy_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("p1", "o1", 1, 10000, 8000, 2000, 4, 30, "INR", "rules", "{}"),
        )
        with pytest.raises(sqlite3.IntegrityError, match="immutable"):
            connection.execute("UPDATE policy_versions SET max_rounds = 5 WHERE id = 'p1'")
    finally:
        connection.close()
