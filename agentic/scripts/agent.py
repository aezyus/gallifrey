from langchain.agents import create_agent

from scripts.llm import get_llm
from scripts.tools import (
    vision_model_tool,
    sensor_model_tool,
    risk_model_tool,
    test_kushagra_tool
)

def build_agent():

    llm = get_llm()

    tools = [
        vision_model_tool,
        sensor_model_tool,
        risk_model_tool,
        test_kushagra_tool
    ]

    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt="""
You are an infrastructure monitoring AI.

You have access to tools that analyze:
- bridge images
- vibration sensor data
- structural failure risk

Use the tools when necessary.
"""
    )

    return agent