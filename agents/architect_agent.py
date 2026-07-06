"""Architect Agent.

Responsibility: propose a technical architecture/design (components, data
flow, tech choices) based on the PM's requirements. Does not write code.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.agents.base import BaseAgent
from backend.memory.summarizer import summarize_agent_output


class ArchitectAgent(BaseAgent):
    name = "architect"
    description = "Designs the technical architecture from product requirements."
    allowed_tools = ["json_formatter"]
    system_prompt = (
        "You are the Architect agent. Given user stories, produce ONLY a JSON object:\n"
        '{"components": [str], "data_flow": str, "tech_choices": [str], "notes": str}\n'
        "No prose outside the JSON."
    )

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        stories = summarize_agent_output(context.get("pm_output", {}))
        task_id = context.get("task_id", "default")
        result = self.safe_generate_json(f"User stories summary:\n{stories}", task_id=task_id)
        result["agent"] = self.name
        return result
