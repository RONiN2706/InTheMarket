"""
listings_store.py
------------------
Minimal JSON-file persistence for listing drafts, so this service can stand
on its own while the "real" listings are stored client-side (as in the
InTheMarket front end this is meant to attach to).

Not concurrency-safe beyond simple demo use — swap this for a real database
seam the same way vision_pipeline.py's vision provider is a swappable seam.
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

STORAGE_DIR = Path(__file__).resolve().parent / "storage"
LISTINGS_PATH = STORAGE_DIR / "listings.json"

_lock = threading.Lock()


def _read_all() -> list[dict[str, Any]]:
    if not LISTINGS_PATH.exists():
        return []
    try:
        return json.loads(LISTINGS_PATH.read_text())
    except json.JSONDecodeError:
        return []


def _write_all(listings: list[dict[str, Any]]) -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    LISTINGS_PATH.write_text(json.dumps(listings, indent=2))


def create_pending_listing(fields: dict[str, Any]) -> dict[str, Any]:
    """Create a new listing in 'pending_verification' status and persist it."""
    with _lock:
        listings = _read_all()
        listing = {
            "id": uuid.uuid4().hex[:10],
            "productType": fields.get("productType", ""),
            "productName": fields.get("productName", ""),
            "condition": fields.get("condition", ""),
            "price": fields.get("price"),
            "description": fields.get("description", ""),
            "images": fields.get("images", []),
            "status": "pending_verification",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "verification_metadata_path": None,
        }
        listings.append(listing)
        _write_all(listings)
        return listing


def get_listing(listing_id: str) -> dict[str, Any] | None:
    return next((l for l in _read_all() if l["id"] == listing_id), None)


def update_listing(listing_id: str, **updates: Any) -> dict[str, Any] | None:
    with _lock:
        listings = _read_all()
        for listing in listings:
            if listing["id"] == listing_id:
                listing.update(updates)
                _write_all(listings)
                return listing
        return None


def list_all() -> list[dict[str, Any]]:
    return _read_all()
