from fastapi import APIRouter

from scripts.agent import build_agent
from scripts.schemas import ChatRequest, ChatResponse
from fastapi import UploadFile, File
from scripts.pdf_ingest import ingest_pdf 

router = APIRouter()

agent = build_agent()

@router.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):

    path = f"temp_{file.filename}"

    with open(path, "wb") as f:
        f.write(await file.read())

    result = ingest_pdf(path)

    return {"message": result}



@router.post("/chat")
async def chat_endpoint(req: ChatRequest):

    result = agent.invoke(
        {
            "messages": [
                {"role": "user", "content": req.message}
            ]
        }
    )

    # Extract the last assistant message
    last_message = result["messages"][-1]

    # Handle different message formats
    if hasattr(last_message, "content"):
        reply = last_message.content
    else:
        reply = str(last_message)

    return {"response": reply}