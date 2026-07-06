"""Router Agent.

Responsibility: decide which downstream agents must run for a given
request. This is the entry point of "lazy agent execution" — most requests
should NOT trigger the full SDLC pipeline.

Strategy (cheapest first):
1. Rule-based heuristics on keywords (zero LLM calls, zero cost).
2. If heuristics are inconclusive, fall back to a single cheap LLM
   classification call.

Output is always a structured JSON plan naming the ordered agent pipeline.
"""
from __future__ import annotations

from typing import Any, Dict, List

from backend.agents.base import BaseAgent

FULL_SDLC_PIPELINE: List[str] = [
    "planner",
    "product_manager",
    "architect",
    "developer",
    "reviewer",
    "tester",
    "documentation",
]

# Keyword -> pipeline heuristics. Order matters: first match wins.
_HEURISTICS = [
    (
        {"build", "design and build", "full app", "end to end", "end-to-end",
         "sdlc", "from scratch", "production-ready", "new feature", "implement a system"},
        FULL_SDLC_PIPELINE,
    ),
    (
        {"architecture", "design a system", "system design", "how should i structure"},
        ["planner", "architect", "documentation"],
    ),
    (
        {"write code", "implement", "code for", "function that", "script that"},
        ["developer", "reviewer"],
    ),
    (
        {"review my", "review this", "check my code", "is this code good"},
        ["reviewer"],
    ),
    (
        {"test", "write tests", "test cases for"},
        ["tester"],
    ),
    (
        {"document", "readme", "write docs", "documentation for"},
        ["documentation"],
    ),
    (
        {"plan", "roadmap", "break down", "steps to"},
        ["planner"],
    ),
    (
        {"calculate", "compute", "what is", "sum of", "convert"},
        [],  # answered directly via calculator tool, no agent pipeline needed
    ),
]


class RouterAgent(BaseAgent):
    name = "router"
    description = "Decides which agents should execute for a given request."
    allowed_tools = ["json_formatter"]
    system_prompt = (
        "You are the Router agent for a multi-agent SDLC platform. Given a user request, "
        "choose the MINIMAL ordered list of agents needed from this set: "
        "planner, product_manager, architect, developer, reviewer, tester, documentation. "
        "Respond ONLY with JSON: "
        '{"pipeline": [str], "complexity": "simple"|"complex", "reasoning": str}'
    )

    def _heuristic_route(self, request: str) -> Dict[str, Any] | None:
        lowered = request.lower()
        for keywords, pipeline in _HEURISTICS:
            if any(kw in lowered for kw in keywords):
                return {
                    "pipeline": pipeline,
                    "complexity": "complex" if len(pipeline) > 3 else "simple",
                    "reasoning": "matched_heuristic_keywords",
                    "method": "heuristic",
                }
        return None

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        request = context.get("request", "")
        task_id = context.get("task_id", "default")

        heuristic_result = self._heuristic_route(request)
        if heuristic_result is not None:
            heuristic_result["agent"] = self.name
            return heuristic_result

        # Fall back to a single, cheap LLM classification call.
        result = self.safe_generate_json(f"User request:\n{request}", task_id=task_id, max_tokens=256)
        if not result.get("success", True):
            # Both LLM providers failed: degrade gracefully to a safe default
            # pipeline instead of crashing the whole request.
            result["pipeline"] = ["planner"]
            result["method"] = "fallback_default"
        else:
            result.setdefault("pipeline", ["planner"])
            result["method"] = "llm"
        result["agent"] = self.name
        return result
