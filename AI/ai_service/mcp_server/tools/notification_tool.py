"""
MCP Tool: create_notification
Triggers and queues popup alerts, in-app updates, or email notifications.
Mock implementation — ready to swap for a live notification service
(e.g., Firebase Cloud Messaging, SendGrid, or a backend REST call).
"""
import uuid
import logging
from ai_service.schemas.domain import NotificationResult

logger = logging.getLogger("mcp.notification_tool")

# ---------------------------------------------------------------------------
# In-memory notification queue: list of queued notification payloads.
# In production, publish to a message broker (Redis Pub/Sub, SQS, etc.)
# or forward to the backend /notifications REST endpoint.
# ---------------------------------------------------------------------------
_notification_queue: list[dict] = []

VALID_TYPES = {"popup", "email", "in_app"}


async def create_notification(
    trip_id: str,
    type: str,
    title: str,
    message: str,
    metadata: dict | None = None,
) -> NotificationResult:
    """
    MCP Tool Handler — create_notification

    Enqueues a notification for delivery to the user.

    Args:
        trip_id:  Unique trip identifier the notification relates to.
        type:     Delivery channel — popup / email / in_app.
        title:    Short notification headline.
        message:  Full notification body text.
        metadata: Optional extra data (e.g., affected activity, severity level).

    Returns:
        NotificationResult with a generated notification_id and status="queued".
    """
    notification_type = type.lower()
    if notification_type not in VALID_TYPES:
        logger.warning(
            f"[create_notification] Unknown type '{type}'. "
            f"Defaulting to 'in_app'. Valid types: {VALID_TYPES}"
        )
        notification_type = "in_app"

    notification_id = f"NOTIF-{uuid.uuid4().hex[:10].upper()}"

    payload = {
        "notification_id": notification_id,
        "trip_id": trip_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "metadata": metadata or {},
        "status": "queued",
    }

    _notification_queue.append(payload)

    logger.info(
        f"[create_notification] Queued [{notification_type.upper()}] "
        f"notification_id='{notification_id}' for trip='{trip_id}' | title='{title}'"
    )

    return NotificationResult(
        notification_id=notification_id,
        trip_id=trip_id,
        type=notification_type,
        title=title,
        status="queued",
    )


def get_notification_queue() -> list[dict]:
    """Helper — retrieve the full notification queue (used by server introspection / tests)."""
    return list(_notification_queue)


def flush_notification_queue() -> None:
    """Helper — clears the notification queue (useful for test teardown)."""
    _notification_queue.clear()
