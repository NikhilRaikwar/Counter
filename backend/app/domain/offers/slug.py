from __future__ import annotations

import re
import secrets
import string
import unicodedata


SUFFIX_ALPHABET = string.ascii_lowercase + string.digits


def readable_prefix(product_name: str) -> str:
    normalized = unicodedata.normalize("NFKD", product_name).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return (value or "offer")[:120].rstrip("-")


def generate_public_slug(product_name: str, suffix_length: int = 10) -> str:
    suffix = "".join(secrets.choice(SUFFIX_ALPHABET) for _ in range(suffix_length))
    return f"{readable_prefix(product_name)}-{suffix}"
