from fastapi import FastAPI
from scripts.routes import router


app = FastAPI(
    title="Agentic AI System",
    version="1.0"
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Agentic AI API running"}