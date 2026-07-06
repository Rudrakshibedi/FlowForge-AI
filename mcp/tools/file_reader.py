"""MCP tool: File Reader.

Reads a text file from the sandboxed MCP workspace directory only.
Path traversal outside the workspace is rejected.
"""
from __future__ import annotations

import os

from backend.config.settings import get_settings


def _resolve_safe_path(relative_path: str) -> str:
    settings = get_settings()
    workspace = os.path.abspath(settings.mcp_workspace_dir)
    os.makedirs(workspace, exist_ok=True)
    target = os.path.abspath(os.path.join(workspace, relative_path))
    if not target.startswith(workspace):
        raise ValueError("Path escapes MCP workspace sandbox")
    return target


def file_reader(path: str) -> dict:
    """Read a text file. Returns structured result, never raises to caller."""
    try:
        safe_path = _resolve_safe_path(path)
        if not os.path.isfile(safe_path):
            return {"success": False, "error": f"File not found: {path}"}
        with open(safe_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"success": True, "path": path, "content": content}
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": str(exc)}
