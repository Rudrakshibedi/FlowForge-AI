"""Reviewer Agent.

Responsibility: review the developer's output for correctness, style, and
risk, and produce structured review feedback. Does not rewrite the code.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.agents.base import BaseAgent
from backend.memory.summarizer import summarize_agent_output


class ReviewerAgent(BaseAgent):
    name = "reviewer"
    description = "Reviews developer output and flags issues."
    allowed_tools = ["json_formatter"]
    system_prompt = (
         "You are the Reviewer agent.\n"
         "Analyze the developer output.\n\n"
         "Return ONLY valid JSON.\n"
         "Do NOT include markdown.\n"
         "Do NOT use ```json.\n"
         "Do NOT write explanations.\n"
         "The response MUST start with { and end with }.\n\n"
         "Schema:\n"
         '{'
         '"approved": true,'
         '"issues": ["..."],'
         '"suggestions": ["..."]'
         '}'
        )

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        dev_output = summarize_agent_output(context.get("developer_output", {}))
        task_id = context.get("task_id", "default")
        result = self.safe_generate_json(f"Developer output summary:\n{dev_output}", task_id=task_id)
        result["agent"] = self.name
        return result
