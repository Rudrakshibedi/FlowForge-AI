"""In-memory session store.

Holds short-lived key/value state scoped to a single browser/user session
(e.g. current active workflow id, last router decision). Not persisted.
"""
from __future__ import annotations

import threading
from typing import Any, Dict, Optional

from backend.memory.base import BaseMemory


class SessionMemory(BaseMemory):
    def __init__(self) -> None:
        self._store: Dict[str, Any] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            return self._store.get(key)

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = value

    def clear(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear_all(self) -> None:
        with self._lock:
            self._store.clear()


# Process-wide singleton (Phase 1). Replace with a per-request DI container
# backed by Redis in Phase 2 for multi-instance deployments.
session_memory = SessionMemory()
