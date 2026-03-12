"use client";

import { AnomalyResponse, WS_BASE_URL } from "@/lib/api";

export type AnomalyMessage = AnomalyResponse & {
  timestamp: number;
};

type PayloadListener = (message: AnomalyMessage) => void;
type StatusListener = (connected: boolean) => void;

let socket: WebSocket | null = null;
let isConnected = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let telemetryTimer: ReturnType<typeof setInterval> | null = null;

const payloadListeners = new Set<PayloadListener>();
const statusListeners = new Set<StatusListener>();

function notifyStatus(status: boolean) {
  isConnected = status;
  statusListeners.forEach((listener) => listener(status));
}

function notifyPayload(payload: AnomalyMessage) {
  payloadListeners.forEach((listener) => listener(payload));
}

function safeParsePayload(raw: unknown): AnomalyMessage | null {
  if (!raw || typeof raw !== "object") return null;

  const maybe = raw as Partial<AnomalyResponse>;

  if (!Array.isArray(maybe.is_anomaly) || !Array.isArray(maybe.isolation_forest_score)) {
    return null;
  }

  return {
    is_anomaly: maybe.is_anomaly,
    isolation_forest_score: maybe.isolation_forest_score,
    reconstruction_error: Array.isArray(maybe.reconstruction_error)
      ? maybe.reconstruction_error
      : undefined,
    timestamp: Date.now(),
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectAnomalySocket();
  }, 1500);
}

export function connectAnomalySocket() {
  if (typeof window === "undefined") return;

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(`${WS_BASE_URL}/ws/anomaly`);

  socket.onopen = () => {
    notifyStatus(true);
  };

  socket.onclose = () => {
    notifyStatus(false);
    scheduleReconnect();
  };

  socket.onerror = () => {
    notifyStatus(false);
  };

  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data) as unknown;
      if (parsed && typeof parsed === "object" && "error" in (parsed as Record<string, unknown>)) {
        return;
      }

      const payload = safeParsePayload(parsed);
      if (payload) {
        notifyPayload(payload);
      }
    } catch {
      // Ignore malformed frames
    }
  };
}

export function disconnectAnomalySocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (telemetryTimer) {
    clearInterval(telemetryTimer);
    telemetryTimer = null;
  }

  if (socket) {
    socket.close();
    socket = null;
  }

  notifyStatus(false);
}

export function subscribeAnomalyMessages(listener: PayloadListener) {
  payloadListeners.add(listener);
  connectAnomalySocket();
  return () => payloadListeners.delete(listener);
}

export function subscribeAnomalyConnection(listener: StatusListener) {
  statusListeners.add(listener);
  listener(isConnected);
  connectAnomalySocket();
  return () => statusListeners.delete(listener);
}

export function sendAnomalySamples(samples: number[][]) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connectAnomalySocket();
    return false;
  }

  socket.send(JSON.stringify({ samples }));
  return true;
}

function generateTelemetrySample(featureCount: number): number[] {
  const base = [
    120 + Math.random() * 20,
    35 + Math.random() * 18,
    6 + Math.random() * 3,
    2 + Math.random() * 2,
    12 + (Math.random() - 0.5) * 0.8,
    22 + Math.random() * 7,
    5 + Math.random() * 10,
    Math.random() * 1.5,
  ];

  if (featureCount <= base.length) {
    return base.slice(0, featureCount);
  }

  return [
    ...base,
    ...Array.from({ length: featureCount - base.length }, () => Math.random()),
  ];
}

export function startAnomalyTelemetry(options?: {
  intervalMs?: number;
  sampleCount?: number;
  featureCount?: number;
}) {
  const intervalMs = options?.intervalMs ?? 900;
  const sampleCount = options?.sampleCount ?? 5;
  const featureCount = options?.featureCount ?? 8;

  if (telemetryTimer) return;

  telemetryTimer = setInterval(() => {
    const samples = Array.from({ length: sampleCount }, () => generateTelemetrySample(featureCount));
    sendAnomalySamples(samples);
  }, intervalMs);
}

export function stopAnomalyTelemetry() {
  if (!telemetryTimer) return;
  clearInterval(telemetryTimer);
  telemetryTimer = null;
}
