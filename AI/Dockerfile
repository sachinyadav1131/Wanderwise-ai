# Stage 1: Build dependencies
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Final runner image
FROM python:3.11-slim as runner

WORKDIR /app

# Ensure pip installed binaries are available in PATH and python modules are in PYTHONPATH
ENV PATH=/root/.local/bin:$PATH \
    PYTHONPATH=/app

COPY --from=builder /root/.local /root/.local
COPY . /app

EXPOSE 8000

# Default single-worker startup command for development/sandbox testing
# To migrate to Gunicorn worker managers in production, swap the active CMD below to:
# CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "ai_service.main:app"]
CMD ["uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
