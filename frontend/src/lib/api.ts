export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE_URL = API_BASE_URL.replace("http", "ws");

export interface AnomalyResponse {
  is_anomaly: boolean[];
  isolation_forest_score: number[];
  reconstruction_error?: number[];
}

export interface RiskResponse {
  gbm_risk_label: number[];
  gbm_risk_score: number[];
  shi_pred: number[];
}

export const gallifreyApi = {
  getHealth: async () => {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.json();
  },

  getMetadata: async () => {
    const res = await fetch(`${API_BASE_URL}/metadata`);
    return res.json();
  },

  predictAnomaly: async (samples: number[][]) => {
    const res = await fetch(`${API_BASE_URL}/anomaly`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples }),
    });
    return res.json() as Promise<AnomalyResponse>;
  },

  predictRisk: async (features: Record<string, number>[]) => {
    const res = await fetch(`${API_BASE_URL}/risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples: features.map(f => ({ features: f })) }),
    });
    return res.json() as Promise<RiskResponse>;
  },
};
