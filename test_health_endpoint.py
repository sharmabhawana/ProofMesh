"""
test_health_endpoint.py
-----------------------
Tests for the /health and /api/health endpoints.

Verifies:
- HTTP 200 always returned (even when Neo4j is offline)
- Response always contains "status": "healthy"
- Both "database" and "neo4j" keys are present
- neo4j.status is "connected" or "disconnected" (never raw exception text)
- neo4j dict never contains passwords or full URIs with credentials
- _check_neo4j_health() never raises — it always returns a dict
"""

import sys
import os

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient


def get_client():
    """Import app after sys.path is set."""
    from main import app
    return TestClient(app)


def test_health_returns_200():
    """GET /health always returns HTTP 200."""
    client = get_client()
    r = client.get("/health")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"


def test_api_health_returns_200():
    """GET /api/health always returns HTTP 200."""
    client = get_client()
    r = client.get("/api/health")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"


def test_health_status_always_healthy():
    """Overall 'status' field is always 'healthy' regardless of Neo4j state."""
    client = get_client()
    r = client.get("/health")
    body = r.json()
    assert body.get("status") == "healthy", (
        f"Expected status='healthy', got: {body.get('status')}"
    )


def test_health_contains_database_key():
    """Response includes 'database' key (PostgreSQL status)."""
    client = get_client()
    r = client.get("/health")
    body = r.json()
    assert "database" in body, f"Missing 'database' key in: {body}"


def test_health_contains_neo4j_key():
    """Response includes 'neo4j' key."""
    client = get_client()
    r = client.get("/health")
    body = r.json()
    assert "neo4j" in body, f"Missing 'neo4j' key in: {body}"


def test_neo4j_status_is_valid_string():
    """neo4j.status is exactly 'connected' or 'disconnected'."""
    client = get_client()
    r = client.get("/health")
    body = r.json()
    neo4j = body.get("neo4j", {})
    assert isinstance(neo4j, dict), f"neo4j field should be a dict, got: {type(neo4j)}"
    status = neo4j.get("status")
    assert status in ("connected", "disconnected"), (
        f"neo4j.status must be 'connected' or 'disconnected', got: {status!r}"
    )


def test_neo4j_no_credentials_exposed():
    """neo4j dict must not contain passwords or full connection strings with credentials."""
    client = get_client()
    r = client.get("/health")
    body = r.json()
    neo4j = body.get("neo4j", {})
    # Serialise to string and check for common credential patterns
    neo4j_str = str(neo4j)
    # Password key must not appear
    assert "password" not in neo4j_str.lower(), (
        "neo4j health response must not contain password field"
    )
    # Connection strings with embedded credentials (user:pass@) must not appear
    assert "@" not in neo4j_str or "://" not in neo4j_str, (
        "neo4j health response must not contain a full URI with credentials"
    )


def test_check_neo4j_health_never_raises():
    """_check_neo4j_health() must always return a dict, never raise."""
    from main import _check_neo4j_health
    result = _check_neo4j_health()
    assert isinstance(result, dict), (
        f"_check_neo4j_health() must return a dict, got: {type(result)}"
    )
    assert "status" in result, f"Result must have 'status' key, got: {result}"


def test_health_contains_required_fields():
    """Response contains all expected top-level fields."""
    client = get_client()
    r = client.get("/health")
    body = r.json()
    for field in ("status", "backend", "project", "environment", "database", "neo4j"):
        assert field in body, f"Missing field '{field}' in response: {body}"


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v"]))
