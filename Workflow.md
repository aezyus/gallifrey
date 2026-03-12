## Gallifrey – End‑to‑End Workflow (Backend + Frontend)

This document explains how to run the **Gallifrey ML backend**, the **mock streaming + monitoring stack**, and how a future **Next.js frontend** should integrate with it to deliver an AI‑powered structural intelligence system.

---

### 1. High‑Level Architecture

- **Data / Models**
  - `ml/data/` – sensor & fused datasets, training notebooks, and exported models.
  - `ml/data/models/` – production artifacts:
    - `scaler_anomaly.pkl`, `isolation_forest.pkl`, `autoencoder.pt`
    - `scaler_ml.pkl`, `gbm_risk_classifier.pkl`, `rf_shi_regressor.pkl`, `lstm_risk.pt`
    - `model_meta.json` – canonical feature definitions, window sizes, risk weights.

- **Core Algorithms**
  - `ml/algos/wavelet_transform/` – CWT, LPS, structural response (Duhamel integral), reliability metrics.

- **Serving / Inference**
  - `ml/server.py` – FastAPI app exposing:
    - Anomaly endpoints (`/anomaly`, `/ws/anomaly`)
    - Risk & SHI endpoints (`/risk`, `/risk/sequence`)
    - Metadata & health (`/metadata`, `/health`)
    - Metrics (`/metrics`, Prometheus format)

- **Mock Live Streaming + Visualization**
  - `ml/mock/simulator.py` – Monte‑Carlo simulator over `bridge_fused_with_anomalies.csv`.
  - `ml/mock/stream_client.py` – streams to `/ws/anomaly` and `/risk`, logs results.
  - `ml/mock/dashboard.py` – Streamlit app for live anomaly + SHI + risk visualization.

- **Infra / Monitoring**
  - `infra/docker-compose.yml` – runs ML API, mock streamer, TimescaleDB, Prometheus, Grafana, Chroma.
  - `infra/prometheus.yml` – scrapes `ml-api:8000/metrics`.

The **Next.js frontend** will primarily talk to the FastAPI app over HTTP/WebSocket and optionally consume Prometheus/Grafana and TimescaleDB for deep historical exploration.

---

### 2. Backend Setup (Local Development)

From the repo root:

1. **Create the Python environment (via `uv`)**

```bash
cd ml
uv sync
```

2. **Run wavelet / reliability tests (optional sanity check)**

```bash
uv run pytest ml/tests/tests_wavelets
```

3. **Start the inference server**

```bash
uv run uvicorn server:app --host 0.0.0.0 --port 8000
```

You now have:

- OpenAPI docs at `http://localhost:8000/docs`
- Prometheus metrics at `http://localhost:8000/metrics`
- Metadata at `http://localhost:8000/metadata`

---

### 3. API Surface for the Frontend

All endpoints are **CORS‑enabled** (via `CORSMiddleware`), so a browser‑based Next.js app can call them directly.

#### 3.1 Metadata & Health

- **`GET /metadata`**
  - Returns:
    - `meta` – parsed `model_meta.json`, e.g.:
      - `feature_columns`: full ML feature set
      - `anomaly_features`: 8‑dim anomaly feature vector
      - `window_size_lstm`: sequence length for LSTM PoF
      - `risk_weights`: weights used for composite risk scores
    - `models` – which artifacts exist (`scaler_anomaly`, `isolation_forest`, `autoencoder`, `scaler_ml`, `gbm_risk_classifier`, `rf_shi_regressor`, `lstm_risk`).
    - `window_size_lstm` and `feature_columns` as loaded by the server.
  - **Frontend usage**:
    - Configure feature ordering for `/anomaly` & `/risk`.
    - Know which metrics (AE recon error, SHI, PoF) are available.

- **`GET /health`**
  - Returns `{"status": "ok", "models": {...}}` for a quick liveness check.

- **`GET /metrics`**
  - Prometheus format metrics:
    - `gallifrey_requests_total{endpoint="anomaly|risk|risk_sequence"}`
    - `gallifrey_request_latency_seconds_bucket{endpoint="..."}` etc.
  - **Frontend usage**:
    - Not typically called directly, but visualized via Grafana.

#### 3.2 Anomaly Inference

- **`POST /anomaly`**
  - Request body:
    ```json
    {
      "samples": [
        [vibration_ms2, strain_microstrain, deflection_mm, displacement_mm,
         modal_frequency_hz, temperature_c, wind_speed_ms, crack_propagation_mm],
        ...
      ]
    }
    ```
    Feature order **must** match `anomaly_features` from `/metadata`.
  - Response:
    ```json
    {
      "is_anomaly": [true, false, ...],
      "isolation_forest_score": [-0.12, 0.03, ...],
      "reconstruction_error": [0.004, 0.001, ...] // null if AE unavailable
    }
    ```
  - On error: `{"error": {"code": "ANOMALY_INFERENCE_FAILED", "message": "..."}}`.

- **`WS /ws/anomaly`**
  - Client sends JSON messages:
    ```json
    { "samples": [[...8 floats...], [...]] }
    ```
  - Server responds with the same schema as `POST /anomaly`.
  - **Frontend usage**:
    - Subscribe for near real‑time anomaly scores for streaming sensors.

#### 3.3 Risk, SHI, and PoF Inference

- **`POST /risk`**
  - Request body:
    ```json
    {
      "samples": [
        {
          "features": {
            "Strain_microstrain": 580.0,
            "Deflection_mm": 12.5,
            "Vibration_ms2": 0.9,
            "Displacement_mm": 21.0,
            "Modal_Frequency_Hz": 1.9,
            "Temperature_C": 10.0,
            "Wind_Speed_ms": 7.0,
            "Crack_Propagation_mm": 0.001
            // Any subset of feature_columns; missing keys default to 0.0
          }
        }
      ]
    }
    ```
  - Response:
    ```json
    {
      "gbm_risk_label": [0],
      "gbm_risk_score": [0.18],
      "shi_pred": [86.5]
    }
    ```
  - On error: `{"error": {"code": "RISK_INFERENCE_FAILED", "message": "..."}}`.

- **`POST /risk/sequence`** (LSTM PoF)
  - Request body:
    ```json
    {
      "samples": [
        { "features": { /* same structure as /risk */ } },
        ...
        // exactly window_size_lstm entries (see /metadata)
      ]
    }
    ```
  - Response:
    ```json
    { "pof": 0.32 }
    ```
  - On error: `{"error": {"code": "RISK_SEQUENCE_INFERENCE_FAILED", "message": "..."}}`.

Together, these endpoints let the frontend:

- Show **per‑snapshot** SHI and risk score.
- Show **sequence‑level** PoF forecasts (e.g. last 24 points of a sensor’s fused time series).

---

### 4. Mock Streaming & Demo Dashboard

The mock stack demonstrates the “live” behavior without needing real sensors.

#### 4.1 Running the dashboard

From `ml/`:

```bash
uv run uvicorn server:app --host 0.0.0.0 --port 8000
uv run streamlit run mock/dashboard.py
```

Then open `http://localhost:8501`.

#### 4.2 What happens under the hood

- `mock/simulator.py`:
  - Samples windows from `bridge_fused_with_anomalies.csv`.
  - Adds noise and synthetic boosts to simulate anomalies.
  - Emits `SensorSample(timestamp, features[8D], condition_label)`.

- `mock/stream_client.py`:
  - Opens a WebSocket to `/ws/anomaly`.
  - For each batch:
    - Sends `{"samples": [[...8D features...], ...]}` to `/ws/anomaly`.
    - Receives `AnomalyResponse`.
    - Calls `/risk` with `features` dicts built from the same batch (only anomaly features filled; others zeroed).
    - Logs:
      - `strain_microstrain`, `vibration_ms2`, …
      - `is_anomaly`, `if_score`, `recon_error`
      - `gbm_risk_label`, `gbm_risk_score`, `shi_pred`
    - Writes to `mock/results/stream_results.csv`.

- `mock/dashboard.py`:
  - Lets you trigger a streaming run (calls `stream_batches`).
  - Visualizes:
    - **Tab 1**: Strain (microstrain) + anomaly markers.
    - **Tab 2**: Isolation Forest score.
    - **Tab 3**: Autoencoder reconstruction error.
    - **Tab 4**: SHI (`shi_pred`) and risk score (`gbm_risk_score`).

**Frontend takeaway:** the Streamlit app is a working reference of what a Next.js dashboard should do using the same endpoints (`/ws/anomaly`, `/risk`).

---

### 5. Infra & Monitoring Workflow

From the repo root:

```bash
cd infra
docker compose up --build
```

This starts:

- `ml-api` – Gallifrey FastAPI server on `8000`.
- `ml-mock` – mock streamer (can be stopped if not needed).
- `timescaledb` – PostgreSQL with Timescale extension (`infra_monitoring` DB).
- `prometheus` – scraping `ml-api:8000/metrics` using `infra/prometheus.yml`.
- `grafana` – UI on `3000` (default credentials `admin/admin`).
- `chroma` – ChromaDB for future RAG/agentic workflows.

**Next steps (future work):**

- Define TimescaleDB schemas for:
  - `sensor_readings`
  - `anomaly_events`
  - `risk_snapshots`
- Wire FastAPI ingestion endpoints to insert into TimescaleDB in addition to returning inferences.
- Add Grafana dashboards:
  - One using Prometheus (request latencies, anomaly counts).
  - One using TimescaleDB (historical SHI, PoF, anomalies per asset).

---

### 6. Frontend Responsibilities & Integration Patterns

A Next.js frontend for the **AI‑Powered Structural Intelligence System** should implement the following experiences, mapping directly onto backend capabilities.

#### 6.1 Multi‑Sensor Structural Data Fusion

Frontend tasks:

- Provide forms or APIs to ingest:
  - Vibration / accelerometer data
  - Strain / displacement
  - Environmental & traffic data
  - (Optionally) inspection metadata
- For the MVP, the frontend can:
  - Build `features` objects matching `feature_columns` from `/metadata`.
  - Call:
    - `POST /anomaly` + `POST /risk` for snapshot evaluation.
    - `POST /risk/sequence` for temporal PoF.

#### 6.2 Structural Behavior Analysis

Frontend views:

- Time‑series charts for:
  - `Vibration_ms2`, `Strain_microstrain`, `Displacement_mm`, `Modal_Frequency_Hz`, etc.
  - SHI and PoF trends over time (using `/risk`, `/risk/sequence`).
- Optional integration:
  - Show derived wavelet/reliability plots from `ml/algos/wavelet_transform/` as static or precomputed images (or later via a dedicated API).

#### 6.3 Structural Anomaly Detection

Frontend uses anomaly APIs to:

- Display:
  - Current anomaly flags per asset.
  - Rolling anomaly scores (IF + AE).
  - Histograms of reconstruction error vs normal.
- Live dashboards:
  - Subscribe to `/ws/anomaly` for real‑time anomaly events.
  - Plot anomalies per bridge/segment/channel.

#### 6.4 Infrastructure Failure Risk Prediction

Frontend uses risk APIs to:

- Plot SHI and risk score vs time per asset.
- Show PoF estimates from `/risk/sequence`.
- Implement:
  - Risk level badges (e.g. Low/Medium/High from `gbm_risk_label`).
  - Maintenance priority lists sorted by risk score and SHI.

#### 6.5 Digital Twin Simulation

Gallifrey already has a synthetic fused dataset (`bridge_fused.csv`, `digitaltwin.csv`) representing a simple digital twin.

Frontend can:

- Present “what‑if” controls that:
  - Modify environmental/traffic inputs in the fused feature space.
  - Call `/anomaly` + `/risk` with those perturbed features.
  - Visualize how SHI and PoF would change.
- Future extensions:
  - Integrate PyNite or other FE tools to generate new synthetic responses and feed them back through the same APIs.

#### 6.6 Agentic AI Engineering Assistant

Gallifrey includes:

- `model_meta.json` – rich context about features and weights.
- `chroma` service – ready to host documentation, inspection logs, etc.

A frontend (or backend agent service) can:

- Use an LLM + Chroma to:
  - Answer questions like “Why was Bridge A flagged as high risk?”:
    - Retrieve recent anomaly + risk outputs from the API or DB.
    - Combine with model_meta and docs for an explanation.
  - “Which structures show abnormal vibration patterns?”:
    - Query anomalies from TimescaleDB (future) or from a recent window via the APIs.
  - “What maintenance action should be prioritized this month?”:
    - Rank assets by risk score + PoF + SHI trends.

#### 6.7 Monitoring Dashboard

Frontend (or Grafana) should present:

- Asset map (bridges, tunnels, etc.).
- Structural health scores (SHI) and risk levels (GBM label/score).
- Anomaly alerts (IF + AE).
- Sensor data trends (time‑series from ingestion/DB).
- Digital twin overlays (e.g., predicted SHI over a schematic).

Gallifrey already provides:

- The **ML decision layer** via FastAPI.
- The **streaming demo** via Streamlit.
- The **monitoring hooks** via Prometheus + Grafana.

---

### 7. Summary

The Gallifrey backend is now structured to be **frontend‑friendly**:

- CORS‑enabled FastAPI with typed JSON schemas and stable error envelopes.
- Clear separation of anomaly and risk/SHI/PoF endpoints.
- Metadata endpoint exposing model configuration to the UI.
- Streaming and metrics for real‑time dashboards.

The Next.js frontend can build on this to deliver the full challenge scope:

- Multi‑sensor fusion views.
- Structural behavior analysis and anomaly detection.
- Risk prediction and digital twin scenarios.
- Agentic AI explanations and recommendations.
- Rich monitoring dashboards over national‑scale infrastructure.

