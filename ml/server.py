from pathlib import Path
from typing import Dict, List, Optional
from contextlib import contextmanager
import os

import json
import time

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, validator

import pickle
import joblib
import psycopg
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest


MODELS_DIR = Path(__file__).resolve().parent / "data" / "models"
DB_DSN = os.getenv(
    "GALLIFREY_DB_DSN",
    "postgresql://postgres:postgres@localhost:5432/infra_monitoring",
)


class AnomalyRequest(BaseModel):
    samples: List[List[float]] = Field(
        ..., description="2D list of shape (n_samples, n_features)"
    )

    @validator("samples")
    def validate_non_empty(cls, v: List[List[float]]) -> List[List[float]]:
        if not v:
            raise ValueError("samples must contain at least one sample")
        n_features = len(v[0])
        if n_features == 0:
            raise ValueError("samples must have at least one feature")
        for row in v:
            if len(row) != n_features:
                raise ValueError("all samples must have the same number of features")
        return v


class AnomalyResponse(BaseModel):
    is_anomaly: List[bool]
    isolation_forest_score: List[float]
    reconstruction_error: Optional[List[float]] = None


class RiskSample(BaseModel):
    """
    One snapshot of fused features for risk / SHI models.

    The keys of the `features` dict should match the names in
    model_meta.json -> feature_columns.
    """

    features: Dict[str, float] = Field(
        ..., description="Feature mapping keyed by model_meta.feature_columns"
    )


class RiskRequest(BaseModel):
    samples: List[RiskSample]


class RiskResponse(BaseModel):
    gbm_risk_label: List[int]
    gbm_risk_score: List[float]
    shi_pred: List[float]


class RiskSequenceRequest(BaseModel):
    """
    Time-ordered sequence of fused feature snapshots for LSTM PoF prediction.
    Length should match window_size_lstm from model_meta.json.
    """

    samples: List[RiskSample]


class RiskSequenceResponse(BaseModel):
    pof: float


class StructureCreateRequest(BaseModel):
    name: str
    type: str
    location: str
    notes: Optional[str] = None


class StructureResponse(BaseModel):
    id: int
    name: str
    type: str
    location: str
    notes: Optional[str] = None
    created_at: str


class SensorCreateRequest(BaseModel):
    name: str
    type: str
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    stream_url: Optional[str] = "mock://sensor-feed"
    connected: bool = True


class SensorResponse(BaseModel):
    id: int
    structure_id: int
    name: str
    type: str
    x: float
    y: float
    z: float
    stream_url: Optional[str] = None
    connected: bool
    created_at: str


class LSTMRiskPredictor(nn.Module):
    """
    LSTM architecture copied from Risk_Prediction.ipynb / gallifrey_shm_analysis.ipynb.
    """

    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 2, dropout: float = 0.2) -> None:
        super().__init__()
        self.lstm = nn.LSTM(
            input_dim,
            hidden_dim,
            num_layers,
            batch_first=True,
            dropout=dropout,
        )
        self.head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 1),
            nn.Sigmoid(),  # output PoF in [0,1]
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :]).squeeze(-1)


class ModelBundle:
    def __init__(self) -> None:
        # Anomaly models
        self.scaler = None
        self.isolation_forest = None
        self.autoencoder = None

        # Risk / SHI models
        self.scaler_ml = None
        self.gbm_risk = None
        self.rf_shi = None
        self.lstm_risk = None
        self.feature_columns: List[str] = []
        self.window_size_lstm: int = 24

        self._load_models()

    def _load_pickle(self, filename: str):
        path = MODELS_DIR / filename
        if not path.exists():
            return None
        # Many sklearn objects are saved via joblib; prefer that and fall back to pickle.
        try:
            return joblib.load(path)
        except Exception:
            with path.open("rb") as f:
                return pickle.load(f)

    def _load_torch_model(self, filename: str):
        path = MODELS_DIR / filename
        if not path.exists():
            return None
        device = torch.device("cpu")
        obj = torch.load(path, map_location=device)
        # If a full model object was saved, just return it.
        if hasattr(obj, "eval"):
            obj.eval()
            return obj
        # Otherwise assume it's a state_dict for the StructuralAutoencoder
        # architecture from Analysis.ipynb / gallifrey_shm_analysis.ipynb.
        if isinstance(obj, dict):
            # Infer input dimension from the state_dict of the first linear layer.
            first_weight = None
            for k, v in obj.items():
                if k.endswith(".weight") and v.ndim == 2:
                    first_weight = v
                    break
            if first_weight is None:
                return None
            input_dim = first_weight.shape[1]

            class StructuralAutoencoder(nn.Module):
                def __init__(self, input_dim: int, latent_dim: int = 8) -> None:
                    super().__init__()
                    self.encoder = nn.Sequential(
                        nn.Linear(input_dim, 32),
                        nn.ReLU(),
                        nn.Dropout(0.1),
                        nn.Linear(32, 16),
                        nn.ReLU(),
                        nn.Linear(16, latent_dim),
                    )
                    self.decoder = nn.Sequential(
                        nn.Linear(latent_dim, 16),
                        nn.ReLU(),
                        nn.Linear(16, 32),
                        nn.ReLU(),
                        nn.Dropout(0.1),
                        nn.Linear(32, input_dim),
                    )

                def forward(self, x: torch.Tensor) -> torch.Tensor:
                    z = self.encoder(x)
                    return self.decoder(z)

            model = StructuralAutoencoder(input_dim=input_dim, latent_dim=8)
            model.load_state_dict(obj)
            model.eval()
            return model

        # Unsupported format; ignore autoencoder.
        return None

    def _load_models(self) -> None:
        # Metadata (feature columns, window sizes, weights, etc.)
        meta_path = MODELS_DIR / "model_meta.json"
        if meta_path.exists():
            with meta_path.open("r") as f:
                meta = json.load(f)
            self.feature_columns = meta.get("feature_columns", []) or []
            self.window_size_lstm = int(meta.get("window_size_lstm", 24))

        # Anomaly models
        self.scaler = self._load_pickle("scaler_anomaly.pkl")
        self.isolation_forest = self._load_pickle("isolation_forest.pkl")
        self.autoencoder = self._load_torch_model("autoencoder.pt")

        if self.scaler is None or self.isolation_forest is None:
            raise RuntimeError(
                "Required anomaly models not found in ml/data/models "
                "(expected scaler_anomaly.pkl and isolation_forest.pkl)."
            )

        # Risk / SHI models (optional, but recommended)
        self.scaler_ml = self._load_pickle("scaler_ml.pkl")
        self.gbm_risk = self._load_pickle("gbm_risk_classifier.pkl")
        self.rf_shi = self._load_pickle("rf_shi_regressor.pkl")

        lstm_path = MODELS_DIR / "lstm_risk.pt"
        if lstm_path.exists() and self.feature_columns:
            try:
                model = LSTMRiskPredictor(input_dim=len(self.feature_columns))
                state_dict = torch.load(lstm_path, map_location=torch.device("cpu"))
                model.load_state_dict(state_dict)
                model.eval()
                self.lstm_risk = model
            except Exception:
                # If LSTM cannot be loaded, keep it disabled without breaking other models.
                self.lstm_risk = None

    def predict(self, X: np.ndarray) -> AnomalyResponse:
        # Scale features
        X_scaled = self.scaler.transform(X) if self.scaler is not None else X

        # Isolation Forest anomaly labels and scores
        iso = self.isolation_forest
        labels = iso.predict(X_scaled)
        # sklearn IsolationForest: predict returns 1 for normal, -1 for anomaly
        is_anomaly = labels == -1
        # Use decision_function (higher is more normal, lower is more anomalous)
        scores = iso.decision_function(X_scaled).tolist()

        reconstruction_error: Optional[List[float]] = None
        if self.autoencoder is not None:
            with torch.no_grad():
                tensor = torch.from_numpy(X_scaled.astype(np.float32))
                reconstructed = self.autoencoder(tensor)
                # Mean squared error per sample
                errors = torch.mean(
                    (tensor - reconstructed) ** 2, dim=1
                ).cpu().numpy()
                reconstruction_error = errors.tolist()

        return AnomalyResponse(
            is_anomaly=is_anomaly.tolist(),
            isolation_forest_score=scores,
            reconstruction_error=reconstruction_error,
        )

    def _ensure_risk_models(self) -> None:
        if self.scaler_ml is None or self.gbm_risk is None or self.rf_shi is None:
            raise RuntimeError(
                "Risk models not fully available. Expected scaler_ml.pkl, "
                "gbm_risk_classifier.pkl, and rf_shi_regressor.pkl in ml/data/models."
            )

    def predict_risk(self, records: List[Dict[str, float]]) -> RiskResponse:
        """
        Predict risk class/probability and SHI from fused feature records.
        """
        self._ensure_risk_models()
        if not self.feature_columns:
            raise RuntimeError("Model metadata (feature_columns) not found.")

        # Build a DataFrame to preserve feature names for sklearn scalers/models.
        df = pd.DataFrame(records)
        df = df.reindex(columns=self.feature_columns).fillna(0.0)
        X_scaled = self.scaler_ml.transform(df)

        # GBM risk classifier
        gbm = self.gbm_risk
        if hasattr(gbm, "predict_proba"):
            proba = gbm.predict_proba(X_scaled)[:, 1].tolist()
        else:
            # Fallback: use decision_function or raw predictions
            proba = gbm.decision_function(X_scaled).tolist()  # type: ignore[assignment]
        labels = gbm.predict(X_scaled).tolist()

        # RF SHI regressor
        shi_vals = self.rf_shi.predict(X_scaled).tolist()

        return RiskResponse(
            gbm_risk_label=labels,
            gbm_risk_score=proba,
            shi_pred=shi_vals,
        )

    def predict_lstm_sequence(self, records: List[Dict[str, float]]) -> float:
        """
        Predict PoF using the LSTM over a single time-ordered sequence.
        """
        if self.lstm_risk is None:
            raise RuntimeError("LSTM risk model not available.")
        if not self.feature_columns:
            raise RuntimeError("Model metadata (feature_columns) not found.")
        if len(records) != self.window_size_lstm:
            raise RuntimeError(
                f"LSTM expects a sequence of length {self.window_size_lstm}, "
                f"got {len(records)}."
            )

        X = np.array(
            [[record.get(col, 0.0) for col in self.feature_columns] for record in records],
            dtype=np.float32,
        )
        X_scaled = self.scaler_ml.transform(X)
        seq = torch.from_numpy(X_scaled.astype(np.float32)).unsqueeze(0)  # (1, T, F)

        with torch.no_grad():
            pof = float(self.lstm_risk(seq).item())
        return pof


app = FastAPI(
    title="Gallifrey Inference Server",
    description=(
        "Inference API for Gallifrey anomaly detection models. "
        "Send raw feature vectors; server applies the saved scaler and IsolationForest "
        "and, if available, the autoencoder for reconstruction-error based scoring."
    ),
    version="0.1.0",
)

# CORS for frontend (e.g. Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
from prometheus_client import REGISTRY

def get_metric(metric_type, name, description, labels):
    # Check if the metric is already in the registry to avoid re-registration errors during reload
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    return metric_type(name, description, labels)

# Initialize metrics safely
REQUEST_COUNT = get_metric(Counter, "gallifrey_requests_total", "Request count", ["endpoint"])
REQUEST_LATENCY = get_metric(Histogram, "gallifrey_request_latency_seconds", "Request latency in seconds", ["endpoint"])
STRUCTURES_DB_READY = False


@contextmanager
def db_conn():
    conn = psycopg.connect(DB_DSN)
    try:
        yield conn
    finally:
        conn.close()


def init_structures_schema() -> None:
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS structures (
                    id BIGSERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    location TEXT NOT NULL,
                    notes TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS sensors (
                    id BIGSERIAL PRIMARY KEY,
                    structure_id BIGINT NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    x DOUBLE PRECISION NOT NULL DEFAULT 0,
                    y DOUBLE PRECISION NOT NULL DEFAULT 0,
                    z DOUBLE PRECISION NOT NULL DEFAULT 0,
                    stream_url TEXT,
                    connected BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
        conn.commit()


@app.on_event("startup")
def load_models_on_startup() -> None:
    global STRUCTURES_DB_READY
    global model_bundle
    try:
        model_bundle = ModelBundle()
    except Exception as exc:  # pragma: no cover - defensive
        # If models fail to load, make it obvious at startup
        raise RuntimeError(f"Failed to load models: {exc}") from exc

    try:
        init_structures_schema()
        STRUCTURES_DB_READY = True
    except Exception:
        STRUCTURES_DB_READY = False


@app.get("/health", summary="Health check")
def health() -> dict:
    exists = {
        "scaler_anomaly": (MODELS_DIR / "scaler_anomaly.pkl").exists(),
        "isolation_forest": (MODELS_DIR / "isolation_forest.pkl").exists(),
        "autoencoder": (MODELS_DIR / "autoencoder.pt").exists(),
        "scaler_ml": (MODELS_DIR / "scaler_ml.pkl").exists(),
        "gbm_risk_classifier": (MODELS_DIR / "gbm_risk_classifier.pkl").exists(),
        "rf_shi_regressor": (MODELS_DIR / "rf_shi_regressor.pkl").exists(),
        "lstm_risk": (MODELS_DIR / "lstm_risk.pt").exists(),
        "model_meta": (MODELS_DIR / "model_meta.json").exists(),
    }
    return {"status": "ok", "models": exists, "structures_db_ready": STRUCTURES_DB_READY}


@app.get("/metadata", summary="Model and feature metadata")
def metadata() -> dict:
    """
    Expose model_meta.json and basic model availability for frontends.
    """
    if "model_bundle" not in globals():
        raise HTTPException(status_code=500, detail={"error": {"code": "MODELS_NOT_LOADED", "message": "Models not loaded"}})

    meta_path = MODELS_DIR / "model_meta.json"
    meta = {}
    if meta_path.exists():
        with meta_path.open("r") as f:
            meta = json.load(f)

    exists = {
        "scaler_anomaly": (MODELS_DIR / "scaler_anomaly.pkl").exists(),
        "isolation_forest": (MODELS_DIR / "isolation_forest.pkl").exists(),
        "autoencoder": (MODELS_DIR / "autoencoder.pt").exists(),
        "scaler_ml": (MODELS_DIR / "scaler_ml.pkl").exists(),
        "gbm_risk_classifier": (MODELS_DIR / "gbm_risk_classifier.pkl").exists(),
        "rf_shi_regressor": (MODELS_DIR / "rf_shi_regressor.pkl").exists(),
        "lstm_risk": (MODELS_DIR / "lstm_risk.pt").exists(),
    }

    return {
        "meta": meta,
        "models": exists,
        "window_size_lstm": getattr(model_bundle, "window_size_lstm", None),
        "feature_columns": getattr(model_bundle, "feature_columns", []),
    }


def ensure_structures_db_ready() -> None:
    if not STRUCTURES_DB_READY:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "STRUCTURES_DB_UNAVAILABLE",
                    "message": "Structures DB is unavailable. Ensure TimescaleDB/Postgres is running.",
                }
            },
        )


@app.get("/structures", response_model=List[StructureResponse], summary="List structures")
def list_structures() -> List[StructureResponse]:
    ensure_structures_db_ready()
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, type, location, notes, created_at
                FROM structures
                ORDER BY created_at DESC;
                """
            )
            rows = cur.fetchall()

    return [
        StructureResponse(
            id=row[0],
            name=row[1],
            type=row[2],
            location=row[3],
            notes=row[4],
            created_at=row[5].isoformat(),
        )
        for row in rows
    ]


@app.post("/structures", response_model=StructureResponse, summary="Create structure")
def create_structure(payload: StructureCreateRequest) -> StructureResponse:
    ensure_structures_db_ready()
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO structures (name, type, location, notes)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, type, location, notes, created_at;
                """,
                (payload.name, payload.type, payload.location, payload.notes),
            )
            row = cur.fetchone()
        conn.commit()

    return StructureResponse(
        id=row[0],
        name=row[1],
        type=row[2],
        location=row[3],
        notes=row[4],
        created_at=row[5].isoformat(),
    )


@app.get("/structures/{structure_id}", response_model=StructureResponse, summary="Get structure")
def get_structure(structure_id: int) -> StructureResponse:
    ensure_structures_db_ready()
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, type, location, notes, created_at
                FROM structures
                WHERE id = %s;
                """,
                (structure_id,),
            )
            row = cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail={"error": {"code": "STRUCTURE_NOT_FOUND", "message": "Structure not found"}})

    return StructureResponse(
        id=row[0],
        name=row[1],
        type=row[2],
        location=row[3],
        notes=row[4],
        created_at=row[5].isoformat(),
    )


@app.get(
    "/structures/{structure_id}/sensors",
    response_model=List[SensorResponse],
    summary="List structure sensors",
)
def list_structure_sensors(structure_id: int) -> List[SensorResponse]:
    ensure_structures_db_ready()
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM structures WHERE id = %s;", (structure_id,))
            exists = cur.fetchone()
            if not exists:
                raise HTTPException(status_code=404, detail={"error": {"code": "STRUCTURE_NOT_FOUND", "message": "Structure not found"}})

            cur.execute(
                """
                SELECT id, structure_id, name, type, x, y, z, stream_url, connected, created_at
                FROM sensors
                WHERE structure_id = %s
                ORDER BY created_at ASC;
                """,
                (structure_id,),
            )
            rows = cur.fetchall()

    return [
        SensorResponse(
            id=row[0],
            structure_id=row[1],
            name=row[2],
            type=row[3],
            x=row[4],
            y=row[5],
            z=row[6],
            stream_url=row[7],
            connected=row[8],
            created_at=row[9].isoformat(),
        )
        for row in rows
    ]


@app.post(
    "/structures/{structure_id}/sensors",
    response_model=SensorResponse,
    summary="Add sensor to structure",
)
def add_sensor(structure_id: int, payload: SensorCreateRequest) -> SensorResponse:
    ensure_structures_db_ready()
    with db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM structures WHERE id = %s;", (structure_id,))
            exists = cur.fetchone()
            if not exists:
                raise HTTPException(status_code=404, detail={"error": {"code": "STRUCTURE_NOT_FOUND", "message": "Structure not found"}})

            cur.execute(
                """
                INSERT INTO sensors (structure_id, name, type, x, y, z, stream_url, connected)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, structure_id, name, type, x, y, z, stream_url, connected, created_at;
                """,
                (
                    structure_id,
                    payload.name,
                    payload.type,
                    payload.x,
                    payload.y,
                    payload.z,
                    payload.stream_url,
                    payload.connected,
                ),
            )
            row = cur.fetchone()
        conn.commit()

    return SensorResponse(
        id=row[0],
        structure_id=row[1],
        name=row[2],
        type=row[3],
        x=row[4],
        y=row[5],
        z=row[6],
        stream_url=row[7],
        connected=row[8],
        created_at=row[9].isoformat(),
    )


@app.get("/metrics")
def metrics() -> Response:
    """
    Prometheus metrics endpoint.
    """
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/anomaly", response_model=AnomalyResponse, summary="Anomaly inference")
def anomaly_inference(request: AnomalyRequest) -> AnomalyResponse:
    start = time.perf_counter()
    REQUEST_COUNT.labels("anomaly").inc()
    if "model_bundle" not in globals():
        raise HTTPException(status_code=500, detail="Models not loaded")

    X = np.array(request.samples, dtype=np.float32)
    try:
        response = model_bundle.predict(X)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "ANOMALY_INFERENCE_FAILED", "message": str(exc)}},
        ) from exc
    finally:
        REQUEST_LATENCY.labels("anomaly").observe(time.perf_counter() - start)
    return response


@app.post("/risk", response_model=RiskResponse, summary="Risk/SHI inference (GBM + RF)")
def risk_inference(request: RiskRequest) -> RiskResponse:
    """
    Risk and SHI inference using GBM classifier + RF regressor.

    Each sample should provide a `features` mapping keyed by the names in
    model_meta.json -> feature_columns. Missing keys default to 0.0.
    """
    if "model_bundle" not in globals():
        raise HTTPException(status_code=500, detail="Models not loaded")

    start = time.perf_counter()
    REQUEST_COUNT.labels("risk").inc()

    records = [sample.features for sample in request.samples]
    try:
        response = model_bundle.predict_risk(records)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "RISK_INFERENCE_FAILED", "message": str(exc)}},
        ) from exc
    finally:
        REQUEST_LATENCY.labels("risk").observe(time.perf_counter() - start)
    return response


@app.post(
    "/risk/sequence",
    response_model=RiskSequenceResponse,
    summary="Temporal PoF inference (LSTM)",
)
def risk_sequence_inference(request: RiskSequenceRequest) -> RiskSequenceResponse:
    """
    Temporal PoF inference using the LSTM risk model.

    The sequence length must match window_size_lstm from model_meta.json
    (see /health for the configured value).
    """
    if "model_bundle" not in globals():
        raise HTTPException(status_code=500, detail="Models not loaded")

    start = time.perf_counter()
    REQUEST_COUNT.labels("risk_sequence").inc()

    records = [sample.features for sample in request.samples]
    try:
        pof = model_bundle.predict_lstm_sequence(records)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail={
                "error": {"code": "RISK_SEQUENCE_INFERENCE_FAILED", "message": str(exc)}
            },
        ) from exc
    finally:
        REQUEST_LATENCY.labels("risk_sequence").observe(time.perf_counter() - start)
    return RiskSequenceResponse(pof=pof)


@app.websocket("/ws/anomaly")
async def anomaly_websocket(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for streaming anomaly inference.

    Protocol:
      - Client sends JSON messages of the form:
          {"samples": [[...], [...], ...]}
      - Server responds with JSON-encoded AnomalyResponse for each message.
    """
    await websocket.accept()
    if "model_bundle" not in globals():
        await websocket.close(code=1011)
        return

    try:
        while True:
            data = await websocket.receive_json()
            try:
                request = AnomalyRequest(**data)
                X = np.array(request.samples, dtype=np.float32)
                response = model_bundle.predict(X)
                await websocket.send_json(response.model_dump())
            except Exception as exc:
                await websocket.send_json({"error": f"Inference failed: {exc}"})
    except WebSocketDisconnect:
        # Client disconnected; just exit the loop
        return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

