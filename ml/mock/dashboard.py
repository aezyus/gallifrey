from __future__ import annotations

from pathlib import Path
import sys

import asyncio
import time

import pandas as pd
import streamlit as st

# Ensure the ml package root is on sys.path so we can import mock.stream_client
ML_ROOT = Path(__file__).resolve().parents[1]
if str(ML_ROOT) not in sys.path:
    sys.path.append(str(ML_ROOT))

from mock.stream_client import stream_batches, RESULTS_DIR


FIGURES_DIR = Path(__file__).resolve().parent / "figures"


def load_results() -> pd.DataFrame | None:
    path = RESULTS_DIR / "stream_results.csv"
    if not path.exists():
        return None
    df = pd.read_csv(path, parse_dates=["timestamp"])
    df = df.sort_values("timestamp")
    return df


def main() -> None:
    st.set_page_config(page_title="Gallifrey SHM - Mock Stream", layout="wide")
    st.title("Gallifrey SHM – Live Mock Stream")
    st.markdown(
        """
        This dashboard shows a **mock live stream** of fused bridge telemetry
        being scored by the Gallifrey inference server.

        - The mock client sends Monte Carlo-simulated windows from
          `bridge_fused_with_anomalies.csv` to `/ws/anomaly`.
        - Results are logged to `mock/results/stream_results.csv` and
          visualized here as they arrive.
        """
    )

    col_left, col_right = st.columns([1, 2], gap="large")

    with col_left:
        st.subheader("Controls")
        max_batches = st.slider("Batches to stream", min_value=10, max_value=500, value=100, step=10)

        if st.button("Start streaming", type="primary"):
            with st.spinner("Streaming from mock sensors and scoring anomalies..."):
                # Run the asynchronous streamer in this interaction
                asyncio.run(stream_batches(max_batches=max_batches))
                time.sleep(0.5)
            st.success("Streaming run finished. Charts updated below.")

        st.info(
            "Ensure the FastAPI server is running on `http://localhost:8000` "
            "before starting the mock stream."
        )

    with col_right:
        st.subheader("Live anomaly view")

        df = load_results()
        if df is None or df.empty:
            st.warning(
                "No streaming results found yet. Click **Start streaming** on the left "
                "to generate a run."
            )
            return

        # Basic filters
        latest_n = st.selectbox(
            "Show last N samples",
            options=[200, 500, 1000, 2000, len(df)],
            index=2,
            format_func=lambda x: f"{x} (all)" if x == len(df) else str(x),
        )
        df_view = df.tail(latest_n)

        tab1, tab2, tab3, tab4 = st.tabs(
            ["Strain + anomalies", "IF score", "Reconstruction error", "SHI & risk"]
        )

        with tab1:
            st.line_chart(
                df_view.set_index("timestamp")[["strain_microstrain"]],
                height=300,
            )
            # Overlay anomalies as a second chart (approximation)
            if "is_anomaly" in df_view.columns:
                anom = df_view[df_view["is_anomaly"]]
                if not anom.empty:
                    st.scatter_chart(
                        anom.set_index("timestamp")[["strain_microstrain"]],
                        height=300,
                    )

        with tab2:
            st.line_chart(
                df_view.set_index("timestamp")[["if_score"]],
                height=300,
            )

        with tab3:
            if "recon_error" in df_view.columns and df_view["recon_error"].notna().any():
                st.line_chart(
                    df_view.set_index("timestamp")[["recon_error"]],
                    height=300,
                )
            else:
                st.info("No reconstruction error values available from the current model run.")

        with tab4:
            cols = st.columns(2)
            with cols[0]:
                if "shi_pred" in df_view.columns and df_view["shi_pred"].notna().any():
                    st.subheader("Structural Health Index (SHI)")
                    st.line_chart(
                        df_view.set_index("timestamp")[["shi_pred"]],
                        height=300,
                    )
                else:
                    st.info("No SHI predictions available in the current stream.")
            with cols[1]:
                if "gbm_risk_score" in df_view.columns and df_view["gbm_risk_score"].notna().any():
                    st.subheader("Risk score (GBM)")
                    st.line_chart(
                        df_view.set_index("timestamp")[["gbm_risk_score"]],
                        height=300,
                    )
                else:
                    st.info("No risk scores available in the current stream.")


if __name__ == "__main__":
    main()

