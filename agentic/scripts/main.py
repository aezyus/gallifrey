from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from scripts.metrics import REQUEST_COUNT, REQUEST_LATENCY
from scripts.routes import router


app = FastAPI(
    title="Agentic AI System",
    version="1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Agentic AI API running"}


@app.get("/metrics")
def metrics() -> Response:
    """Prometheus metrics endpoint for the Agentic AI service."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)