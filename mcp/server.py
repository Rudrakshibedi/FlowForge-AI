"""MCP Server.

Phase 1 implements the MCP server as an in-process tool registry with a
JSON-RPC-like `call_tool(name, arguments)` interface. This keeps the
contract identical to a networked MCP server so it can be swapped for a
real `mcp` stdio/SSE server process in Phase 2 without touching agent code.

Agents must never import tool functions directly — they go through
`backend.tools.mcp_client`, which talks to this registry.
"""
from __future__ import annotations

from typing import Any, Callable, Dict

from backend.config.logging_config import get_logger
from backend.mcp.tools.calculator import calculator
from backend.mcp.tools.file_reader import file_reader
from backend.mcp.tools.file_writer import file_writer
from backend.mcp.tools.json_formatter import json_formatter
from backend.mcp.tools.markdown_generator import markdown_generator

logger = get_logger(__name__)


class MCPServer:
    """Minimal in-process MCP tool registry."""

    def __init__(self) -> None:
        self._tools: Dict[str, Callable[..., dict]] = {}
        self._register_builtin_tools()

    def _register_builtin_tools(self) -> None:
        self.register_tool("file_reader", file_reader)
        self.register_tool("file_writer", file_writer)
        self.register_tool("markdown_generator", markdown_generator)
        self.register_tool("calculator", calculator)
        self.register_tool("json_formatter", json_formatter)

    def register_tool(self, name: str, fn: Callable[..., dict]) -> None:
        self._tools[name] = fn

    def list_tools(self) -> list[str]:
        return list(self._tools.keys())

    def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        if name not in self._tools:
            logger.warning("Unknown MCP tool requested", extra={"extra_fields": {"tool": name}})
            return {"success": False, "error": f"Unknown tool: {name}"}
        try:
            logger.info("MCP tool call", extra={"extra_fields": {"tool": name, "arguments": arguments}})
            return self._tools[name](**arguments)
        except TypeError as exc:
            return {"success": False, "error": f"Invalid arguments for {name}: {exc}"}
        except Exception as exc:  # noqa: BLE001
            logger.exception("MCP tool call failed")
            return {"success": False, "error": str(exc)}


# Process-wide singleton MCP server instance.
mcp_server = MCPServer()
