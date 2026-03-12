"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WS_BASE_URL, AnomalyResponse } from "@/lib/api";

export function useAnomalySocket() {
  const [lastResponse, setLastResponse] = useState<AnomalyResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(`${WS_BASE_URL}/ws/anomaly`);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        console.error("WS Error:", data.error);
      } else {
        setLastResponse(data);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const sendSamples = useCallback((samples: number[][]) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ samples }));
    }
  }, []);

  return { lastResponse, isConnected, sendSamples };
}
