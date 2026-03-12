import os
import re
from typing import Any, Dict, List

import requests
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.tools import tool

from scripts.reporting import generate_structure_report_pdf


# ------------------------
# Embedding Model (PDF RAG)
# ------------------------
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# ------------------------
# Chroma Connection
# ------------------------
CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8001"))
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "pdf_docs")


def get_db():
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        host=CHROMA_HOST,
        port=CHROMA_PORT,
    )


# ------------------------
# PDF Search Tool
# ------------------------
@tool
def search_pdf_knowledgebase(query: str) -> str:
    """Search the uploaded PDF knowledge base for relevant information about infrastructure and SHM."""

    db = get_db()
    results = db.similarity_search(query, k=3)
    if not results:
        return "No relevant information found in the uploaded PDFs."

    context = "\n\n".join([doc.page_content for doc in results])
    return f"Relevant information from PDF knowledge base:\n{context}"


# ------------------------
# ML API Tools (Gallifrey backend)
# ------------------------

ML_BASE_URL = os.getenv("ML_BASE_URL", "http://127.0.0.1:8000")


def _get_metadata() -> Dict[str, Any]:
    resp = requests.get(f"{ML_BASE_URL}/metadata", timeout=5)
    resp.raise_for_status()
    return resp.json()


@tool
def get_gallifrey_model_metadata() -> Dict[str, Any]:
    """Get Gallifrey model metadata: anomaly features, feature columns, LSTM window size, and risk weights."""
    return _get_metadata()


@tool
def run_anomaly_detection_on_features(features: Dict[str, float]) -> Dict[str, Any]:
    """
    Run anomaly detection using the Gallifrey ML backend given a feature dict.

    The keys of 'features' should match the anomaly_features returned by
    get_gallifrey_model_metadata (e.g. 'Vibration_ms2', 'Strain_microstrain', ...).
    Missing features default to 0.0.
    """
    meta = _get_metadata()
    anomaly_features: List[str] = meta.get("meta", {}).get("anomaly_features", [])
    if not anomaly_features:
        anomaly_features = meta.get("anomaly_features", [])

    vec = [float(features.get(name, 0.0)) for name in anomaly_features]
    payload = {"samples": [vec]}

    resp = requests.post(f"{ML_BASE_URL}/anomaly", json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()


@tool
def run_risk_shi_on_features(features: Dict[str, float]) -> Dict[str, Any]:
    """
    Run risk and SHI prediction on a single fused feature snapshot using the Gallifrey ML backend.

    The keys of 'features' should match any subset of model_meta.feature_columns.
    Missing features default to 0.0 on the backend.
    """
    payload = {"samples": [{"features": features}]}
    resp = requests.post(f"{ML_BASE_URL}/risk", json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()


@tool
def run_lstm_pof_on_sequence(sequence: List[Dict[str, float]]) -> Dict[str, Any]:
    """
    Run temporal PoF prediction using the Gallifrey LSTM risk model.

    'sequence' should be a time-ordered list of feature dicts of length equal to
    window_size_lstm from get_gallifrey_model_metadata.
    """
    payload = {"samples": [{"features": f} for f in sequence]}
    resp = requests.post(f"{ML_BASE_URL}/risk/sequence", json=payload, timeout=15)
    resp.raise_for_status()
    return resp.json()


@tool
def summarize_gallifrey_metrics() -> str:
    """
    Summarize basic request metrics from the Gallifrey ML API (Prometheus /metrics).

    Returns a human-readable summary of request counts and latencies that can be
    shown inside the chat.
    """
    try:
        text = requests.get(f"{ML_BASE_URL}/metrics", timeout=5).text
    except Exception as exc:
        return f"Could not fetch metrics from Gallifrey ML API: {exc}"

    total_pattern = re.compile(r'^gallifrey_requests_total\{endpoint="([^"]+)"\}\s+([0-9\.]+)')
    latency_pattern = re.compile(
        r'^gallifrey_request_latency_seconds_sum\{endpoint="([^"]+)"\}\s+([0-9\.]+)'
    )
    count_pattern = re.compile(
        r'^gallifrey_request_latency_seconds_count\{endpoint="([^"]+)"\}\s+([0-9\.]+)'
    )

    totals: Dict[str, float] = {}
    sums: Dict[str, float] = {}
    counts: Dict[str, float] = {}

    for line in text.splitlines():
        m = total_pattern.match(line)
        if m:
            ep, val = m.groups()
            totals[ep] = float(val)
        m = latency_pattern.match(line)
        if m:
            ep, val = m.groups()
            sums[ep] = float(val)
        m = count_pattern.match(line)
        if m:
            ep, val = m.groups()
            counts[ep] = float(val)

    if not totals:
        return "No Gallifrey ML API metrics available yet."

    lines = ["Gallifrey ML API metrics summary:"]
    for ep, total in totals.items():
        avg_ms = None
        if ep in sums and ep in counts and counts[ep] > 0:
            avg_ms = 1000.0 * sums[ep] / counts[ep]
        if avg_ms is not None:
            lines.append(f"- {ep}: {int(total)} requests, avg latency ~{avg_ms:.1f} ms")
        else:
            lines.append(f"- {ep}: {int(total)} requests")

    return "\n".join(lines)


@tool
def generate_structure_pdf_report(
    structure_id: int,
    structure_name: str,
    structure_type: str,
    location: str,
    sensors: List[Dict[str, Any]],
    telemetry_summary: Dict[str, Any] | None = None,
) -> str:
    """
    Generate a downloadable PDF report for a structure using current sensor metadata
    and telemetry summary values.
    """
    path = generate_structure_report_pdf(
        {
            "structure_id": structure_id,
            "structure_name": structure_name,
            "structure_type": structure_type,
            "location": location,
            "sensors": sensors,
            "telemetry_summary": telemetry_summary or {},
        }
    )
    return f"Generated structure PDF report at: {path}"
