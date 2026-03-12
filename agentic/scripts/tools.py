from langchain_core.tools import tool


@tool
def vision_model_tool(image: str) -> str:
    """Dummy vision model that detects cracks in bridge images"""
    return f"[VISION MODEL] Crack detected in {image} with medium severity"


@tool
def sensor_model_tool(sensor_data: str) -> str:
    """Dummy vibration sensor model"""
    return f"[SENSOR MODEL] Abnormal vibration pattern in {sensor_data}"


@tool
def risk_model_tool(data: str) -> str:
    """Dummy structural risk predictor"""
    return f"[RISK MODEL] High failure probability based on: {data}"

from langchain_core.tools import tool


@tool
def test_kushagra_tool() -> str:
    """Test tool to verify agent execution."""
    
    print("Hello Kushagra you are the best")  
    
    return "Hello Kushagra you are the best"