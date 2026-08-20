from __future__ import annotations

import hashlib
import hmac
import secrets


TOKEN_BYTES = 32


def generate_management_capability() -> str:
    return secrets.token_urlsafe(TOKEN_BYTES)


def hash_management_capability(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_management_capability(token: str, expected_hash: str) -> bool:
    candidate = hash_management_capability(token)
    return hmac.compare_digest(candidate, expected_hash)
