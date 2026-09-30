"""ONNX model loading. Drop a model.onnx next to this file (or set MODEL_PATH)."""

import os

import numpy as np

MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(os.path.dirname(__file__), "model.onnx"))
INPUT_NAME = "input"

session = None
if os.path.exists(MODEL_PATH):
    import onnxruntime as ort

    session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])

# ponytail: deterministic stub (tanh) when no model.onnx exists, so the template boots green
# and the pipeline is testable; drop in a real model.onnx to replace it entirely.


def infer(batch: list[list[float]]) -> list[list[float]]:
    if session is not None:
        out = session.run(None, {INPUT_NAME: np.array(batch, dtype=np.float32)})
        return out[0].tolist()
    return np.tanh(np.array(batch, dtype=np.float32)).tolist()
