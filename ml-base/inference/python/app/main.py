from fastapi import Body, FastAPI

from .model import infer, session

app = FastAPI(title="ml-base inference")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": session is not None}


@app.post("/infer")
def infer_route(inputs: list[list[float]] = Body(embed=True)) -> dict:
    return {"scores": infer(inputs)}
