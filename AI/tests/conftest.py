"""
conftest.py — Shared pytest fixtures for Wanderwise AI test suite.

Ensures the MCP server is initialized once for all async tests that involve
agents or workflows, since agents now call `mcp_client.call_tool()` which
requires tools to be registered in the MCPServer registry.
"""
import pytest
import pytest_asyncio
from ai_service.mcp_server.server import mcp_server


@pytest.fixture(scope="session", autouse=True)
def event_loop_policy():
    """Use the default asyncio event loop policy for all tests."""
    import asyncio
    asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="session", autouse=True)
async def initialize_mcp_server():
    """
    Session-scoped fixture: initializes the MCP server tool registry
    before any agent or workflow test runs, and shuts it down after
    the entire test session completes.

    This mirrors the lifespan hook in main.py but makes it available
    to unit tests that don't go through the FastAPI TestClient.
    """
    if not mcp_server._initialized:
        await mcp_server.initialize()
    yield
    await mcp_server.shutdown()
