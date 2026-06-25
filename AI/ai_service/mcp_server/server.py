"""
MCPServer — Core in-process Model Context Protocol dispatcher for Wanderwise AI.

Architecture
────────────
This server acts as the exclusive gateway between agents and all external/persistent
operations. Agents never call tools directly; they dispatch named tool calls through
MCPClient → MCPServer → tool handler function.

This avoids the overhead of stdio/SSE transport (used by external MCP processes)
and keeps the architecture clean within a single FastAPI process.

Tool Registration
─────────────────
  server.register_tool("tool_name", async_handler_fn)

Tool Dispatch
─────────────
  result = await server.call_tool("tool_name", {"arg1": ..., "arg2": ...})

The dispatcher:
  1. Validates the tool is registered.
  2. Calls the async handler with unpacked kwargs.
  3. Serialises the Pydantic result to a plain dict.
  4. Returns the dict to the calling agent via MCPClient.
"""
import logging
import inspect
from typing import Any, Callable, Awaitable
from pydantic import BaseModel

logger = logging.getLogger("mcp.server")


class MCPServer:
    """
    In-process MCP tool registry and dispatcher.

    Usage:
        # At app startup:
        await mcp_server.initialize()

        # In an agent:
        result = await mcp_server.call_tool("check_weather", {"location": "Lodhi Garden", "date": "2026-06-21"})
    """

    def __init__(self) -> None:
        # Registry: { tool_name: async callable }
        self._registry: dict[str, Callable[..., Awaitable[Any]]] = {}
        self._initialized: bool = False

    # ── Registration ────────────────────────────────────────────────────────

    def register_tool(self, name: str, fn: Callable[..., Awaitable[Any]]) -> None:
        """
        Register an async tool handler under a given name.

        Args:
            name: Tool identifier agents will use in call_tool().
            fn:   Async callable implementing the tool logic.

        Raises:
            ValueError: If name is already registered (prevents silent overwrites).
        """
        if name in self._registry:
            raise ValueError(
                f"[MCPServer] Tool '{name}' is already registered. "
                "Use a unique name or explicitly deregister first."
            )
        if not inspect.iscoroutinefunction(fn):
            raise TypeError(
                f"[MCPServer] Tool '{name}' must be an async function (coroutine)."
            )
        self._registry[name] = fn
        logger.debug(f"[MCPServer] Registered tool: '{name}'")

    def list_tools(self) -> list[str]:
        """Returns the names of all currently registered tools."""
        return sorted(self._registry.keys())

    # ── Dispatch ────────────────────────────────────────────────────────────

    async def call_tool(self, name: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Dispatch a tool call by name.

        Args:
            name: Registered tool name (e.g. "check_weather").
            args: Keyword arguments forwarded to the tool handler.

        Returns:
            dict — the tool's Pydantic result serialised to a plain dict.

        Raises:
            KeyError:   If the tool name is not registered.
            Exception:  Any exception raised by the tool handler propagates up.
        """
        args = args or {}

        if name not in self._registry:
            registered = self.list_tools()
            raise KeyError(
                f"[MCPServer] Tool '{name}' is not registered. "
                f"Available tools: {registered}"
            )

        logger.info(f"[MCPServer] Dispatching tool '{name}' with args: {list(args.keys())}")

        try:
            handler = self._registry[name]
            raw_result = await handler(**args)

            # Serialise Pydantic models to dict; pass through plain dicts/primitives.
            if isinstance(raw_result, BaseModel):
                result = raw_result.model_dump()
            elif isinstance(raw_result, dict):
                result = raw_result
            else:
                result = {"value": raw_result}

            logger.info(f"[MCPServer] Tool '{name}' completed successfully.")
            return result

        except Exception as exc:
            logger.error(f"[MCPServer] Tool '{name}' raised an error: {exc}", exc_info=True)
            raise

    # ── Lifecycle ───────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        """
        Register all built-in Wanderwise MCP tools.
        Called once at FastAPI startup via the lifespan context manager.
        """
        if self._initialized:
            logger.warning("[MCPServer] initialize() called more than once — skipping.")
            return

        logger.info("[MCPServer] Initializing and registering all tools …")

        from ai_service.mcp_server.tools.weather_tool import check_weather
        from ai_service.mcp_server.tools.hotel_tool import find_hotels
        from ai_service.mcp_server.tools.places_tool import find_places
        from ai_service.mcp_server.tools.distance_tool import calculate_distance
        from ai_service.mcp_server.tools.itinerary_tool import save_itinerary, update_itinerary
        from ai_service.mcp_server.tools.notification_tool import create_notification
        from ai_service.mcp_server.tools.agent_log_tool import store_agent_log

        tools = {
            "check_weather":      check_weather,
            "find_hotels":        find_hotels,
            "find_places":        find_places,
            "calculate_distance": calculate_distance,
            "save_itinerary":     save_itinerary,
            "update_itinerary":   update_itinerary,
            "create_notification": create_notification,
            "store_agent_log":    store_agent_log,
        }

        for tool_name, handler in tools.items():
            self.register_tool(tool_name, handler)

        self._initialized = True
        logger.info(
            f"[MCPServer] ✓ Initialized with {len(self._registry)} tools: "
            f"{self.list_tools()}"
        )

    async def shutdown(self) -> None:
        """Graceful shutdown hook — clears registry."""
        logger.info("[MCPServer] Shutting down and clearing tool registry.")
        self._registry.clear()
        self._initialized = False


# ---------------------------------------------------------------------------
# Module-level singleton — imported by MCPClient and FastAPI lifespan.
# ---------------------------------------------------------------------------
mcp_server = MCPServer()
