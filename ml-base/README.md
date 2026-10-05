# ML base

CPU ONNX digit-inference examples: FastAPI + ONNX Runtime for Python, and Hono + ONNX Runtime for Node.js. Both use `models/mnist-8.onnx`.

Start both services:

```sh
docker compose up --build
```

- Python: `http://localhost:8000`
- JavaScript: `http://localhost:8001`

Both expose `GET /health` and `POST /infer`, accepting `{"inputs": [[784 pixel values]]}` and returning `{"scores": [[10 digit scores]]}`. Pixel values should be grayscale floats from 0 to 1, flattened from 28×28 images.

Run the Python check with `cd inference/python && uv sync --group dev && uv run --group dev python -m app.check`.

Training code belongs in `training/` and should remain Python-only.

Model: [ONNX Model Zoo MNIST-8](https://huggingface.co/onnxmodelzoo/mnist-8).
