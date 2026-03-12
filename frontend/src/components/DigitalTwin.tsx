"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Maximize2, RotateCcw, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";

export function DigitalTwin({ health = 92 }: { health?: number }) {
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [anomalies, setAnomalies] = useState<boolean[]>(Array(5).fill(false));
  const [scores, setScores] = useState<number[]>(Array(5).fill(0));
  const [reconstruction, setReconstruction] = useState<number[]>(Array(5).fill(0));
  const { lastResponse, isConnected } = useAnomalySocket({
    autoTelemetry: true,
    intervalMs: 1200,
    sampleCount: 5,
    featureCount: 8,
  });

  useEffect(() => {
    if (!lastResponse) return;

    if (lastResponse.is_anomaly.length >= 5) {
      setAnomalies(lastResponse.is_anomaly.slice(0, 5));
    }

    if (lastResponse.isolation_forest_score.length >= 5) {
      setScores(lastResponse.isolation_forest_score.slice(0, 5));
    }

    if (lastResponse.reconstruction_error?.length) {
      setReconstruction(lastResponse.reconstruction_error.slice(0, 5));
    }
  }, [lastResponse]);
  
  // Segment health colors based on live anomaly status
  const getSegmentColor = (idx: number) => {
    if (anomalies[idx]) return "stroke-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]";
    if ((reconstruction[idx] || 0) > 0.06) return "stroke-yellow-400";
    return "stroke-emerald-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Activity className={cn("w-4 h-4", isConnected ? "text-emerald-500 animate-pulse" : "text-primary")} />
           Virtual Asset Twin // Live Telemetry
        </h3>
        <div className="flex gap-2">
           <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-bold tracking-widest text-muted-foreground">
             BASE SHI {health}%
           </div>
           <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><RotateCcw className="w-3.5 h-3.5" /></button>
           <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="relative glass-card bg-black/40 rounded-2xl p-8 aspect-[2/1] flex items-center justify-center group overflow-hidden border-white/5 shadow-2xl">
        {/* Glow behind the model */}
        <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full scale-50 opacity-20 group-hover:opacity-40 transition-opacity" />
        
        <svg viewBox="0 0 800 300" className="w-full h-auto drop-shadow-[0_0_15px_rgba(0,242,255,0.1)]">
          {/* Main Suspension Bridge Schematic */}
          <g fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            
            {/* Water Line */}
            <path d="M50,250 Q400,240 750,250" className="stroke-white/10" strokeDasharray="10 10" />

            {/* Main Deck segments */}
            {[0, 1, 2, 3, 4].map((i) => {
              return (
                <motion.path
                  key={i}
                  d={`M${100 + i * 144},200 L${244 + i * 144},200`}
                  className={cn("transition-all duration-700", getSegmentColor(i))}
                  initial={{ strokeDasharray: 200, strokeDashoffset: 200 }}
                  animate={{ strokeDashoffset: 0 }}
                  whileHover={{ strokeWidth: 8 }}
                  onMouseEnter={() => setActiveSegment(i)}
                  onMouseLeave={() => setActiveSegment(null)}
                />
              );
            })}

            {/* Towers */}
            <path d="M220,250 L220,80" className="stroke-white/20" />
            <path d="M580,250 L580,80" className="stroke-white/20" />

            {/* Main Cables */}
            <motion.path 
              d="M100,200 Q220,30 340,115 T580,30 T820,200" 
              className="stroke-primary/40" 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2 }}
            />

            {/* Vertical Suspension Cables */}
            {[130, 160, 190, 250, 280, 310, 490, 520, 550, 610, 640, 670].map((x, i) => (
              <line key={i} x1={x} y1="200" x2={x} y2="120" className="stroke-white/5" />
            ))}
          </g>
        </svg>

        {/* Data HUD Overlay */}
        <AnimatePresence>
          {activeSegment !== null && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 p-4 glass-card bg-black/80 border-primary/40 rounded-xl min-w-[200px] z-50 shadow-2xl"
            >
              <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Segment {activeSegment + 1} Status</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Anomaly Flag</span>
                  <span className={cn("font-bold", anomalies[activeSegment] ? "text-red-500" : "text-emerald-500")}>
                    {anomalies[activeSegment] ? "CRITICAL" : "NOMINAL"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">iForest Score</span>
                  <span className="font-bold">{scores[activeSegment]?.toFixed(4) || "0.0000"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Recon Error</span>
                  <span className="font-bold text-cyan-300">{(reconstruction[activeSegment] || 0).toFixed(4)}</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                   <div 
                     className={cn("h-full transition-all duration-500", anomalies[activeSegment] ? "bg-red-500" : "bg-emerald-500")} 
                     style={{ width: `${Math.min(100, Math.max(0, (scores[activeSegment] + 0.5) * 100))}%` }}
                   />
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-500", (reconstruction[activeSegment] || 0) > 0.06 ? "bg-yellow-500" : "bg-cyan-400")}
                    style={{ width: `${Math.min(100, Math.max(0, (reconstruction[activeSegment] || 0) * 1400))}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-4 left-4 flex gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
           <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full" /> Operational</div>
           <div className="flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-full" /> Warning</div>
           <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full" /> Critical</div>
        </div>
      </div>
    </div>
  );
}
