import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.model import input_name, session


def test_health_reports_loaded_model() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "model_loaded": True}


def test_hello_decodes_url_encoded_name() -> None:
    with TestClient(app) as client:
        response = client.get("/api/hello/Ada%20Lovelace")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello, Ada Lovelace!"}


def test_inference_matches_direct_model_and_preserves_order() -> None:
    images = [[0.0] * 784, [1.0] * 784]
    expected = [
        session.run(
            None,
            {input_name: np.asarray(image, dtype=np.float32).reshape(1, 1, 28, 28)},
        )[0][0].tolist()
        for image in images
    ]

    with TestClient(app) as client:
        response = client.post("/infer", json={"inputs": images})

    assert response.status_code == 200
    scores = response.json()["scores"]
    assert len(scores) == 2
    for actual, reference in zip(scores, expected, strict=True):
        assert len(actual) == 10
        assert np.isfinite(actual).all()
        np.testing.assert_allclose(actual, reference, rtol=1e-5, atol=1e-6)


def test_empty_batch_returns_no_scores() -> None:
    with TestClient(app) as client:
        response = client.post("/infer", json={"inputs": []})

    assert response.status_code == 200
    assert response.json() == {"scores": []}


def test_missing_inputs_is_rejected() -> None:
    with TestClient(app) as client:
        response = client.post("/infer", json={})

    assert response.status_code == 422
