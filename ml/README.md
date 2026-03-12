## Gallifrey ML – Structural Health Monitoring Pipeline

Gallifrey ML is the research and inference stack for the Gallifrey Structural Health Monitoring (SHM) “digital twin”.  
It takes raw / fused bridge telemetry and produces:

- **Anomaly indicators** (Isolation Forest + Autoencoder features)  
- **Risk scores** (probability of failure, PoF) and **Structural Health Index (SHI)**  
- **Supporting wavelet-based reliability metrics** for non‑stationary loading

This README documents what is actually implemented across the notebooks, Python modules, and inference server, with references to the literature and open‑source projects that inspired the design.

---

### 1. Directory overview

- **`ml/algos/wavelet_transform/`**  
  Research‑grade wavelet and reliability algorithms:
  - `wavelet_fft.py` – CWT using PyWavelets (Littlewood–Paley style wavelets)
  - `local_power_spectra.py` – Local Power Spectra (LPS)
  - `structural_response.py` – MDOF structural response via Duhamel integral
  - `reliability_analysis.py` – First-passage / up‑crossing reliability metrics
  - `utils.py` – evolutionary PSD and helpers  
  See `ml/algos/wavelet_transform/README.md` for details and `ml/tests/tests_wavelets/` for tests.

- **`ml/data/`**
  - `sensor.csv` – base sensor slice (tri‑ax accelerometer, strain, temperature, condition label)  
  - `bridge_fused.csv` – fused “digital twin” dataset (multi‑modal SHM features, SHI, PoF, etc.)  
  - `bridge_fused_with_anomalies.csv` – fused dataset + anomaly outputs (`IF_score`, `AE_recon_error`, `consensus_anomaly`, …)  
  - `digitaltwin.csv` – extended synthetic digital‑twin‑style telemetry  
  - Notebooks:
    - `Analysis.ipynb` – EDA, wavelet analysis and first anomaly experiments  
    - `gallifrey_shm_analysis.ipynb` – **main end‑to‑end pipeline** (fusion → anomaly detection → risk models → export)  
    - `Risk_Prediction.ipynb` – focused risk/SHI/PoF modeling and export
  - `models/` – exported artifacts consumed by the inference server:
    - `scaler_anomaly.pkl` – `StandardScaler` for anomaly features
    - `isolation_forest.pkl` – Isolation Forest anomaly detector
    - `autoencoder.pt` – autoencoder `state_dict` (reconstruction‑based anomaly support)
    - `gbm_risk_classifier.pkl` – Gradient Boosting classifier for risk buckets
    - `rf_shi_regressor.pkl` – Random Forest regressor for SHI
    - `scaler_ml.pkl` – scaler for ML risk features
    - `lstm_risk.pt` – LSTM `state_dict` for temporal risk / PoF
    - `model_meta.json` – schema + feature metadata (see below)

- **`ml/server.py`**  
  FastAPI inference server that loads the anomaly models and exposes:
  - `GET /health` – status + which model files exist
  - `POST /anomaly` – batch anomaly inference (HTTP)
  - `WS /ws/anomaly` – streaming anomaly inference (WebSocket)

- **`ml/mock/`**  
  Mock streaming and visualization built on the real fused data:
  - `simulator.py` – Monte Carlo‑style simulator sampling windows from `bridge_fused_with_anomalies.csv`
  - `stream_client.py` – WebSocket client that streams simulated batches into `/ws/anomaly` and logs results
  - `visualize.py` – plots strain and anomaly scores over time from the logged CSV

- **`ml/tests/tests_wavelets/`**  
  Unit tests validating the wavelet / structural response / reliability pipeline.

---

### 2. Data pipeline & feature engineering

The notebooks in `ml/data/` implement the full **data → features → models** pipeline.

- **Raw and fused data**
  - `sensor.csv` contains:
    - `Timestamp`, `Accel_X (m/s^2)`, `Accel_Y (m/s^2)`, `Accel_Z (m/s^2)`, `Strain (με)`, `Temp (°C)`, `Condition Label`
  - `bridge_fused.csv` and `bridge_fused_with_anomalies.csv` merge:
    - structural response metrics (e.g., `Strain_microstrain`, `Deflection_mm`, `Displacement_mm`)
    - vibration / modal features (e.g., `Vibration_ms2`, `Modal_Frequency_Hz`)
    - environmental and load features (e.g., `Temperature_C`, `Wind_Speed_ms`, `Vehicle_Load_tons`)
    - health and risk targets (`Structural_Health_Index_SHI`, `Probability_of_Failure_PoF`)

- **Anomaly feature vector**  
  The anomaly models operate on an 8‑dimensional feature vector defined in `ml/data/models/model_meta.json`:

  - `Vibration_ms2`  
  - `Strain_microstrain`  
  - `Deflection_mm`  
  - `Displacement_mm`  
  - `Modal_Frequency_Hz`  
  - `Temperature_C`  
  - `Wind_Speed_ms`  
  - `Crack_Propagation_mm`

  These columns are extracted from `bridge_fused_with_anomalies.csv` and fed to `scaler_anomaly.pkl` and `isolation_forest.pkl`.

- **Anomaly labels & scores**
  - `IF_label` / `IF_score` – Isolation Forest decision labels and scores
  - `AE_recon_error` – autoencoder reconstruction error per time step
  - `consensus_anomaly` – logical combination of Isolation Forest and AE (see `gallifrey_shm_analysis.ipynb` for exact logic)

- **Risk / SHI targets**
  - `Probability_of_Failure_PoF` – continuous PoF indicator
  - `Structural_Health_Index_SHI` – SHI (higher is healthier; notebooks invert where needed)
  - These are used for:
    - GBM classifier (risk buckets)
    - RF regressor (SHI)
    - LSTM temporal risk model

The main reference implementations of these steps live in:
- `ml/data/gallifrey_shm_analysis.ipynb` – full fusion + anomaly + risk pipeline  
- `ml/data/Risk_Prediction.ipynb` – risk/SHI modeling with the fused datasets

---

### 3. Models and training (as implemented in notebooks)

The notebooks train and export the following models:

- **Anomaly detection**
  - `StandardScaler` (`scaler_anomaly.pkl`)
  - `IsolationForest` (`isolation_forest.pkl`)
  - Autoencoder (`autoencoder.pt`):
    - Saved as a PyTorch `state_dict` (weights only) for reconstruction‑error based anomaly scoring.
    - Requires reconstructing the AE architecture to use at inference time.

- **Risk / SHI / PoF**
  - **GBM risk classifier** (`gbm_risk_classifier.pkl`):  
    - Gradient Boosting classifier over a feature subset of `bridge_fused_with_anomalies.csv`.
  - **RF SHI regressor** (`rf_shi_regressor.pkl`):  
    - Random Forest predicting `Structural_Health_Index_SHI`.
  - **Scalers for ML risk features** (`scaler_ml.pkl`).
  - **LSTM temporal risk model** (`lstm_risk.pt`):  
    - PyTorch model saved as `state_dict`, using windowed sequences (length given by `window_size_lstm` in `model_meta.json`).

Export logic (e.g. `joblib.dump`, `torch.save`) is visible in:
- `ml/data/Analysis.ipynb`
- `ml/data/gallifrey_shm_analysis.ipynb`
- `ml/data/Risk_Prediction.ipynb`

> **Note:** The current FastAPI server (`ml/server.py`) only uses `scaler_anomaly.pkl` and `isolation_forest.pkl` explicitly. Extending it to also serve the GBM/RF/LSTM models is a natural next step.

---

### 4. Inference server (FastAPI)

File: `ml/server.py`

- **Model loading**
  - Loads `scaler_anomaly.pkl` and `isolation_forest.pkl` via `joblib`.
  - Tries to load `autoencoder.pt`; if it is a full `nn.Module` object, it uses it to compute reconstruction errors.  
    If it is only a `state_dict` (current case), the AE is skipped and the server falls back to Isolation Forest only.

- **HTTP endpoint**
  - `POST /anomaly`  
    - Request body:
      - `samples`: 2D list `[ [f1, f2, ..., f8], ... ]` matching the 8 anomaly features in order.
    - Response:
      - `is_anomaly`: list of booleans
      - `isolation_forest_score`: list of decision scores
      - `reconstruction_error`: list of floats or `null` if AE is not available

- **WebSocket endpoint**
  - `WS /ws/anomaly`  
    - Client sends JSON messages like:
      - `{"samples": [[... 8 floats ...], [...]]}`
    - Server replies with the same `AnomalyResponse` structure as the HTTP endpoint for each message.

- **Health check**
  - `GET /health` returns:
    - `"status": "ok"` plus the existence flags for `scaler_anomaly.pkl`, `isolation_forest.pkl`, `autoencoder.pt`.

> See `ml/server.py` for the exact Pydantic schemas (`AnomalyRequest`, `AnomalyResponse`) and the `ModelBundle` implementation.

---

### 5. Mock streaming & visualization

The mock stack demonstrates **near‑real‑time** anomaly inference by streaming simulated telemetry into the server.

- **Simulation (`ml/mock/simulator.py`)**
  - Loads `bridge_fused_with_anomalies.csv`.
  - Builds an endless generator of `SensorSample` windows:
    - Random contiguous windows are sampled (Monte Carlo style).
    - Small Gaussian noise is added to mimic natural variability.
    - With some probability, strain/vibration magnitudes are boosted to simulate damage/anomalies.
  - Each sample carries:
    - `timestamp`
    - `features` (8‑dim anomaly feature vector)
    - `condition_label` (from `consensus_anomaly` or similar labels in the fused data).

- **Streaming client (`ml/mock/stream_client.py`)**
  - Connects to `ws://localhost:8000/ws/anomaly` (or `MOCK_SERVER_URL` in Docker).
  - Batches samples and sends them over the WebSocket.
  - Receives `AnomalyResponse` messages and logs them into `ml/mock/results/stream_results.csv` along with selected feature columns.

- **Visualization (`ml/mock/visualize.py`)**
  - Reads `stream_results.csv`.
  - Produces `ml/mock/figures/anomaly_timeseries.png`:
    - Top panel: strain (microstrain) vs time with anomaly points highlighted.
    - Middle: Isolation Forest score vs time.
    - Bottom: autoencoder reconstruction error vs time (if available).

---

### 6. Execution & workflows

#### Local (no Docker)

From `ml/`:

```bash
# Install dependencies
uv sync

# Run wavelet tests
uv run pytest ml/tests/tests_wavelets

# Start inference server
uv run uvicorn server:app --host 0.0.0.0 --port 8000

# In another terminal: run mock streamer
uv run python -m mock.stream_client

# Generate visualization
uv run python -m mock.visualize
```

The API docs will be available at `http://localhost:8000/docs`.

#### With Docker / Compose

See `infra/docker-compose.yml` at the repo root:

- `ml-api` – builds from `ml/Dockerfile`, exposes port `8000`.
- `ml-mock` – builds from `ml/mock/Dockerfile`, streams to `ml-api` using `MOCK_SERVER_URL=ws://ml-api:8000/ws/anomaly`.

From `infra/`:

```bash
docker compose up --build
```

---

### 7. Related work and inspiration (literature & OSS)

The Gallifrey stack is intentionally aligned with several research and open‑source efforts:

- **Wavelet‑based SHM & reliability**  
  Time‑frequency analysis and reliability ideas are conceptually aligned with:  
  *Wavelet Transform* in structural engineering:  
  `https://www.iitk.ac.in/nicee/wcee/article/1791.pdf`  
  (implemented here via PyWavelets in `ml/algos/wavelet_transform/`).

- **Graph / spatio‑temporal forecasting**  
  Future extensions for spatially distributed sensor networks can follow:  
  *Diffusion Convolutional Recurrent Neural Networks (DCRNN)* – `https://github.com/liyaguang/DCRNN/blob/master/README.md`  
  (not yet implemented, but consistent with the digital‑twin and time‑series framing used in `gallifrey_shm_analysis.ipynb`).

- **SSI‑based structural parameter identification**  
  Operational modal analysis / SSI (Stochastic Subspace Identification) ideas inform how modal features and SHI are reasoned about:  
  *SSI Method for Structural parameter identification* – `https://www.sciencedirect.com/science/article/abs/pii/S2352012425017229`  
  (current notebooks approximate this via time‑series / modal features, but do not implement full SSI).

- **Finite‑element modeling**  
  For richer digital‑twin finite‑element models, see **PyNite**:  
  `https://github.com/JWock82/PyNite`  
  (not used directly here, but compatible as an upstream source of synthetic responses feeding `bridge_fused.csv`).

- **CNN‑based damage detection from time series**  
  The current notebook stack focuses on tree‑based models + sequence models (LSTM). A natural future direction is CNN‑based time‑series damage detection, as in:  
  *CNN-Based Structural Damage Detection using Time‑Series Sensor Data* – `https://arxiv.org/pdf/2311.04252`  
  (no CNNs are implemented yet; would slot into the same fused feature/table structure).

- **Polymax PLSCF modal identification**  
  For more advanced modal parameter extraction (beyond the current FFT + wavelet + reliability modules), see:  
  *Polymax PLSCF* – `https://arxiv.org/pdf/2311.05770`  
  (not yet implemented; could provide more robust modal estimates feeding SHI/PoF models).

These references are kept here to document the conceptual “north star” for Gallifrey; the current repo implements the first practical slice (wavelet transforms, anomaly detection, fused risk models, and a live inference server).
