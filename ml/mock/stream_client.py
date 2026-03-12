from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd
import websockets

from .simulator import (
    ANOMALY_FEATURES,
    SensorSample,
    batched,
    load_sensor_dataframe,
    simulate_sensor_stream,
)


RESULTS_DIR = Path(__file__).resolve().parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


async def stream_batches(
    server_ws_url: str | None = None,
    batch_size: int = 32,
    max_batches: int | None = 100,
) -> Path:
    """
    Connect to the inference server via WebSocket, stream simulated batches,
    and log responses to a CSV file for later visualization.
    """
    import os

    if server_ws_url is None:
        server_ws_url = os.getenv("MOCK_SERVER_URL", "ws://localhost:8000/ws/anomaly")

    df = load_sensor_dataframe()
    stream = simulate_sensor_stream(df, seed=42)
    batched_stream = batched(stream, batch_size=batch_size)

    records: List[dict] = []

    async with websockets.connect(server_ws_url) as ws:
        batch_count = 0
        async for _ in _async_iter(batched_stream):
            batch = next(batched_stream)
            batch_count += 1

            samples = [sample.features.tolist() for sample in batch]
            timestamps = [sample.timestamp for sample in batch]
            condition_labels = [sample.condition_label for sample in batch]

            await ws.send(json.dumps({"samples": samples}))
            raw_response = await ws.recv()
            response = json.loads(raw_response)

            if "error" in response:
                print(f"Inference error from server: {response['error']}")
                continue

            is_anomaly = response.get("is_anomaly", [])
            scores = response.get("isolation_forest_score", [])
            recon_errors = response.get("reconstruction_error", [])

            for ts, feats, label, anomaly_flag, score, recon in zip(
                timestamps,
                samples,
                condition_labels,
                is_anomaly,
                scores,
                recon_errors or [None] * len(scores),
                strict=False,
            ):
                # Map feature vector back to a few interpretable fields
                feat_map = {name: value for name, value in zip(ANOMALY_FEATURES, feats, strict=False)}

                records.append(
                    {
                        "timestamp": ts,
                        "vibration_ms2": feat_map.get("Vibration_ms2"),
                        "strain_microstrain": feat_map.get("Strain_microstrain"),
                        "deflection_mm": feat_map.get("Deflection_mm"),
                        "displacement_mm": feat_map.get("Displacement_mm"),
                        "temperature_c": feat_map.get("Temperature_C"),
                        "wind_speed_ms": feat_map.get("Wind_Speed_ms"),
                        "condition_label": label,
                        "is_anomaly": bool(anomaly_flag),
                        "if_score": float(score),
                        "recon_error": float(recon) if recon is not None else None,
                    }
                )

            if max_batches is not None and batch_count >= max_batches:
                break

    results_path = RESULTS_DIR / "stream_results.csv"
    pd.DataFrame.from_records(records).to_csv(results_path, index=False)
    print(f"Saved streaming results to {results_path}")
    return results_path


async def _async_iter(iterable):
    """
    Tiny helper to allow using 'async for' over a sync iterable, with
    cooperative yielding to the event loop.
    """
    for item in iterable:
        yield item
        await asyncio.sleep(0)


def main() -> None:
    asyncio.run(stream_batches())


if __name__ == "__main__":
    main()

