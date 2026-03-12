import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# load .env file
load_dotenv()

def get_llm():
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found. Check your .env file.")

    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0,
        google_api_key=api_key
    )