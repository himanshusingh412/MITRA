"""Scheme catalogue loader.

Reads shared/schemes.json, which is generated from frontend/lib/schemes.ts. There is
deliberately no hand-maintained Python copy of the criteria: two copies would drift,
and drift here means the app and the API telling a citizen different things about
their entitlement.

Regenerate with: cd frontend && npx tsx scripts/exportSchemes.ts
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# backend/app/services/catalogue.py → repo root is four levels up.
_REPO_ROOT = Path(__file__).resolve().parents[3]
_CATALOGUE_PATH = _REPO_ROOT / "shared" / "schemes.json"


@lru_cache
def _load() -> dict[str, Any]:
    if not _CATALOGUE_PATH.exists():
        raise FileNotFoundError(
            f"Scheme catalogue not found at {_CATALOGUE_PATH}. "
            "Generate it with: cd frontend && npx tsx scripts/exportSchemes.ts"
        )
    with _CATALOGUE_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def all_schemes() -> list[dict[str, Any]]:
    return _load()["schemes"]


def get_scheme(scheme_id: str) -> dict[str, Any] | None:
    return next((s for s in all_schemes() if s["id"] == scheme_id), None)


def sector_labels() -> dict[str, str]:
    return _load()["sectorLabels"]


def catalogue_version() -> int:
    return _load().get("version", 1)
