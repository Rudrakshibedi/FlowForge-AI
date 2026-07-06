"""In-memory response cache, keyed by a hash of (agent, system_prompt, user_prompt).

Avoids repeat LLM calls for identical agent inputs within the TTL window —
important for staying under free-tier rate limits during development/demo.
Phase 2: back this with Redis for multi-instance deployments.
"""
from __future__ import annotations

import hashlib
import threading
import time
from typing import Any, Dict, Optional


class CacheService:
    def __init__(self, ttl_seconds: int = 600) -> None:
        self._ttl = ttl_seconds
        self._store: Dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()

    @staticmethod
    def make_key(*parts: str) -> str:
        joined = "||".join(parts)
        return hashlib.sha256(joined.encode("utf-8")).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            expires_at, value = entry
            if time.time() > expires_at:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = (time.time() + self._ttl, value)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


cache_service = CacheService()
