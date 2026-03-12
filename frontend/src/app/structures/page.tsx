"use client";

import { Boxes, Map as MapIcon, ArrowRight, Construction } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const structures = [
  { id: 'bridge-a4', name: 'Bridge-A4 (Main)', type: 'Suspension', status: 'Safe', health: 92 },
  { id: 'west-arch', name: 'West Arch Span', type: 'Arch', status: 'Safe', health: 85 },
  { id: 'north-pillar', name: 'North Support Pillar', type: 'Support', status: 'Critical', health: 42 },
  { id: 'east-extension', name: 'East Extension', type: 'Beam', status: 'Warning', health: 65 },
];

export default function StructuresList() {
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Structural Assets</h2>
          <p className="text-muted-foreground mt-1">Inventory of managed infrastructure and real-time health mapping.</p>
        </div>
        <button className="px-6 py-2 bg-primary/10 border border-primary/30 rounded-xl text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-all">
          <MapIcon className="w-4 h-4" /> Global View
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {structures.map((s, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={s.id} 
          >
            <Link 
              href={`/structures/${s.id}`}
              className="group block glass-card p-6 rounded-2xl border-white/5 hover:border-primary/50 transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Construction className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{s.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold font-mono">{s.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black italic tracking-tighter text-white/20">#{s.id.split('-')[1] || i}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8 mt-8">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-muted-foreground">Condition Index</span>
                    <span className={s.health > 80 ? "text-primary" : s.health > 50 ? "text-yellow-500" : "text-red-500"}>
                      {s.health}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${s.health > 80 ? "bg-primary" : s.health > 50 ? "bg-yellow-500" : "bg-red-500"}`} 
                      style={{ width: `${s.health}%` }} 
                    />
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-tighter ${s.status === 'Safe' ? "text-emerald-500" : s.status === 'Warning' ? "text-yellow-500" : "text-red-500"}`}>
                    {s.status}
                  </span>
                  <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary transition-colors group-hover:text-primary-foreground">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
