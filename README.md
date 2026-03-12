# Gallifrey: Structural Health Monitoring (SHM) System

Gallifrey is an advanced Structural Health Monitoring (SHM) platform designed for bridge infrastructure. It utilizes Machine Learning, Wavelet-based signal processing, and time-series infrastructure to analyze vibration, strain, and environmental data for real-time risk assessment and anomaly detection.

## 🚀 Key Features

- **Advanced Signal Processing**: Wavelet-based decomposition (CWT) using PyWavelets for non-stationary bridge vibration analysis.
- **Structural Reliability**: Implementation of paper-based algorithms for Local Power Spectra (LPS), Evolutionary PSD, and First Passage Reliability.
- **Anomaly Detection**: Multi-model approach including Isolation Forests and Variational Autoencoders (VAE) to detect structural irregularities.
- **Risk Prediction**: LSTM-based time-series forecasting and Random Forest regressors for predicting structural health indices (SHI).
- **Monitoring Infrastructure**: Containerized monitoring stack with TimescaleDB (Time-series data), Prometheus (Metrics), and Grafana (Dashboards).

## 📁 Project Structure

```text
gallifrey-ml/
├── infra/                  # Infrastructure as Code
│   ├── docker-compose.yml  # TimescaleDB, Grafana, Prometheus
│   └── prometheus.yml      # Scraping configurations
├── ml/                     # Machine Learning Core
│   ├── algos/              # Specialized research algorithms
│   │   └── wavelet_transform/
│   ├── data/               # Datasets, saved models, and figures
│   │   ├── figures/        # Generated analysis plots
│   │   ├── models/         # Trained .pkl and .pt models
│   │   ├── Analysis.ipynb  # Core data analysis & EDA
│   │   └── Risk_Prediction.ipynb # Predictive modeling
│   ├── tests/              # Scientific validation suite
│   ├── main.py             # Entry point
│   └── pyproject.toml      # Dependency management (uv)
└── README.md               # Main project documentation
```

## 🛠️ Getting Started

### Prerequisites
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [Docker & Docker Compose](https://www.docker.com/) (For infrastructure)

### Python Environment Setup
Navigate to the `ml` directory:
```bash
cd ml
uv sync
```

### Infrastructure Setup
Navigate to the `infra` directory:
```bash
cd infra
docker-compose up -d
```

### Running Tests
Validate the wavelet algorithms:
```bash
cd ml
uv run pytest tests/tests_wavelets
```

## 📊 Methodology

1. **Wavelet Decomposition**: Transforming raw vibration/acceleration data into time-frequency domain for better feature extraction.
2. **Feature Extraction**: Extracting spectral entropy, frequency powers, and DWT node energies.
3. **Anomaly Detection**: Training Isolation Forests and VAEs on "healthy" state data to detect deviations.
4. **Reliability Analysis**: Computing the up-crossing rate and first passage probability based on non-stationary spectral density.
5. **Risk Mapping**: Using LSTM/RF to predict the degradation of the Structural Health Index (SHI).

## 📈 Visualizations
The system generates comprehensive charts for:
- CWT Scalograms (Vibration analysis)
- Correlation Heatmaps & Feature Distributions
- Isolation Forest Anomaly Plots
- LSTM-based Probability of Failure (PoF) trends

---
*Developed for Bridge Digital Twin and SHM Research.*
