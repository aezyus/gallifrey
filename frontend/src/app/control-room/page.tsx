"use client";

import { useAnomalySocket } from "@/hooks/useAnomalySocket";
import { useEffect, useState, useRef } from "react";
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

export default function ControlRoom() {
  const { lastResponse, isConnected, sendSamples } = useAnomalySocket();
  const [data, setData] = useState<{ time: number, value: number, isAnomaly: boolean }[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simulate real-time sensor data
  useEffect(() => {
    let tick = 0;
    const intervalId = setInterval(() => {
      tick++;
      const baseValue = Math.sin(tick * 0.2) * 50 + 100;
      const noise = Math.random() * 10;
      const isOutlier = Math.random() > 0.95;
      const finalValue = isOutlier ? baseValue * 1.5 : baseValue + noise;
      
      const newPoint = { time: tick, value: finalValue, isAnomaly: false };
      
      // Send to backend for actual inference (Exactly 8 features as per model_meta.json)
      if (isConnected) {
        sendSamples([[
          finalValue,           // Vibration_ms2
          Math.random() * 100,  // Strain_microstrain
          Math.random() * 10,   // Deflection_mm
          Math.random() * 5,    // Displacement_mm
          12.5 + Math.random(), // Modal_Frequency_Hz
          22.4 + Math.random(), // Temperature_C
          Math.random() * 15,   // Wind_Speed_ms
          Math.random() * 2     // Crack_Propagation_mm
        ]]);
      }

      setData(prev => [...prev.slice(-49), newPoint]);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sendSamples, isConnected]);

  // Handle backend responses
  useEffect(() => {
    if (lastResponse && (lastResponse as any).is_anomaly && (lastResponse as any).is_anomaly[0]) {
      setData(prev => {
        if (prev.length === 0) return prev;
        const lastIdx = prev.length - 1;
        const updated = [...prev];
        updated[lastIdx] = { ...updated[lastIdx], isAnomaly: true };
        return updated;
      });
      
      const score = (lastResponse as any).isolation_forest_score?.[0]?.toFixed(4) || "N/A";

      setLogs(prev => [
        { time: new Date().toLocaleTimeString(), msg: `ANOMALY DETECTED: Score ${score}`, type: 'anomaly' },
        ...prev.slice(0, 50)
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
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 250]} hide />
                <Tooltip content={() => null} />
                <ReferenceLine y={150} stroke="rgba(255,100,100,0.2)" strokeDasharray="5 5" />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--primary)" 
                  strokeWidth={2} 
                  dot={(props) => {
                    if (props.payload.isAnomaly) {
                      return <circle cx={props.cx} cy={props.cy} r={4} fill="red" className="animate-ping" />;
                    }
                    return null;
                  }} 
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
            <p className="text-lg font-bold">0 Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}
