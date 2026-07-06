"""MCP client.

Thin wrapper agents use to call MCP tools. This is the ONLY sanctioned path
from an agent to a tool — agents must not import backend.mcp.tools.* files
directly. Swapping the in-process MCPServer for a real remote MCP server
(stdio/SSE) only requires changing this file.
"""
from __future__ import annotations

from typing import Any, Dict

from backend.mcp.server import mcp_server


class MCPClient:
    def __init__(self) -> None:
        self._server = mcp_server

    def available_tools(self) -> list[str]:
        return self._server.list_tools()

    def call(self, tool_name: str, **arguments: Any) -> Dict[str, Any]:
        return self._server.call_tool(tool_name, arguments)


mcp_client = MCPClient()
