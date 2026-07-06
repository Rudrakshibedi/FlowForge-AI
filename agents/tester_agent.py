"""Tester Agent.

Responsibility: propose test cases (and optionally simple assertions) for
the implementation, based on the reviewed developer output.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.agents.base import BaseAgent
from backend.memory.summarizer import summarize_agent_output


class TesterAgent(BaseAgent):
    name = "tester"
    description = "Generates test cases for the implementation."
    allowed_tools = ["calculator", "json_formatter"]
    system_prompt = (
        "You are the Tester agent. Given a summary of implemented files and review notes, "
        "produce ONLY a JSON object:\n"
        '{"test_cases": [{"name": str, "description": str, "expected_result": str}]}\n'
        "No prose outside the JSON."
    )

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        dev_output = summarize_agent_output(context.get("developer_output", {}))
        review = summarize_agent_output(context.get("reviewer_output", {}))
        task_id = context.get("task_id", "default")
        result = self.safe_generate_json(
            f"Developer output summary:\n{dev_output}\nReview notes:\n{review}",
            task_id=task_id,
        )
        result["agent"] = self.name
        return result
