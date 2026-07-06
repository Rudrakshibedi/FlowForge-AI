"""Product Manager Agent.

Responsibility: convert the plan into user stories / requirements with
acceptance criteria. Does not design system architecture.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.agents.base import BaseAgent
from backend.memory.summarizer import summarize_agent_output


class ProductManagerAgent(BaseAgent):
    name = "product_manager"
    description = "Translates the plan into user stories and acceptance criteria."
    allowed_tools = ["json_formatter"]
    system_prompt = (
        "You are the Product Manager agent.\n"
        "Return ONLY valid JSON.\n"
        "Do not use markdown.\n"
        "Do not use ```.\n"
        "Do not write explanations.\n"
        "The response must start with { and end with }.\n\n"
        "Generate EXACTLY 3 user stories.\n"
        "Each user story must contain:\n"
        "- title\n"
        "- description\n"
        "- exactly 3 acceptance_criteria\n\n"
        "Schema:\n"
        '{'
        '"user_stories": ['
        '{'
        '"title":"...",'
        '"description":"...",'
        '"acceptance_criteria":["...","...","..."]'
        '}'
        ']'
        '}'
    )

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        plan = summarize_agent_output(context.get("planner_output", {}))
        task_id = context.get("task_id", "default")
        prompt = (
             "Using the following project plan, generate exactly 3 concise user stories.\n\n"
             f"{plan}"
        )  

        result = self.safe_generate_json(
            prompt,
            task_id=task_id,
            max_tokens=700,
        )
        result["agent"] = self.name
        return result
