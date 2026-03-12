"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnomalyResponse } from "@/lib/api";
import {
  connectAnomalySocket,
  sendAnomalySamples,
  startAnomalyTelemetry,
  stopAnomalyTelemetry,
  subscribeAnomalyConnection,
  subscribeAnomalyMessages,
} from "@/lib/anomalySocket";

interface UseAnomalySocketOptions {
  autoTelemetry?: boolean;
  intervalMs?: number;
  sampleCount?: number;
  featureCount?: number;
}

export function useAnomalySocket(options?: UseAnomalySocketOptions) {
  const [lastResponse, setLastResponse] = useState<AnomalyResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const telemetryOwner = useRef(false);

  useEffect(() => {
    connectAnomalySocket();

    const unsubscribePayload = subscribeAnomalyMessages((payload) => {
      setLastResponse(payload);
    });

    const unsubscribeStatus = subscribeAnomalyConnection((connected) => {
      setIsConnected(connected);
    });

    if (options?.autoTelemetry) {
      telemetryOwner.current = true;
      startAnomalyTelemetry({
        intervalMs: options.intervalMs,
        sampleCount: options.sampleCount,
        featureCount: options.featureCount,
      });
    }

    return () => {
      unsubscribePayload();
      unsubscribeStatus();

      if (telemetryOwner.current) {
        stopAnomalyTelemetry();
        telemetryOwner.current = false;
      }
    };
  }, [options?.autoTelemetry, options?.featureCount, options?.intervalMs, options?.sampleCount]);

  const sendSamples = useCallback((samples: number[][]) => {
    sendAnomalySamples(samples);
  }, []);

  return { lastResponse, isConnected, sendSamples };
}
