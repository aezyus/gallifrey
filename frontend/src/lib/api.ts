export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE_URL = API_BASE_URL.replace("http", "ws");
export const AGENTIC_BASE_URL = process.env.NEXT_PUBLIC_AGENTIC_URL || "http://localhost:8002";
export const GRAFANA_BASE_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || "http://localhost:3000";

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

export interface ChatResponse {
  response: string;
}

export interface ChatRequest {
  message: string;
  thread_id: string;
}

export interface StructureRecord {
  id: number;
  name: string;
  type: "bridge" | "dam" | "tunnel" | string;
  location: string;
  notes?: string | null;
  created_at: string;
}

export interface SensorRecord {
  id: number;
  structure_id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  stream_url?: string | null;
  connected: boolean;
  created_at: string;
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

  sendChat: async (message: string, threadId: string) => {
    const payload: ChatRequest = {
      message,
      thread_id: threadId,
    };

    const res = await fetch(`${AGENTIC_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Agentic chat request failed with status ${res.status}`);
    }

    return res.json() as Promise<ChatResponse>;
  },

  sendMessage: async (message: string, threadId: string) => {
    return gallifreyApi.sendChat(message, threadId);
  },

  getAgenticHealth: async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(`${AGENTIC_BASE_URL}/`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        return { ok: false };
      }

      const payload = await res.json();
      return { ok: true, payload };
    } catch {
      return { ok: false };
    } finally {
      clearTimeout(timeout);
    }
  },

  listStructures: async () => {
    const res = await fetch(`${API_BASE_URL}/structures`);
    if (!res.ok) {
      throw new Error(`Failed to fetch structures: ${res.status}`);
    }
    return res.json() as Promise<StructureRecord[]>;
  },

  createStructure: async (payload: {
    name: string;
    type: "bridge" | "dam" | "tunnel";
    location: string;
    notes?: string;
  }) => {
    const res = await fetch(`${API_BASE_URL}/structures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to create structure: ${res.status}`);
    }
    return res.json() as Promise<StructureRecord>;
  },

  getStructure: async (structureId: number) => {
    const res = await fetch(`${API_BASE_URL}/structures/${structureId}`);
    if (!res.ok) {
      throw new Error(`Failed to load structure: ${res.status}`);
    }
    return res.json() as Promise<StructureRecord>;
  },

  listSensors: async (structureId: number) => {
    const res = await fetch(`${API_BASE_URL}/structures/${structureId}/sensors`);
    if (!res.ok) {
      throw new Error(`Failed to load sensors: ${res.status}`);
    }
    return res.json() as Promise<SensorRecord[]>;
  },

  connectSensor: async (
    structureId: number,
    payload: {
      name: string;
      type: string;
      x?: number;
      y?: number;
      z?: number;
      stream_url?: string;
      connected?: boolean;
    }
  ) => {
    const res = await fetch(`${API_BASE_URL}/structures/${structureId}/sensors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Failed to connect sensor: ${res.status}`);
    }
    return res.json() as Promise<SensorRecord>;
  },

  generateStructureReportPdf: async (payload: {
    structure_id: number;
    structure_name: string;
    structure_type: string;
    location: string;
    sensors: SensorRecord[];
    telemetry_summary?: Record<string, number | string | boolean | null>;
  }) => {
    const res = await fetch(`${AGENTIC_BASE_URL}/reports/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to generate report PDF: ${res.status}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.structure_name.replace(/\s+/g, "_")}_AI_Report.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
