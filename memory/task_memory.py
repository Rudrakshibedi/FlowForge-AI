"""Task memory.

Tracks the structured JSON output of every agent that runs within a single
workflow/task execution, so downstream agents (and the API layer) can pull
only the fields they need instead of the entire transcript. This is the
backbone of "minimal context passing" / "shared structured JSON".
"""
from __future__ import annotations

import threading
from typing import Any, Dict, List, Optional


class TaskMemory:
    def __init__(self) -> None:
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create_task(self, task_id: str, request: str) -> None:
        with self._lock:
            self._tasks[task_id] = {
                "task_id": task_id,
                "request": request,
                "status": "pending",
                "agent_outputs": {},
                "execution_order": [],
            }

    def record_agent_output(self, task_id: str, agent_name: str, output: Dict[str, Any]) -> None:
        with self._lock:
            task = self._tasks.setdefault(
                task_id,
                {"task_id": task_id, "request": "", "status": "pending",
                 "agent_outputs": {}, "execution_order": []},
            )
            task["agent_outputs"][agent_name] = output
            task["execution_order"].append(agent_name)

    def get_agent_output(self, task_id: str, agent_name: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._tasks.get(task_id, {}).get("agent_outputs", {}).get(agent_name)

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._tasks.get(task_id)

    def set_status(self, task_id: str, status: str) -> None:
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id]["status"] = status

    def get_execution_order(self, task_id: str) -> List[str]:
        with self._lock:
            return list(self._tasks.get(task_id, {}).get("execution_order", []))

    def all_tasks(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._tasks.values())


task_memory = TaskMemory()
