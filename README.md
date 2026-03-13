# Gallifrey: Advanced Structural Health Monitoring (SHM) Platform

Gallifrey is a full-stack, AI-powered Structural Health Monitoring (SHM) and predictive maintenance platform built for high-stakes civil infrastructure — bridges, towers, and large-scale structures. It combines research-grade signal processing, deep learning anomaly detection, an agentic AI layer, and a real-time Next.js dashboard into a unified Digital Twin experience.

> **Hackathon Submission** — Built for rapid detection of structural degradation using live sensor telemetry, ML inference, and a modern monitoring UI.

---

## 🌟 Vision

Bridge the gap between raw sensor telemetry and actionable structural engineering insights through a **Multi-Scale AI Analysis** pipeline:

> Raw Sensor Stream → Wavelet Signal Processing → Anomaly Detection → Risk Forecasting → Natural-Language AI Explanation → Engineer Action

---

## 🗂️ Project Structure

```text
gallifrey-ml/
├── frontend/                   # Next.js 14 Real-Time Dashboard
│   ├── src/app/                # App Router pages
│   │   ├── page.tsx            # Fleet Overview Dashboard
│   │   ├── alerts/             # Alert Triage Centre
│   │   ├── analytics/          # Risk Analytics & Explainability
│   │   ├── structures/         # Structure Inventory + Detail Drill-down
│   │   ├── infra/              # Infrastructure Health Monitor
│   │   └── control-room/       # Mission Control
│   └── src/components/         # Shared components (Sidebar, AIAssistant, Bridge3D, …)
├── ml/                         # ML Research & FastAPI Backend
│   ├── algos/wavelet_transform/ # Research-grade signal processing
│   ├── data/                   # Trained models, notebooks, figures
│   ├── tests/                  # Pytest integration + unit tests
│   └── main.py                 # CLI entry / FastAPI server
├── agentic/                    # LLM Agentic Layer (FastAPI at :8002)
└── infra/                      # Docker Compose monitoring stack
    ├── docker-compose.yml
    └── prometheus.yml
```

---

## 🔬 Core Modules

### 1. Signal Processing (`ml/algos/wavelet_transform/`)

Research-grade non-stationary signal analysis:

| Module | Description |
|---|---|
| `wavelet_fft.py` | CWT scalograms via Morlet basis — high-resolution time-frequency localization |
| `local_power_spectra.py` | Evolutionary Power Spectral Density (EPSD) estimation |
| `structural_response.py` | MDOF system response via Duhamel Integral |
| `reliability_analysis.py` | First Passage Criterion, up-crossing rate, failure probability |
| `utils.py` | Shared signal helpers |

### 2. Machine Learning Pipeline (`ml/data/`)

Layered degradation detection + forecasting:

**Phase A — Anomaly Detection**
- **Isolation Forest** (`isolation_forest.pkl`): Statistical outlier detection on live sensor streams
- **VAE** (`vae_state_dict.pth`): Variational Autoencoder learns a "healthy state" latent space; reconstruction error flags compromised structures

**Phase B — Forecasting**
- **LSTM**: Models temporal dependencies in strain/vibration data
- **SHI Regression**: Predicts Structural Health Index to forecast remaining useful life

**Phase C — Optimization**
- **Bayesian Hyperparameter Tuning** (Optuna): Automated search for LSTM and RF architectures

### 3. FastAPI Inference Server (`ml/main.py`)

REST + WebSocket server at `http://localhost:8000`:

| Endpoint | Description |
|---|---|
| `GET /structures` | List all monitored structures |
| `GET /structures/{id}` | Per-structure metadata |
| `GET /risk-history` | Time-series risk score data |
| `POST /infer` | Run anomaly inference on a sensor payload |
| `WS /ws/anomaly` | Live WebSocket stream of anomaly events |

### 4. Agentic AI Layer (`agentic/`)

Natural-language reasoning over structural data at `http://localhost:8002`:

- **Context-aware chat**: Routes structural context (page, structure ID) with every message
- **LLM-backed Q&A**: Explains risk scores, recommends maintenance, answers sensor questions in plain English
- **Streaming responses**: Token-by-token WebSocket delivery for real-time chat UX

### 5. Next.js Frontend (`frontend/`)

Built with **Next.js 14 + React 18 + Tailwind CSS + Framer Motion**:

| Page | Features |
|---|---|
| **Fleet Overview** (`/`) | Live strain chart with anomaly threshold marker, SHI gauge, fleet health leaderboard, data freshness ticker |
| **Control Room** (`/control-room`) | Mission-ops style full-screen monitoring layout |
| **Structures** (`/structures`) | Inventory grid with health-score badges |
| **Structure Detail** (`/structures/[id]`) | 4-tab drill-down: Overview (3D Digital Twin + live charts) · Sensors (table + add-sensor form) · Events (timeline) · Maintenance (cost & action panel) |
| **Analytics** (`/analytics`) | Risk score history (ComposedChart with confidence band), Risk Explainability panel (feature importance bars), freshness timestamp |
| **Alerts** (`/alerts`) | Grouped alert triage: escalation timers, batch acknowledge/resolve, severity + status dual filters, one-click Diagnose link |
| **Infrastructure** (`/infra`) | Interactive SVG infra map, per-service data trust indicators (completeness %, latency ms, missing sensor count), detail panel on click |

**Shared Components:**

| Component | Description |
|---|---|
| `CriticalAlertBanner` | Sticky top banner driven by live WebSocket — turns red/yellow when anomalies are active |
| `AIAssistant` | Floating chat widget; reads current page + structure context and prepends it to every LLM request |
| `Bridge3D` | React Three Fiber 3D bridge model; SSR-safe with WebGL detection and graceful fallback |
| `Sidebar` | Fixed nav with mobile responsive toggle (hamburger → slide-in panel) |
| `WaveletScalogram` | CWT scalogram visualization |

**Design System:**
- Custom CSS tokens: `--status-healthy`, `--status-warning`, `--status-critical`, `--status-unknown`
- Fluid typography: `.text-fluid-title` via `clamp()`
- Glassmorphism utility classes: `glass-card`, `hud-border`, `grid-bg`, `scanline`

### 6. Monitoring Infrastructure (`infra/`)

| Service | Role |
|---|---|
| **TimescaleDB** | High-performance time-series SQL with hypertables |
| **Prometheus** | Metric scraping + internal server monitoring |
| **Grafana** | Dashboards for vibration trends, anomaly scores, sensor health (`:3000`) |

---

## 🛠️ Installation & Running

### Prerequisites
- Node.js 18+, npm
- Python 3.12+, [`uv`](https://github.com/astral-sh/uv)
- Docker (for infra stack)

### 1. ML Backend

```bash
cd ml
uv sync
uv run python main.py          # starts FastAPI at http://localhost:8000
```

### 2. Agentic Layer

```bash
cd agentic
pip install -r requirements.txt
uvicorn main:app --port 8002
```

### 3. Frontend Dashboard

```bash
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

### 4. Infrastructure Stack

```bash
cd infra
docker-compose up -d
```
Grafana at `http://localhost:3000`, Prometheus at `http://localhost:9090`.

### 5. Run Tests

```bash
cd ml
uv run pytest tests/tests_wavelets -v
```

---

## 📈 Key Results

- **Dynamic Reliability**: Estimates bridge failure probability under non-stationary excitation (traffic loads, wind, seismic)
- **Scalogram Analysis**: Visual identification of fatigue-related frequency shifts via CWT
- **Anomaly Detection**: VAE reconstruction error cleanly separates sensor noise from genuine structural compromise
- **Real-Time Dashboard**: Sub-second WebSocket delivery of anomaly events to the browser
- **Explainable AI**: Feature importance panel shows which physical factor (crack propagation, vibration, corrosion, thermal drift, deflection) is driving the risk score

---

## 🗺️ Feature Roadmap

- [x] Wavelet signal processing pipeline
- [x] Isolation Forest + VAE anomaly detection
- [x] LSTM time-series forecasting
- [x] FastAPI inference server (REST + WebSocket)
- [x] Next.js real-time dashboard (8 pages)
- [x] 3D Digital Twin (React Three Fiber, SSR-safe)
- [x] Agentic AI assistant (context-aware chat)
- [x] Critical alert banner (live anomaly count)
- [x] Alert triage with escalation timers + batch actions
- [x] Risk Explainability panel (feature importance)
- [x] Structure detail drill-down (4 tabs)
- [x] Interactive infrastructure map
- [x] Data freshness + trust indicators
- [x] Responsive mobile sidebar
- [ ] SHAP integration for real model feature importance
- [ ] Comparative multi-structure chart overlay
- [ ] Predictive maintenance scheduler UI
- [ ] WCAG AA accessibility pass

---

*Maintained by the Gallifrey Team — Aiming for Resilient Infrastructure through AI.*
