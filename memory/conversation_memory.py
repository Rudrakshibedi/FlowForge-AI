"""In-memory conversation history store, keyed by session id.

Stores raw turns plus an optional rolling summary produced by the
summarizer (see summarizer.py) once history exceeds a configured length.
"""
from __future__ import annotations

import threading
from collections import defaultdict
from typing import Dict, List, Optional

from backend.memory.base import BaseConversationMemory


class ConversationMemory(BaseConversationMemory):
    def __init__(self) -> None:
        self._history: Dict[str, List[Dict[str, str]]] = defaultdict(list)
        self._summaries: Dict[str, str] = {}
        self._lock = threading.Lock()

    def add_message(self, session_id: str, role: str, content: str) -> None:
        with self._lock:
            self._history[session_id].append({"role": role, "content": content})

    def get_history(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, str]]:
        with self._lock:
            history = list(self._history.get(session_id, []))
        return history[-limit:] if limit else history

    def get_summary(self, session_id: str) -> Optional[str]:
        with self._lock:
            return self._summaries.get(session_id)

    def set_summary(self, session_id: str, summary: str) -> None:
        with self._lock:
            self._summaries[session_id] = summary

    def turn_count(self, session_id: str) -> int:
        with self._lock:
            return len(self._history.get(session_id, []))


conversation_memory = ConversationMemory()
