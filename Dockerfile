# ==============================================================================
# ProofMesh Backend Dockerfile
# FastAPI Application Server for Autonomous AI Agent Provenance & Trust Framework
# ==============================================================================

FROM python:3.11-slim

# Set environment variables for Python runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    PORT=8000

# Install minimal OS dependencies for network operations & healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app/

# Ensure runtime directories exist
RUN mkdir -p /app/uploads_storage \
             /app/generated_reports \
             /app/trust_reports \
             /app/impact_reports

# Expose backend application port
EXPOSE 8000

# Healthcheck to verify FastAPI responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn ASGI server (dynamically respects $PORT for Render compatibility)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
