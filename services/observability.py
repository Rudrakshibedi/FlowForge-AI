"""Execution tracker.

Centralizes observability data for a workflow run: which agent is active,
per-agent execution duration, MCP tool usage, and errors. This is what
powers `GET /workflow/{task_id}` (via the orchestrator) and the dashboard's
timeline/tool-usage panels.

Kept as a simple thread-safe in-memory store, consistent with the rest of
the Phase 1 memory subsystem (see backend/memory/*).
"""
from __future__ import annotations

import threading
import time
from typing import Any, Dict, List, Optional


class ExecutionTracker:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        # task_id -> list of {agent, status, duration_ms, error, started_at, finished_at}
        self._timeline: Dict[str, List[Dict[str, Any]]] = {}
        # task_id -> list of {agent, tool, success, timestamp}
        self._tool_calls: Dict[str, List[Dict[str, Any]]] = {}
        # task_id -> currently active agent name (or None)
        self._active_agent: Dict[str, Optional[str]] = {}

    # --- Agent lifecycle -------------------------------------------------

    def start_agent(self, task_id: str, agent_name: str) -> float:
        with self._lock:
            self._active_agent[task_id] = agent_name
        return time.monotonic()

    def end_agent(
        self,
        task_id: str,
        agent_name: str,
        start_time: float,
        success: bool,
        error: Optional[str] = None,
    ) -> float:
        duration_ms = round((time.monotonic() - start_time) * 1000, 2)
        with self._lock:
            self._timeline.setdefault(task_id, []).append({
                "agent": agent_name,
                "status": "success" if success else "failed",
                "duration_ms": duration_ms,
                "error": error,
            })
            self._active_agent[task_id] = None
        return duration_ms

    def get_active_agent(self, task_id: str) -> Optional[str]:
        with self._lock:
            return self._active_agent.get(task_id)

    # --- Tool usage --------------------------------------------------------

    def record_tool_call(self, task_id: str, agent_name: str, tool_name: str, success: bool) -> None:
        with self._lock:
            self._tool_calls.setdefault(task_id, []).append({
                "agent": agent_name,
                "tool": tool_name,
                "success": success,
                "timestamp": time.time(),
            })

    # --- Aggregation ---------------------------------------------------

    def get_timeline(self, task_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._timeline.get(task_id, []))

    def get_tool_usage(self, task_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._tool_calls.get(task_id, []))

    def get_errors(self, task_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            entries = self._timeline.get(task_id, [])
        return [e for e in entries if e.get("status") == "failed"]

    def summary(self, task_id: str) -> Dict[str, Any]:
        timeline = self.get_timeline(task_id)
        tool_usage = self.get_tool_usage(task_id)
        total_duration_ms = sum(e["duration_ms"] for e in timeline)
        return {
            "task_id": task_id,
            "active_agent": self.get_active_agent(task_id),
            "timeline": timeline,
            "tool_usage": tool_usage,
            "tool_call_count": len(tool_usage),
            "total_duration_ms": round(total_duration_ms, 2),
            "errors": self.get_errors(task_id),
            "error_count": len(self.get_errors(task_id)),
        }


execution_tracker = ExecutionTracker()
