"""MCP tool: Markdown Generator.

Converts a simple structured outline into a Markdown document. Used mainly
by the Documentation agent.
"""
from __future__ import annotations

from typing import Any, Dict, List


def markdown_generator(title: str, sections: List[Dict[str, Any]]) -> dict:
    """
    sections: [{ "heading": str, "content": str, "level": int(optional, default 2) }]
    """
    try:
        lines = [f"# {title}", ""]
        for section in sections:
            level = int(section.get("level", 2))
            heading = section.get("heading", "")
            content = section.get("content", "")
            lines.append(f"{'#' * level} {heading}")
            lines.append("")
            lines.append(content)
            lines.append("")
        markdown = "\n".join(lines)
        return {"success": True, "markdown": markdown}
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": str(exc)}
