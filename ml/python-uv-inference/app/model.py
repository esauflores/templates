"""Load and run the MNIST ONNX model."""

import os

import numpy as np
import onnxruntime as ort

MODEL_PATH = os.environ.get("MODEL_PATH")
if not MODEL_PATH:
    raise ValueError("MODEL_PATH is required")
if not os.path.isfile(MODEL_PATH):
    raise FileNotFoundError(f"ONNX model not found: {MODEL_PATH}")

session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
input_name = session.get_inputs()[0].name


def infer(batch: list[list[float]]) -> list[list[float]]:
    return [
        session.run(
            None,
            {input_name: np.array(image, dtype=np.float32).reshape(1, 1, 28, 28)},
        )[0][0].tolist()
        for image in batch
    ]
