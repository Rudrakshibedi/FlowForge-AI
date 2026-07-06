"""MCP tool: JSON Formatter.

Validates and pretty-prints JSON, and can also minify it. Used by agents to
normalize structured output before persisting or returning it via the API.
"""
from __future__ import annotations

import json


def json_formatter(data: str, mode: str = "pretty") -> dict:
    try:
        parsed = json.loads(data)
        if mode == "minify":
            formatted = json.dumps(parsed, separators=(",", ":"))
        else:
            formatted = json.dumps(parsed, indent=2, sort_keys=False)
        return {"success": True, "formatted": formatted}
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": f"Invalid JSON: {exc}"}
