from langchain_core.tools import tool
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings


# ------------------------
# Embedding Model
# ------------------------
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# ------------------------
# Chroma Connection
# ------------------------
CHROMA_HOST = "localhost"
CHROMA_PORT = 8001
COLLECTION_NAME = "pdf_docs"


def get_db():
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        host=CHROMA_HOST,
        port=CHROMA_PORT
    )


# ------------------------
# PDF Search Tool
# ------------------------
@tool
def search_pdf_knowledgebase(query: str) -> str:
    """Search the uploaded PDF knowledge base for relevant information."""

    db = get_db()

    results = db.similarity_search(query, k=3)

    context = "\n\n".join([doc.page_content for doc in results])

    return f"Relevant information from PDF:\n{context}"

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



