"""
Engine Cache

Provides an in-memory caching layer for financial engine outputs.

Features
--------
• Deterministic hashing of engine inputs
• TTL expiration support
• Thread-safe access
• JSON-safe storage
• Utility helpers for orchestrator usage

This cache is intended to prevent recomputation of expensive
financial simulations such as Monte Carlo runs.
"""

from __future__ import annotations

import json
import hashlib
import threading
import time
from typing import Any, Dict, Optional


# --------------------------------------------------
# Configuration
# --------------------------------------------------

DEFAULT_TTL_SECONDS = 300


# --------------------------------------------------
# Internal Cache Store
# --------------------------------------------------

_cache_store: Dict[str, Dict[str, Any]] = {}

_cache_lock = threading.Lock()


# --------------------------------------------------
# Key Utilities
# --------------------------------------------------

def generate_cache_key(engine_name: str, payload: Dict[str, Any]) -> str:
    """
    Generate a deterministic cache key for an engine request.
    """

    serialized = json.dumps(payload, sort_keys=True)

    digest = hashlib.sha256(serialized.encode()).hexdigest()

    return f"{engine_name}:{digest}"


# --------------------------------------------------
# Cache Operations
# --------------------------------------------------

def get_cached_result(cache_key: str) -> Optional[Any]:
    """
    Retrieve a cached engine result if it exists and has not expired.
    """

    with _cache_lock:

        entry = _cache_store.get(cache_key)

        if not entry:
            return None

        if entry["expires_at"] < time.time():
            del _cache_store[cache_key]
            return None

        return entry["value"]


def set_cached_result(
    cache_key: str,
    value: Any,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> None:
    """
    Store an engine result in cache.
    """

    with _cache_lock:

        _cache_store[cache_key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
        }


def clear_cache() -> None:
    """
    Clear the entire cache.
    """

    with _cache_lock:
        _cache_store.clear()


# --------------------------------------------------
# Diagnostics
# --------------------------------------------------

def cache_stats() -> Dict[str, Any]:
    """
    Return diagnostic information about the cache.
    """

    with _cache_lock:

        active_entries = len(_cache_store)

        return {
            "entries": active_entries,
            "ttl_seconds": DEFAULT_TTL_SECONDS,
        }


# --------------------------------------------------
# Health Check
# --------------------------------------------------

def cache_health_check() -> bool:
    """
    Simple callable used for diagnostics and testing.
    """

    return True