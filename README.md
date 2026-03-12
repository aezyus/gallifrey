# Gallifrey: Advanced Structural Health Monitoring (SHM) Framework

Gallifrey is a state-of-the-art Structural Health Monitoring (SHM) and predictive maintenance platform designed for high-stakes infrastructure like bridges. It integrates non-stationary signal processing, deep learning, and robust infrastructure monitoring to provide a "Digital Twin" perspective on structural integrity.

## 🌟 Vision
To bridge the gap between raw sensor telemetry and actionable structural engineering insights using a Multi-Scale Analysis approach.

---

## 🔬 Core Methodology & Modules

### 1. Advanced Signal Processing (`ml/algos/wavelet_transform`)
Traditional FFT analysis often fails on transient or non-stationary vibration data. Gallifrey implements research-grade Wavelet transforms for precise time-frequency localization:
- **CWT (Continuous Wavelet Transform)**: Provides high-resolution scalograms using Morlet basis.
- **Wavelet Spectral Density**: Estimating Local Power Spectra (LPS) to understand energy distribution over time.
- **Structural Response**: Solving MDOF (Multi-Degree-of-Freedom) system responses via Duhamel Integral integration.
- **Reliability Metrics**: Automated calculation of the First Passage Criterion and Up-crossing rates for failure probability.

### 2. Machine Learning Pipeline (`ml/data/`)
The system employs a layered approach to detect and predict degradation:
- **Phase A: Anomaly Detection**: 
    - *Isolation Forests*: Statistical outlier detection on sensor streams.
    - *VAE (Variational Autoencoders)*: Learning a latent "healthy state" representation to identify reconstruction errors in compromised structures.
- **Phase B: Forecasting**:
    - *LSTM (Long Short-Term Memory)*: Modeling temporal dependencies in strain and vibration data.
    - *SHI Prediction*: Regressing the Structural Health Index to forecast remaining useful life.
- **Phase C: Optimization**:
    - *Bayesian Optimization (Optuna)*: Automated hyperparameter tuning for LSTM and RF architectures.

### 3. Monitoring Infrastructure (`infra/`)
A enterprise-grade monitoring stack ensures data persistency and observability:
- **TimescaleDB**: High-performance SQL for time-series, handling millions of sensor metrics with hypertables.
- **Prometheus**: Internal system monitoring and metric scraping.
- **Grafana**: Real-time dashboards displaying vibration trends, anomaly scores, and sensor health.

---

## 📁 Detailed Directory Map

```text
gallifrey-ml/
├── infra/                      # Cloud-native Infrastructure
│   ├── docker-compose.yml      # Service orchestration
│   ├── prometheus.yml          # Scraping rules
│   └── grafana/                # (Optional) Dashboard JSON configs
├── ml/                         # Research & Development
│   ├── algos/                  
│   │   └── wavelet_transform/  # Paper-based core implementations
│   ├── data/                   
│   │   ├── figures/            # Visual proof of analysis
│   │   ├── models/             # Compressed weights & serialized estimators
│   │   ├── Analysis.ipynb      # Signal processing playground
│   │   └── Risk_Prediction.ipynb # Deep learning training & evaluation
│   ├── tests/                  # Integration & Unit tests
│   ├── main.py                 # Core CLI entry
│   └── pyproject.toml          # Modern dependency management
└── README.md                   # Primary Documentation
```

---

## 🛠️ Installation & Execution

### 1. Python Environment (Powered by `uv`)
Ensure `uv` is installed, then run:
```bash
cd ml
uv sync
```
This will automate the installation of `PyWavelets`, `PyTorch`, `Scikit-Learn`, and our optimization dependencies.

### 2. Infrastructure Deployment
Launch the "Monitoring Digital Twin" environment:
```bash
cd infra
docker-compose up -d
```
Visit `localhost:3000` to access the Grafana Dashboard.

### 3. Verification Suite
Run the scientific validation pipeline:
```bash
cd ml
uv run pytest ml/tests/tests_wavelets
```

---

## 📈 Result Highlights
- **Dynamic Reliability**: Capable of estimating bridge failure probability under non-stationary excitation (e.g., traffic loads, wind).
- **Scalogram Analysis**: Visual identification of fatigue-related frequency shifts.
- **Anomaly Logic**: VAE-based reconstruction helps distinguish between sensor noise and real structural changes.

---
*Maintained by the Gallifrey Team. Aiming for Resilient Infrastructure through AI.*

