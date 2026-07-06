"""Abstract base classes for the memory subsystem.

Phase 1 ships in-memory implementations only. Swap these for Redis/Postgres
backed implementations in Phase 2 without changing calling code, since all
agents/services depend on these interfaces, not concrete classes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseMemory(ABC):
    """Common contract for all memory stores."""

    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        ...

    @abstractmethod
    def set(self, key: str, value: Any) -> None:
        ...

    @abstractmethod
    def clear(self, key: str) -> None:
        ...


class BaseConversationMemory(ABC):
    """Contract for storing ordered conversation turns."""

    @abstractmethod
    def add_message(self, session_id: str, role: str, content: str) -> None:
        ...

    @abstractmethod
    def get_history(self, session_id: str, limit: Optional[int] = None) -> List[Dict[str, str]]:
        ...

    @abstractmethod
    def get_summary(self, session_id: str) -> Optional[str]:
        ...

    @abstractmethod
    def set_summary(self, session_id: str, summary: str) -> None:
        ...
