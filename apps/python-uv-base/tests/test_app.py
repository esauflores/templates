from fastapi.testclient import TestClient

from app.main import app


def test_health_reports_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_hello_decodes_url_encoded_name() -> None:
    with TestClient(app) as client:
        response = client.get("/api/hello/Ada%20Lovelace")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello, Ada Lovelace!"}


def test_unmatched_route_returns_not_found() -> None:
    with TestClient(app) as client:
        response = client.get("/missing")

    assert response.status_code == 404
