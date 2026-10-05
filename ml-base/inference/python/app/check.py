"""One runnable check: uv run --group dev python -m app.check"""

from fastapi.testclient import TestClient

from .main import app


def main() -> None:
    client = TestClient(app)
    assert client.get("/health").json()["status"] == "ok"
    r = client.post("/infer", json={"inputs": [[0.0] * 784]})
    assert r.status_code == 200
    out = r.json()["scores"]
    assert len(out) == 1 and len(out[0]) == 10, out
    print("smoke ok")


if __name__ == "__main__":
    main()
