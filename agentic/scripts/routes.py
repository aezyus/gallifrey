from fastapi import APIRouter

from scripts.agent import build_agent
from scripts.schemas import ChatRequest, ChatResponse


router = APIRouter()

agent = build_agent()


@router.post("/chat")
async def chat_endpoint(req: ChatRequest):

    result = agent.invoke(
        {
            "messages": [
                {"role": "user", "content": req.message}
            ]
        }
    )

    return {
        "response": result["messages"][-1].content
    }