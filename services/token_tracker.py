"""Token estimation and per-task budgeting.

Uses a cheap chars/4 heuristic for estimation (no tokenizer dependency).
Good enough for budgeting decisions on free-tier APIs; swap for a real
tokenizer (tiktoken / Gemini's count_tokens) in Phase 2 if exact counts
are needed.
"""
from __future__ import annotations

import threading
from typing import Dict, List


def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, len(text) // 4)


class TokenTracker:
    """Tracks estimated token usage and LLM call counts per task/session."""

    def __init__(self) -> None:
        self._usage: Dict[str, List[Dict]] = {}
        self._lock = threading.Lock()

    def record(self, task_id: str, agent_name: str, provider: str,
               input_tokens: int, output_tokens: int) -> None:
        with self._lock:
            self._usage.setdefault(task_id, []).append({
                "agent": agent_name,
                "provider": provider,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
            })

    def summary(self, task_id: str) -> Dict:
        with self._lock:
            entries = self._usage.get(task_id, [])
        return {
            "task_id": task_id,
            "llm_calls": len(entries),
            "total_input_tokens": sum(e["input_tokens"] for e in entries),
            "total_output_tokens": sum(e["output_tokens"] for e in entries),
            "total_tokens": sum(e["total_tokens"] for e in entries),
            "by_agent": entries,
        }

    def within_budget(self, task_id: str, budget: int) -> bool:
        return self.summary(task_id)["total_tokens"] < budget


token_tracker = TokenTracker()
