"""Developer Agent.

Responsibility: produce implementation code/snippets based on the
architecture. May persist output to the MCP workspace via file_writer.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.agents.base import BaseAgent
from backend.memory.summarizer import summarize_agent_output


class DeveloperAgent(BaseAgent):
    name = "developer"
    description = "Implements code based on the architecture design."
    allowed_tools = ["file_writer", "json_formatter"]
    system_prompt = (
        "You are the Developer agent. Given an architecture summary, produce ONLY a JSON object:\n"
        '{"files": [{"path": str, "content": str}], "summary": str}\n'
        "No prose outside the JSON."
    )

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        architecture = summarize_agent_output(context.get("architect_output", {}))
        task_id = context.get("task_id", "default")
        result = self.safe_generate_json(f"Architecture summary:\n{architecture}", task_id=task_id)
        result["agent"] = self.name

        for file_entry in result.get("files", []) if isinstance(result, dict) else []:
            path = file_entry.get("path")
            content = file_entry.get("content", "")
            if path:
                self.use_tool("file_writer", task_id=task_id, path=path, content=content)

        return result
