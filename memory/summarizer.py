"""Context summarization helpers.

Used to compress conversation history and agent outputs before they are
included in downstream prompts, keeping token usage bounded. Phase 1 uses a
cheap heuristic (truncation + bullet extraction) so no extra LLM call is
spent on summarization. Phase 2 can swap in an LLM-based summarizer behind
the same function signature.
"""
from __future__ import annotations

from typing import Dict, List


def summarize_history(history: List[Dict[str, str]], max_chars: int = 800) -> str:
    """Collapse a list of {role, content} turns into a compact digest."""
    if not history:
        return ""

    lines = [f"{turn['role']}: {turn['content']}" for turn in history]
    joined = "\n".join(lines)
    if len(joined) <= max_chars:
        return joined

    # Keep the earliest and most recent turns; drop the noisy middle.
    head = lines[:2]
    tail = lines[-4:]
    digest = "\n".join(head + ["...[truncated]..."] + tail)
    return digest[:max_chars]


def summarize_agent_output(output: Dict, max_fields: int = 6) -> Dict:
    """Return a shrunk copy of an agent's structured JSON output.

    Keeps only the top-level fields most useful to downstream agents
    (status + first N keys) so the full payload isn't re-sent everywhere.
    """
    if not isinstance(output, dict):
        return {}
    keys = list(output.keys())[:max_fields]
    return {k: output[k] for k in keys}
