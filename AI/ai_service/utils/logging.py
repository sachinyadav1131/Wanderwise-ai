import logging
import time
from contextvars import ContextVar
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import uuid

# Context variable to hold correlation ID for the request lifecycle
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="SYSTEM")

# Setup Logger configurations
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [CID: %(correlation_id)s] %(message)s"
)
logger = logging.getLogger("WanderwiseAIService")

# Custom log filter to dynamically inject correlation ID into logging statements
class CorrelationIdFilter(logging.Filter):
    def filter(self, record):
        record.correlation_id = correlation_id_ctx.get()
        return True

# Apply logging filter to all logging handlers
for handler in logging.root.handlers:
    handler.addFilter(CorrelationIdFilter())

class CorrelationIdLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Check for incoming correlation ID or generate a new UUID
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        token = correlation_id_ctx.set(correlation_id)

        logger.info(f"Request started: {request.method} {request.url.path}")
        start_time = time.time()

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            
            logger.info(
                f"Request finished: {request.method} {request.url.path} - "
                f"Status: {response.status_code} - Latency: {process_time:.2f}ms"
            )
            
            response.headers["X-Correlation-ID"] = correlation_id
            return response
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.error(
                f"Request failed: {request.method} {request.url.path} - "
                f"Latency: {process_time:.2f}ms - Error: {str(e)}"
            )
            raise e
        finally:
            correlation_id_ctx.reset(token)
