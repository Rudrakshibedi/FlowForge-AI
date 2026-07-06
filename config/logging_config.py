"""Structured JSON logging configuration used across the backend.

In addition to the usual stdout stream handler, this module installs an
in-memory ring-buffer handler (`MemoryLogHandler`) so the API can expose
recent structured log records via `GET /logs` without needing an external
log aggregator. This is a Phase 1 convenience only — swap for a real log
sink (ELK, CloudWatch, etc.) in Phase 2.
"""
from __future__ import annotations

import json
import logging
import sys
import threading
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional


def _record_to_dict(record: logging.LogRecord) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
        "level": record.levelname,
        "logger": record.name,
        "message": record.getMessage(),
    }
    if record.exc_info:
        payload["exception"] = logging.Formatter().formatException(record.exc_info)
    extra = getattr(record, "extra_fields", None)
    if extra:
        payload.update(extra)
    return payload


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(_record_to_dict(record), default=str)


class MemoryLogHandler(logging.Handler):
    """Keeps the last N structured log records in memory for API retrieval."""

    def __init__(self, capacity: int = 2000) -> None:
        super().__init__()
        self._buffer: Deque[Dict[str, Any]] = deque(maxlen=capacity)
        self._lock = threading.Lock()

    def emit(self, record: logging.LogRecord) -> None:
        try:
            entry = _record_to_dict(record)
        except Exception:  # noqa: BLE001 - logging must never raise
            return
        with self._lock:
            self._buffer.append(entry)

    def get_logs(self, limit: int = 100, task_id: Optional[str] = None,
                 level: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            entries = list(self._buffer)

        if task_id:
            entries = [e for e in entries if e.get("task_id") == task_id]
        if level:
            entries = [e for e in entries if e.get("level", "").upper() == level.upper()]

        return entries[-limit:]


_memory_handler: Optional[MemoryLogHandler] = None


def configure_logging(level: str = "INFO", buffer_size: int = 2000) -> None:
    global _memory_handler

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(JSONFormatter())
    root.addHandler(stream_handler)

    _memory_handler = MemoryLogHandler(capacity=buffer_size)
    root.addHandler(_memory_handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def get_recent_logs(limit: int = 100, task_id: Optional[str] = None,
                     level: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch recent structured log entries for the `GET /logs` endpoint."""
    if _memory_handler is None:
        return []
    return _memory_handler.get_logs(limit=limit, task_id=task_id, level=level)
