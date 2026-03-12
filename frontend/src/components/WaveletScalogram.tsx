"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";

export function WaveletScalogram() {
  const rows = 8;
  const cols = 30;
  const { lastResponse } = useAnomalySocket();
  
  // 1D array representing the 8x30 grid intensities
  const [intensities, setIntensities] = useState<number[]>(Array(rows * cols).fill(0.1));

  useEffect(() => {
    if (!lastResponse) return;

    const errorSignal = lastResponse.reconstruction_error?.[0] ?? Math.abs(lastResponse.isolation_forest_score?.[0] || 0) * 0.2;
    const currentError = Math.max(0.05, Math.min(1, errorSignal * 8));

    setIntensities((prev) => {
      const next = [...prev];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) {
          next[r * cols + c] = next[r * cols + c + 1];
        }

        const bandWeight = 0.6 + (Math.sin((r / rows) * Math.PI * 2 + Date.now() / 800) + 1) * 0.25;
        next[r * cols + (cols - 1)] = Math.max(0.08, Math.min(1, currentError * bandWeight));
      }
      return next;
    });
  }, [lastResponse]);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Frequency Scale (a)</span>
        <span>Time (b)</span>
      </div>
      
      <div className="bg-black/40 rounded-xl p-2 border border-white/5">
        <div className="grid grid-cols-[repeat(30,1fr)] gap-px overflow-hidden rounded-lg h-32">
          {intensities.map((intensity, i) => {
            const opacity = Math.max(0.1, intensity);
            const hue = 180 - (intensity * 180); // shifts from Cyan (180) to Red (0) as intensity rises
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ 
                  backgroundColor: `hsl(${hue}, 100%, ${Math.max(30, intensity * 70)}%)`,
                  opacity: opacity
                }}
                className="w-full h-full transition-colors duration-300"
              />
            );
          })}
        </div>
      </div>
      
      <div className="flex justify-between text-[8px] opacity-40 uppercase font-mono">
        <span>0.1 Hz</span>
        <span>50.0 Hz</span>
      </div>
    </div>
  );
}
