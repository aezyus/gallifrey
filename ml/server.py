from pathlib import Path
from typing import Dict, List, Optional

import json
import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, validator

import pickle
import joblib


MODELS_DIR = Path(__file__).resolve().parent / "data" / "models"


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

        X = np.array(
            [[record.get(col, 0.0) for col in self.feature_columns] for record in records],
            dtype=np.float32,
        )
        X_scaled = self.scaler_ml.transform(X)

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


@app.on_event("startup")
def load_models_on_startup() -> None:
    global model_bundle
    try:
        model_bundle = ModelBundle()
    except Exception as exc:  # pragma: no cover - defensive
        # If models fail to load, make it obvious at startup
        raise RuntimeError(f"Failed to load models: {exc}") from exc


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
    return {"status": "ok", "models": exists}


@app.post("/anomaly", response_model=AnomalyResponse, summary="Anomaly inference")
def anomaly_inference(request: AnomalyRequest) -> AnomalyResponse:
    if "model_bundle" not in globals():
        raise HTTPException(status_code=500, detail="Models not loaded")

    X = np.array(request.samples, dtype=np.float32)
    try:
        return model_bundle.predict(X)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc


@app.post("/risk", response_model=RiskResponse, summary="Risk/SHI inference (GBM + RF)")
def risk_inference(request: RiskRequest) -> RiskResponse:
    """
    Risk and SHI inference using GBM classifier + RF regressor.

    Each sample should provide a `features` mapping keyed by the names in
    model_meta.json -> feature_columns. Missing keys default to 0.0.
    """
    if "model_bundle" not in globals():
        raise HTTPException(status_code=500, detail="Models not loaded")

    records = [sample.features for sample in request.samples]
    try:
        return model_bundle.predict_risk(records)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Risk inference failed: {exc}") from exc


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

    records = [sample.features for sample in request.samples]
    try:
        pof = model_bundle.predict_lstm_sequence(records)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LSTM risk inference failed: {exc}") from exc
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

