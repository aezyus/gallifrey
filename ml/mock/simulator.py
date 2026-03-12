from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator, List, Tuple

import numpy as np
import pandas as pd


DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# Features used to train the anomaly scaler / IsolationForest
ANOMALY_FEATURES: List[str] = [
    "Vibration_ms2",
    "Strain_microstrain",
    "Deflection_mm",
    "Displacement_mm",
    "Modal_Frequency_Hz",
    "Temperature_C",
    "Wind_Speed_ms",
    "Crack_Propagation_mm",
]


@dataclass
class SensorSample:
    timestamp: pd.Timestamp
    features: np.ndarray
    condition_label: int


def load_sensor_dataframe() -> pd.DataFrame:
    """
    Load the base dataset used for anomaly simulation.

    We use the engineered bridge_fused_with_anomalies.csv file, which
    contains the same feature set that was used to fit scaler_anomaly
    and isolation_forest.
    """
    path = DATA_DIR / "bridge_fused_with_anomalies.csv"
    df = pd.read_csv(path)
    df["Timestamp"] = pd.to_datetime(df["Timestamp"])
    return df


def extract_feature_matrix(df: pd.DataFrame) -> Tuple[np.ndarray, List[str], np.ndarray]:
    """
    Extract feature matrix and labels from the anomaly dataframe.

    Returns:
        X: np.ndarray of shape (n_samples, n_features)
        feature_names: list of column names used as features
        y: np.ndarray of consensus anomaly labels (0/1)
    """
    feature_cols = ANOMALY_FEATURES
    X = df[feature_cols].to_numpy(dtype=np.float32)
    # Use consensus_anomaly (0/1) as a reference label for visualization
    y = df["consensus_anomaly"].astype(int).to_numpy()
    return X, feature_cols, y


def monte_carlo_window_indices(
    n_samples: int, window_size: int, rng: np.random.Generator
) -> Iterator[int]:
    """
    Yield random starting indices for windows within the dataset.
    """
    if window_size >= n_samples:
        yield 0
        return
    max_start = n_samples - window_size
    while True:
        yield rng.integers(0, max_start + 1)


def simulate_sensor_stream(
    df: pd.DataFrame,
    window_size: int = 64,
    noise_scale: float = 0.02,
    anomaly_boost_prob: float = 0.1,
    seed: int | None = None,
) -> Iterable[SensorSample]:
    """
    Monte Carlo-style simulator that generates an endless stream of SensorSample
    objects based on sliding windows from the historical sensor data.

    - Randomly samples contiguous windows from the real dataset.
    - Adds small Gaussian noise to mimic natural variability.
    - With some probability, amplifies strain/acceleration to mimic anomalies.
    """
    rng = np.random.default_rng(seed)
    X, feature_cols, y = extract_feature_matrix(df)
    n_samples = X.shape[0]

    for start_idx in monte_carlo_window_indices(n_samples, window_size, rng):
        end_idx = start_idx + window_size
        window = X[start_idx:end_idx].copy()
        labels = y[start_idx:end_idx]
        timestamps = df["Timestamp"].iloc[start_idx:end_idx].to_numpy()

        # Add small Gaussian noise
        noise = rng.normal(scale=noise_scale, size=window.shape).astype(np.float32)
        window += noise

        # Occasionally boost some windows to create synthetic anomalies
        if rng.random() < anomaly_boost_prob:
            boost_mask = rng.random(size=window.shape[0]) < 0.3
            # Amplify strain and acceleration for selected timesteps
            for i, boosted in enumerate(boost_mask):
                if not boosted:
                    continue
                # indices: 0,1,2 = accel; 3 = strain
                window[i, 0:4] *= rng.uniform(1.5, 2.5)

        for ts, features, label in zip(timestamps, window, labels, strict=False):
            yield SensorSample(timestamp=pd.Timestamp(ts), features=features, condition_label=int(label))


def batched(
    stream: Iterable[SensorSample], batch_size: int
) -> Iterable[List[SensorSample]]:
    """
    Group a sensor sample stream into batches of a given size.
    """
    batch: List[SensorSample] = []
    for sample in stream:
        batch.append(sample)
        if len(batch) >= batch_size:
            yield batch
            batch = []
    if batch:
        yield batch


