import time
from fastapi import APIRouter, UploadFile, File

from scripts.agent import build_agent
from scripts.schemas import ChatRequest, ChatResponse
from scripts.pdf_ingest import ingest_pdf
from scripts.main import REQUEST_COUNT, REQUEST_LATENCY

router = APIRouter()

agent = build_agent()


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

    result = agent.invoke(
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
    else:
        reply = str(last_message)

    REQUEST_LATENCY.labels("chat").observe(time.perf_counter() - start)
    return {"response": reply}