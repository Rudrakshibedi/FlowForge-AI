"""Planner Agent.

Responsibility: break the user's request into a high-level task plan
(milestones + ordered steps). Does not design architecture or write code.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.agents.base import BaseAgent


class PlannerAgent(BaseAgent):
    name = "planner"
    description = "Breaks a request into a high-level, ordered task plan."
    allowed_tools = ["json_formatter"]
    system_prompt = (
        "You are the Planner agent in a software delivery pipeline. "
        "Given a project request, produce ONLY a JSON object with this shape:\n"
        '{"goal": str, "milestones": [str], "steps": [str], "risks": [str]}\n'
        "No prose outside the JSON."
    )

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        request = context.get("request", "")
        task_id = context.get("task_id", "default")
        result = self.safe_generate_json(f"Project request:\n{request}", task_id=task_id)
        result["agent"] = self.name
        return result
