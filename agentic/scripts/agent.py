from langchain.agents import create_agent

from scripts.llm import get_llm
from scripts.tools import (
    vision_model_tool,
    sensor_model_tool,
    risk_model_tool,
    test_kushagra_tool,
    search_pdf_knowledgebase
)

def build_agent():

    llm = get_llm()

    tools = [
        vision_model_tool,
        sensor_model_tool,
        risk_model_tool,
        test_kushagra_tool,
        search_pdf_knowledgebase
    ]

    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt = """
    You are an AI assistant that answers questions using the uploaded PDF knowledge base.

    Rules:
    - Use the retrieved PDF content to answer questions.
    - If the answer exists in the PDF, return it directly.
    - Do NOT refuse questions if the information exists in the PDF.
    - Only say you cannot answer if the information is not present in the PDF.
"""
    )

    return agent