"""
MCPClient — Thin async wrapper for agent-side tool calls.

Agents import `mcp_client` and call:
    result = await mcp_client.call_tool("tool_name", {"arg": "value"})

This is the only interface agents should use to interact with external data
or trigger side effects. Never call tool functions directly from agents.
"""
import logging
from typing import Any
from ai_service.mcp_server.server import mcp_server

logger = logging.getLogger("mcp.client")


class MCPClient:
    """
    Agent-facing client that delegates tool calls to the MCPServer dispatcher.

    Usage in an agent's _execute_logic():
        from ai_service.mcp_server.client import mcp_client

        weather = await mcp_client.call_tool(
            "check_weather",
            {"location": state.tripDetails.destination, "date": state.tripDetails.startDate}
        )
        # weather is a plain dict with keys from WeatherResult
    """

    async def call_tool(
        self,
        tool_name: str,
        args: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Invoke a registered MCP tool by name.

        Args:
            tool_name: Registered tool identifier (e.g. "check_weather").
            args:      Keyword arguments forwarded to the tool handler.

        Returns:
            Plain dict serialised from the tool's Pydantic result model.

        Raises:
            KeyError:  If the tool is not registered in MCPServer.
            Exception: Any exception raised by the underlying tool handler.
        """
        logger.debug(f"[MCPClient] → call_tool('{tool_name}', args={list((args or {}).keys())})")
        result = await mcp_server.call_tool(tool_name, args)
        logger.debug(f"[MCPClient] ← result keys from '{tool_name}': {list(result.keys())}")
        return result

    def available_tools(self) -> list[str]:
        """Returns a sorted list of all registered tool names."""
        return mcp_server.list_tools()


# ---------------------------------------------------------------------------
# Module-level singleton — agents import this directly.
# ---------------------------------------------------------------------------
mcp_client = MCPClient()
