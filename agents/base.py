"""Base agent class.

Every agent:
- has ONE responsibility
- makes AT MOST one LLM call per `run()` invocation
- returns a structured JSON dict (never free text)
- declares which MCP tools it is allowed to use
- receives minimal context (not the full conversation) via `run(context)`
"""
from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from typing import Any, ClassVar, Dict, List

from backend.config.logging_config import get_logger
from backend.services.llm_service import llm_service
from backend.services.observability import execution_tracker
from backend.tools.mcp_client import mcp_client


class BaseAgent(ABC):
    name: ClassVar[str] = "base_agent"
    description: ClassVar[str] = "Base agent"
    allowed_tools: ClassVar[List[str]] = []
    system_prompt: ClassVar[str] = "You are a helpful assistant."

    def __init__(self) -> None:
        self.logger = get_logger(f"agent.{self.name}")

    def use_tool(self, tool_name: str, task_id: str = "default", **kwargs: Any) -> Dict[str, Any]:
        """Call an MCP tool this agent is permitted to use.

        `task_id` is used only for observability (tool-usage tracking) and is
        never forwarded to the underlying tool function.
        """
        if tool_name not in self.allowed_tools:
            return {"success": False, "error": f"Agent '{self.name}' is not permitted to use '{tool_name}'"}
        result = mcp_client.call(tool_name, **kwargs)
        execution_tracker.record_tool_call(
            task_id, self.name, tool_name, success=bool(result.get("success", True))
        )
        return result

    def safe_generate_json(
        self,
        prompt: str,
        task_id: str = "default",
        max_tokens: int | None = None,
    ) -> Dict[str, Any]:
        """Make the agent's single LLM call and parse it into JSON, catching
        any provider/network failure so a single agent's failure can never
        crash the whole pipeline — it degrades to a structured error result.
        """
        try:
            raw = self.call_llm(prompt, task_id=task_id, max_tokens=max_tokens)
            print("\n" + "=" * 60)
            print(f"AGENT: {self.name}")
            print(raw)
            print("=" * 60)
        except Exception as exc:  # noqa: BLE001
            self.logger.error(
                "LLM call failed",
                extra={"extra_fields": {"task_id": task_id, "agent": self.name, "error": str(exc)}},
            )
            return {"success": False, "error": str(exc), "agent": self.name}

        result = self.parse_json_response(raw)
        if isinstance(result, dict):
            result.setdefault("success", not result.get("parse_error", False))
        return result

    def call_llm(self, user_prompt: str, task_id: str = "default", max_tokens: int | None = None) -> str:
        response = llm_service.generate(
            agent_name=self.name,
            system_prompt=self.system_prompt,
            user_prompt=user_prompt,
            task_id=task_id,
            max_tokens=max_tokens,
        )
        return response["text"]

    @staticmethod
    def parse_json_response(raw_text: str) -> Dict[str, Any]:
        """Best-effort extraction of a JSON object from an LLM response."""
        text = raw_text.strip()
        text = re.sub(r"^```(json)?|```$", "", text, flags=re.MULTILINE).strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
            return {
                "success": False,
                "error": "Failed to parse LLM JSON response",
                "raw_text": raw_text,
                "parse_error": True,
            }

    @abstractmethod
    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent's single responsibility and return structured JSON."""
        ...
