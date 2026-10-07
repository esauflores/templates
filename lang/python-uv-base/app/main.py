from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="python-uv-base")


class HealthResponse(BaseModel):
    status: Literal["ok"]


class HelloResponse(BaseModel):
    message: str


@app.get("/health")
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/hello/{name}")
async def hello(name: str) -> HelloResponse:
    return HelloResponse(message=f"Hello, {name}!")
