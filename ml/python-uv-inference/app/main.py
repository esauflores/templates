from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from .model import infer, session

app = FastAPI(title="python-uv-inference")


class HealthResponse(BaseModel):
    status: Literal["ok"]
    model_loaded: bool


class HelloResponse(BaseModel):
    message: str


class InferRequest(BaseModel):
    inputs: list[list[float]]


class InferResponse(BaseModel):
    scores: list[list[float]]


@app.get("/health")
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=session is not None)


@app.get("/api/hello/{name}")
async def hello(name: str) -> HelloResponse:
    return HelloResponse(message=f"Hello, {name}!")


@app.post("/infer")
def infer_route(request: InferRequest) -> InferResponse:
    return InferResponse(scores=infer(request.inputs))
