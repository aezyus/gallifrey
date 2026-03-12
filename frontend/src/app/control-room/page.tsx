"use client";

import { useAnomalySocket } from "@/hooks/useAnomalySocket";
import { useEffect, useRef, useState } from "react";
import { Activity, ShieldAlert, Cpu, Terminal as TerminalIcon } from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogEntry {
  time: string;
  msg: string;
  type: 'info' | 'error' | 'anomaly';
}

interface SensorPoint {
  time: string;
  value: number;
  trend: number;
  vibration: number;
  strain: number;
  deflection: number;
  displacement: number;
  modalFrequency: number;
  temperature: number;
  windSpeed: number;
  crackPropagation: number;
  isAnomaly: boolean;
  anomalyValue: number | null;
  ifScore?: number;
  reconError?: number;
}

function SensorTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SensorPoint }> }) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-white/15 bg-[#0a0b10]/95 backdrop-blur-md p-3 text-[11px] min-w-[260px]">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-white">Sensor Snapshot</span>
        <span className="text-white/50 font-mono">{point.time}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/80">
        <span>Strain</span><span className="text-right font-semibold">{point.strain.toFixed(2)} μɛ</span>
        <span>Vibration</span><span className="text-right font-semibold">{point.vibration.toFixed(3)} m/s²</span>
        <span>Deflection</span><span className="text-right font-semibold">{point.deflection.toFixed(3)} mm</span>
        <span>Displacement</span><span className="text-right font-semibold">{point.displacement.toFixed(3)} mm</span>
        <span>Modal Freq</span><span className="text-right font-semibold">{point.modalFrequency.toFixed(3)} Hz</span>
        <span>Temperature</span><span className="text-right font-semibold">{point.temperature.toFixed(2)} °C</span>
        <span>Wind</span><span className="text-right font-semibold">{point.windSpeed.toFixed(2)} m/s</span>
        <span>Crack Prop.</span><span className="text-right font-semibold">{point.crackPropagation.toExponential(2)} mm</span>
      </div>
      <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-x-4 gap-y-1 text-white/80">
        <span>IF Score</span><span className="text-right font-semibold">{(point.ifScore ?? 0).toFixed(4)}</span>
        <span>Recon Error</span><span className="text-right font-semibold">{(point.reconError ?? 0).toFixed(4)}</span>
        <span>Status</span>
        <span className={cn("text-right font-bold", point.isAnomaly ? "text-red-400" : "text-emerald-400")}>
          {point.isAnomaly ? "ANOMALY" : "NORMAL"}
        </span>
      </div>
    </div>
  );
}

export default function ControlRoom() {
  const { lastResponse, isConnected, sendSamples } = useAnomalySocket();
  const [data, setData] = useState<SensorPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const lastAnomalyLogRef = useRef<number>(0);
  const [pendingAlerts, setPendingAlerts] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simulate real-time sensor data
  useEffect(() => {
    let tick = 0;
    const intervalId = setInterval(() => {
      tick++;
      const vibration = 0.25 + Math.sin(tick * 0.2) * 0.04 + Math.random() * 0.02;
      const strain = 45 + Math.sin(tick * 0.18) * 9 + Math.random() * 1.8;
      const deflection = 6.5 + Math.cos(tick * 0.15) * 0.7 + Math.random() * 0.2;
      const displacement = 2.8 + Math.sin(tick * 0.12) * 0.5 + Math.random() * 0.15;
      const modalFrequency = 12.5 + Math.sin(tick * 0.05) * 0.2;
      const temperature = 22.5 + Math.sin(tick * 0.01) * 0.9 + Math.random() * 0.2;
      const windSpeed = 6 + Math.cos(tick * 0.08) * 1.4 + Math.random() * 0.4;
      const crackPropagation = Math.max(0.00001, 0.001 + Math.random() * 0.0007);

      setData((prev) => {
        const trendWindow = prev.slice(-8).map((point) => point.value);
        const trend = trendWindow.length
          ? (trendWindow.reduce((acc, point) => acc + point, 0) + strain) / (trendWindow.length + 1)
          : strain;

        const newPoint: SensorPoint = {
          time: new Date().toLocaleTimeString([], {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          value: Number(strain.toFixed(3)),
          trend: Number(trend.toFixed(3)),
          vibration: Number(vibration.toFixed(4)),
          strain: Number(strain.toFixed(3)),
          deflection: Number(deflection.toFixed(3)),
          displacement: Number(displacement.toFixed(3)),
          modalFrequency: Number(modalFrequency.toFixed(4)),
          temperature: Number(temperature.toFixed(3)),
          windSpeed: Number(windSpeed.toFixed(3)),
          crackPropagation: Number(crackPropagation.toFixed(6)),
          isAnomaly: false,
          anomalyValue: null,
        };

        return [...prev.slice(-49), newPoint];
      });
      
      // Send to backend for actual inference (Exactly 8 features as per model_meta.json)
      if (isConnected) {
        sendSamples([[
          vibration,        // Vibration_ms2
          strain,           // Strain_microstrain
          deflection,       // Deflection_mm
          displacement,     // Displacement_mm
          modalFrequency,   // Modal_Frequency_Hz
          temperature,      // Temperature_C
          windSpeed,        // Wind_Speed_ms
          crackPropagation, // Crack_Propagation_mm
        ]]);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sendSamples, isConnected]);

  // Handle backend responses
  useEffect(() => {
    if (!lastResponse) return;

    const ifScore = lastResponse.isolation_forest_score?.[0] ?? 0;
    const reconError = lastResponse.reconstruction_error?.[0] ?? 0;
    const modelFlag = Boolean(lastResponse.is_anomaly?.[0]);

    // Tighten anomaly decision to avoid every point being flagged.
    const anomalyByThreshold = ifScore < -0.12 || reconError > 0.028;
    const isActionableAnomaly = modelFlag && anomalyByThreshold;

    setData((prev) => {
      if (prev.length === 0) return prev;
      const lastIdx = prev.length - 1;
      const updated = [...prev];
      updated[lastIdx] = {
        ...updated[lastIdx],
        ifScore,
        reconError,
        isAnomaly: isActionableAnomaly,
        anomalyValue: isActionableAnomaly ? updated[lastIdx].value : null,
      };
      return updated;
    });

    if (isActionableAnomaly) {
      setPendingAlerts((prev) => Math.min(999, prev + 1));
    }

    const now = Date.now();
    if (isActionableAnomaly && now - lastAnomalyLogRef.current > 4500) {
      lastAnomalyLogRef.current = now;
      setLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          msg: `ANOMALY DETECTED: IF ${ifScore.toFixed(4)} | RE ${reconError.toFixed(4)}`,
          type: "anomaly",
        },
        ...prev.slice(0, 50),
      ]);
    }
  }, [lastResponse]);

  return (
    <div className="space-y-8 min-h-full flex flex-col">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mission Control</h2>
          <p className="text-muted-foreground mt-1">Direct telemetric bridge to distributed sensor arrays.</p>
        </div>
        <div className={cn(
          "px-4 py-2 rounded-full border flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors",
          isConnected ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"
        )}>
          <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
          {isConnected ? "Live Stream Active" : "Stream Disconnected"}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-1">
        {/* Real-time Oscilloscope */}
        <div className="xl:col-span-3 glass-card rounded-2xl p-6 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
              <Activity className="w-4 h-4" />
              Sensor Feed // Channel 01-X
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-primary animate-pulse font-bold">REC</span>
            </div>
          </div>
          
          <div className="flex-1 w-full bg-black/20 rounded-xl overflow-hidden relative min-h-[300px]">
            {/* Chart Grid Background */}
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 pointer-events-none opacity-5">
               {Array.from({ length: 72 }).map((_, i) => <div key={i} className="border border-white/10" />)}
            </div>
            
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={[20, 70]}
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={<SensorTooltip />}
                    cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                    contentStyle={{
                      backgroundColor: "#0a0b10",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "10px",
                    }}
                  />
                  <ReferenceLine y={150} stroke="rgba(255,100,100,0.2)" strokeDasharray="5 5" />

                  <Line
                    type="monotone"
                    dataKey="trend"
                    stroke="rgba(16,185,129,0.75)"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="anomalyValue"
                    stroke="rgba(0,0,0,0)"
                    strokeWidth={0}
                    connectNulls={false}
                    dot={{ r: 4, fill: "#ef4444", stroke: "#fecaca", strokeWidth: 1 }}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live Logs / Terminal */}
        <div className="glass-card rounded-2xl p-6 flex flex-col h-[500px]">
          <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground mb-4">
            <TerminalIcon className="w-4 h-4" />
            System Events
          </h3>
          <div className="flex-1 font-mono text-[11px] overflow-y-auto space-y-2 pr-2 scroll-hide bg-black/40 p-4 rounded-xl border border-white/5">
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`${log.time}-${i}`} 
                  className={cn(
                    "flex gap-2",
                    log.type === 'anomaly' ? "text-red-400 font-bold" : "text-emerald-400"
                  )}
                >
                  <span className="opacity-40">{log.time}</span>
                  <span>[{log.type.toUpperCase()}]</span>
                  <span className="text-white/80">{log.msg}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="text-white/20 animate-pulse">_</div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions / Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Cpu className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Inference engine</p>
            <p className="text-lg font-bold">FastAPI / Uvicorn</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-lg font-mono text-primary font-bold">AI</div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Model Stack</p>
            <p className="text-lg font-bold">Isolation Forest + VAE</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Alert Queue</p>
            <p className="text-lg font-bold">{pendingAlerts} Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}
