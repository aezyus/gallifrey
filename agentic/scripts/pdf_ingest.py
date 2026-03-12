from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

CHROMA_HOST = "localhost"
CHROMA_PORT = 8001
COLLECTION_NAME = "pdf_docs"


def ingest_pdf(file_path: str):

    loader = PyPDFLoader(file_path)
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(docs)

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    # Connect to running Chroma server
    db = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        host=CHROMA_HOST,
        port=CHROMA_PORT
    )

    # Add documents to collection
    db.add_documents(chunks)

    return f"Ingested {len(chunks)} chunks into ChromaDB"