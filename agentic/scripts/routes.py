import time
from typing import Any

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from scripts.agent import build_agent
from scripts.metrics import REQUEST_COUNT, REQUEST_LATENCY
from scripts.reporting import generate_structure_report_pdf
from scripts.schemas import ChatRequest, ChatResponse
from scripts.pdf_ingest import ingest_pdf

router = APIRouter()

agent: Any | None = None


class StructureReportRequest(BaseModel):
    structure_id: int
    structure_name: str
    structure_type: str
    location: str
    sensors: list[dict]
    telemetry_summary: dict | None = None


def get_agent() -> Any:
    global agent
    if agent is not None:
        return agent

    try:
        agent = build_agent()
        return agent
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Agentic model is not available. Configure GOOGLE_API_KEY "
                "for the agent service."
            ),
        ) from exc


@router.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    start = time.perf_counter()
    REQUEST_COUNT.labels("upload_pdf").inc()

    path = f"temp_{file.filename}"

    with open(path, "wb") as f:
        f.write(await file.read())

    result = ingest_pdf(path)

    REQUEST_LATENCY.labels("upload_pdf").observe(time.perf_counter() - start)
    return {"message": result}


@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    start = time.perf_counter()
    REQUEST_COUNT.labels("chat").inc()

    runtime_agent = get_agent()

    result = runtime_agent.invoke(
        {
            "messages": [
                {"role": "user", "content": req.message},
            ]
        }
    )

    # Extract the last assistant message
    last_message = result["messages"][-1]

    if hasattr(last_message, "content"):
        reply = last_message.content
        if isinstance(reply, list):
            # Handle list of content parts (e.g. from some multimodal models)
            text_parts = []
            for part in reply:
                if isinstance(part, str):
                    text_parts.append(part)
                elif isinstance(part, dict) and "text" in part:
                    text_parts.append(part["text"])
            reply = "\n".join(text_parts)
    else:
        reply = str(last_message)

    REQUEST_LATENCY.labels("chat").observe(time.perf_counter() - start)
    return {"response": str(reply)}


@router.post("/reports/structure")
async def generate_structure_report(req: StructureReportRequest):
    start = time.perf_counter()
    REQUEST_COUNT.labels("report_structure").inc()
    try:
        report_path = generate_structure_report_pdf(req.model_dump())
        return FileResponse(
            path=report_path,
            media_type="application/pdf",
            filename=report_path.split("/")[-1],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {exc}") from exc
    finally:
        REQUEST_LATENCY.labels("report_structure").observe(time.perf_counter() - start)