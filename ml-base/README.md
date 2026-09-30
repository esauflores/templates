# ml-base

Railway ML inference template: FastAPI + ONNX Runtime (CPU).

## Use as a Railway template

Drag `docker-compose.yml` onto a project canvas (or feed it to the Template Creator) —
services import as staged changes. The file is an import spec, not a runtime config.

| Service   | Image                                       | Internal Port | Volume | Flags                  |
| --------- | ------------------------------------------- | ------------- | ------ | ---------------------- |
| inference | `python:3.12-slim` (multi-stage uv builder) | 8000          | —      | ONNX CPU, `MODEL_PATH` |

- Generic inference endpoint: drop a `model.onnx` into `inference/` (baked into the image) or set `MODEL_PATH`. Without one, a deterministic stub runs so the service boots green and the pipeline stays testable.
- Endpoints: `GET /health` (`status` + `model_loaded`), `POST /infer` `{"inputs": [[floats]]}` → `{"embeddings": [[floats]]}`.
- Bring your own model: embeddings, classifiers, translators (e.g. an ONNX export of lessa-traductor) all fit; reshape `/infer` when the head changes (labels, tokens).
- Internal-only, no auth — same model as backend-base: private networking, behind the API.
- One runnable check: `cd inference && uv sync --group dev && uv run --group dev python -m app.check`.
