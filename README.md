# Agentic AI Infrastructure Monitoring

This branch runs an **AI agent system with a PDF knowledge base, Chroma vector DB, and monitoring stack**.

## Prerequisites

* Python 3.10+
* Docker + Docker Compose
* Git

---

# 1. Clone Repository

```bash
git clone <repo-url>
cd agentic
```

---

# 2. Create Python Environment

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

# 3. Start Infrastructure (Docker)

From the `infra` folder:

```bash
cd infra
docker compose up -d
```

This starts:

* ChromaDB → `localhost:8001`
* TimescaleDB → `localhost:5432`
* Prometheus → `localhost:9090`
* Grafana → `localhost:3000`

Verify containers:

```bash
docker ps
```

---

# 4. Start FastAPI Backend

From the project root:

```bash
uvicorn main:app --reload
```

Backend runs at:

```
http://127.0.0.1:8000
```

---

# 5. Start Streamlit UI

In another terminal:

```bash
streamlit run streamlit_app.py
```

Open:

```
http://localhost:8501
```

---

# Usage

1. Upload a PDF from the Streamlit sidebar
2. Ask questions about the document
3. The agent retrieves answers from the PDF using ChromaDB
