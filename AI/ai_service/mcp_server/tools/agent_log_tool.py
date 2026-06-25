"""
MCP Tool: store_agent_log
Captures and registers decisions, actions, and rationale made by individual agents.
Mock implementation — stores to an in-memory list.
Ready to swap for a persistent audit log (e.g., PostgreSQL table, Elasticsearch index).
"""
import uuid
import datetime
import logging
from ai_service.schemas.domain import AgentLogResult

logger = logging.getLogger("mcp.agent_log_tool")

# ---------------------------------------------------------------------------
# In-memory agent decision log.
# In production, persist to a structured database table or append-only log.
# ---------------------------------------------------------------------------
_agent_log_store: list[dict] = []


async def store_agent_log(
    trip_id: str,
    agent_name: str,
    action: str,
    reasoning: str,
    details: dict | None = None,
) -> AgentLogResult:
    """
    MCP Tool Handler — store_agent_log

    Records a structured decision log entry for an agent's execution step.
    This enables full audit trails of agent reasoning across a trip workflow.

    Args:
        trip_id:    Unique trip identifier.
        agent_name: Name of the agent making the decision (e.g. "WeatherAgent").
        action:     Action label the agent took (e.g. "WeatherDetour").
        reasoning:  Human-readable rationale for the decision.
        details:    Optional dict with any extra structured context (e.g., tool results).

    Returns:
        AgentLogResult with a generated log_id and status="stored".
    """
    log_id = f"LOG-{uuid.uuid4().hex[:10].upper()}"
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

    entry = {
        "log_id": log_id,
        "trip_id": trip_id,
        "agent_name": agent_name,
        "action": action,
        "reasoning": reasoning,
        "details": details or {},
        "timestamp": timestamp,
    }

    _agent_log_store.append(entry)

    logger.info(
        f"[store_agent_log] log_id='{log_id}' agent='{agent_name}' "
        f"action='{action}' trip='{trip_id}'"
    )

    return AgentLogResult(
        log_id=log_id,
        trip_id=trip_id,
        agent_name=agent_name,
        action=action,
        status="stored",
    )


def get_agent_logs(trip_id: str | None = None) -> list[dict]:
    """
    Helper — retrieve agent logs.
    If trip_id is provided, filters to that trip only.
    Used by server introspection endpoints and tests.
    """
    if trip_id:
        return [entry for entry in _agent_log_store if entry["trip_id"] == trip_id]
    return list(_agent_log_store)


def flush_agent_logs() -> None:
    """Helper — clears the agent log store (useful for test teardown)."""
    _agent_log_store.clear()
