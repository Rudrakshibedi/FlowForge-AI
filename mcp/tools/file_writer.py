"""MCP tool: File Writer.

Writes text content to a file inside the sandboxed MCP workspace directory.
"""
from __future__ import annotations

import os

from backend.mcp.tools.file_reader import _resolve_safe_path


def file_writer(path: str, content: str) -> dict:
    try:
        safe_path = _resolve_safe_path(path)
        os.makedirs(os.path.dirname(safe_path), exist_ok=True)
        with open(safe_path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"success": True, "path": path, "bytes_written": len(content.encode("utf-8"))}
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": str(exc)}
