"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Maximize2, RotateCcw, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function DigitalTwin({ health = 92 }: { health?: number }) {
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  
  // Segment health colors
  const getSegmentColor = (h: number) => {
    if (h > 80) return "stroke-emerald-500";
    if (h > 50) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
           <Activity className="w-4 h-4 text-primary" />
           Virtual Asset Twin // Simulation Mode
        </h3>
        <div className="flex gap-2">
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
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const segmentHealth = i === 2 ? 45 : i === 4 ? 65 : 95; 
              return (
                <motion.path
                  key={i}
                  d={`M${100 + i * 120},200 L${220 + i * 120},200`}
                  className={cn("transition-all duration-1000", getSegmentColor(segmentHealth))}
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
                  <span className="text-muted-foreground">Load Stress</span>
                  <span className="font-bold">24.2 kN/m</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Strain Index</span>
                  <span className="font-bold">{activeSegment === 2 ? "0.88 (HIGH)" : "0.12 (NORM)"}</span>
                </div>
                <div className="h-1 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                   <div className={cn("h-full", activeSegment === 2 ? "bg-red-500 w-[88%]" : "bg-emerald-500 w-[12%]")} />
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
