from pathlib import Path
from typing import List, Optional

import numpy as np
import torch
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


class ModelBundle:
    def __init__(self) -> None:
        self.scaler = None
        self.isolation_forest = None
        self.autoencoder = None
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
        # If a full model was saved, it will be a nn.Module and have eval().
        # If only a state_dict was saved (OrderedDict), we currently skip it
        # because the architecture definition is not available here.
        if hasattr(obj, "eval"):
            obj.eval()
            return obj
        # Unsupported format (likely state_dict); ignore autoencoder for now.
        return None

    def _load_models(self) -> None:
        self.scaler = self._load_pickle("scaler_anomaly.pkl")
        self.isolation_forest = self._load_pickle("isolation_forest.pkl")
        self.autoencoder = self._load_torch_model("autoencoder.pt")

        if self.scaler is None or self.isolation_forest is None:
            raise RuntimeError(
                "Required anomaly models not found in ml/data/models "
                "(expected scaler_anomaly.pkl and isolation_forest.pkl)."
            )

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
        "scaler": (MODELS_DIR / "scaler_anomaly.pkl").exists(),
        "isolation_forest": (MODELS_DIR / "isolation_forest.pkl").exists(),
        "autoencoder": (MODELS_DIR / "autoencoder.pt").exists(),
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

