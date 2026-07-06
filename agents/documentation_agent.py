"""Documentation Agent.

Responsibility: produce a Markdown summary of the whole workflow using the
MCP markdown_generator tool, based on the outputs of prior agents.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.agents.base import BaseAgent
from backend.memory.summarizer import summarize_agent_output


class DocumentationAgent(BaseAgent):
    name = "documentation"
    description = "Produces final Markdown documentation for the completed workflow."
    allowed_tools = ["markdown_generator", "file_writer", "json_formatter"]
    system_prompt = (
        "You are the Documentation agent. Given summaries of the plan, requirements, "
        "architecture, implementation, review and tests, produce ONLY a JSON object:\n"
        '{"title": str, "sections": [{"heading": str, "content": str}]}\n'
        "No prose outside the JSON."
    )

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        task_id = context.get("task_id", "default")
        combined = {
             "plan": summarize_agent_output(context.get("planner_output", {})),
             "requirements": summarize_agent_output(context.get("pm_output", {})),
             "architecture": summarize_agent_output(context.get("architect_output", {})),
             "implementation": summarize_agent_output(context.get("developer_output", {})),
             "review": summarize_agent_output(context.get("reviewer_output", {})),
             "tests": summarize_agent_output(context.get("tester_output", {})),
    }
        result = self.safe_generate_json(
            f"Workflow summaries:\n{combined}",
            task_id=task_id,
      )

        if not isinstance(result, dict):
            result = {}

        result["agent"] = self.name

    # If the LLM didn't return valid sections, create a fallback.
        if not isinstance(result.get("sections"), list):
            result["title"] = result.get("title", "Project Documentation")
            result["sections"] = [
            {
                "heading": "Workflow Summary",
                "content": str(combined),
            }
        ]
        result["success"] = True

        md = self.use_tool(
            "markdown_generator",
            task_id=task_id,
            title=result["title"],
            sections=result["sections"],
        )

        if md.get("success"):
            result["markdown"] = md["markdown"]
            self.use_tool(
                "file_writer",
                task_id=task_id,
                path="README_GENERATED.md",
                content=md["markdown"],
           ) 

        return result