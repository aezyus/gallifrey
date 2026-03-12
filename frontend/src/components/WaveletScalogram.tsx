"use client";

import { motion } from "framer-motion";

export function WaveletScalogram() {
  // Mock data for a heatmap (8x30 grid)
  const rows = 8;
  const cols = 30;
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Frequency Scale (a)</span>
        <span>Time (b)</span>
      </div>
      
      <div className="bg-black/40 rounded-xl p-2 border border-white/5">
        <div className="grid grid-cols-[repeat(30,1fr)] gap-px overflow-hidden rounded-lg h-32">
          {Array.from({ length: rows * cols }).map((_, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            // Generate some "energy" hotspots
            const intensity = Math.sin(col * 0.3) * Math.cos(row * 0.5) * 0.5 + 0.5;
            const opacity = Math.max(0.1, intensity);
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.001 }}
                style={{ 
                  backgroundColor: `hsl(180, 100%, ${intensity * 50}%)`,
                  opacity: opacity
                }}
                className="w-full h-full"
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
