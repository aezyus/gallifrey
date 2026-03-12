import time

from fastapi import FastAPI, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from scripts.routes import router


app = FastAPI(
    title="Agentic AI System",
    version="1.0",
)

app.include_router(router)


REQUEST_COUNT = Counter(
    "agentic_requests_total", "Request count for Agentic AI API", ["endpoint"]
)
REQUEST_LATENCY = Histogram(
    "agentic_request_latency_seconds",
    "Request latency in seconds for Agentic AI API",
    ["endpoint"],
)


@app.get("/")
def root():
    return {"message": "Agentic AI API running"}


@app.get("/metrics")
def metrics() -> Response:
    """Prometheus metrics endpoint for the Agentic AI service."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)