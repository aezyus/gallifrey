"use client";

import { useEffect, useState } from "react";
import { Map as MapIcon, ArrowRight, Construction, PlusCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";
import { cn } from "@/lib/utils";
import { gallifreyApi, StructureRecord } from "@/lib/api";

type StructureUI = StructureRecord & {
  status: "Safe" | "Warning" | "Critical";
  health: number;
};

export default function StructuresList() {
  const [structures, setStructures] = useState<StructureUI[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"bridge" | "dam" | "tunnel">("bridge");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const { lastResponse } = useAnomalySocket({ autoTelemetry: true, intervalMs: 1000, sampleCount: 5, featureCount: 8 });

  const loadStructures = async () => {
    setLoading(true);
    try {
      const rows = await gallifreyApi.listStructures();
      setStructures(
        rows.map((row) => ({
          ...row,
          status: "Safe",
          health: 92,
        }))
      );
    } catch (error) {
      console.error("Failed to load structures", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStructures();
  }, []);

  const handleCreateStructure = async () => {
    if (!name.trim() || !location.trim()) return;
    try {
      await gallifreyApi.createStructure({
        name: name.trim(),
        type,
        location: location.trim(),
      });
      setName("");
      setLocation("");
      await loadStructures();
    } catch (error) {
      console.error("Failed to create structure", error);
    }
  };

  useEffect(() => {
    if (!lastResponse) return;

    setStructures((prev) =>
      prev.map((structure, idx) => {
        const anomaly = lastResponse.is_anomaly[idx] ?? false;
        const score = Math.abs(lastResponse.isolation_forest_score[idx] ?? 0);
        const recon = lastResponse.reconstruction_error?.[idx] ?? 0;
        const pressure = (anomaly ? 12 : 2) + score * 40 + recon * 220;

        const nextHealth = Math.max(10, Math.min(99, structure.health - pressure * 0.08 + Math.random() * 0.4));
        const status: StructureUI["status"] = nextHealth > 82 ? "Safe" : nextHealth > 56 ? "Warning" : "Critical";
        return {
          ...structure,
          health: Number(nextHealth.toFixed(1)),
          status,
        };
      })
    );
  }, [lastResponse]);

  return (
    <div className="space-y-8 relative">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none -z-10" />

      <header className="flex justify-between items-end relative py-6">
        <div className="scanline opacity-10" />
        <div>
          <nav className="text-[10px] text-primary uppercase font-bold tracking-[0.3em] mb-1 opacity-60">Asset Registry // District-Level</nav>
          <h2 className="text-4xl font-black tracking-tight text-white uppercase italic flicker">Structural Assets</h2>
          <p className="text-muted-foreground mt-1 text-xs uppercase tracking-widest opacity-60">DB-backed structure inventory with live telemetry health overlays.</p>
        </div>
        <div className="flex gap-4">
           <div className="hidden md:block p-4 hud-border hud-corner-extra bg-primary/5">
             <div className="text-[8px] font-mono text-white/30 uppercase">Node_Status</div>
             <div className="text-xs font-bold text-primary">CONNECTED // 0xAF</div>
           </div>
        </div>
      </header>

      {/* Gloaming Map Visualization */}
      <div className="relative h-[400px] w-full bg-black/40 rounded-3xl overflow-hidden hud-border hud-corner-extra group">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="scanline opacity-10" />
        <div className="absolute top-6 left-8 z-10">
           <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
             <MapIcon className="w-4 h-4 text-primary" />
             Strategic Deployment Map
           </h3>
           <span className="text-[8px] font-mono text-white/30 truncate">LOC_ID: 34.0522° N, 118.2437° W</span>
        </div>
        
        {/* Mock Map Layout */}
        <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 1000 400">
           <path d="M100,200 Q300,50 500,200 T900,200" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/20" />
           <path d="M50,100 T200,300" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" className="text-primary/10" />
           
           {/* Structure Location Pings */}
           {structures.map((s, i) => (
             <g key={s.id}>
                <circle 
                  cx={150 + (i * 180) % 700} 
                  cy={100 + (i * 120) % 250} 
                  r="4" 
                  className={cn(s.health > 82 ? "fill-primary" : "fill-red-500")} 
                />
                <circle 
                  cx={150 + (i * 180) % 700} 
                  cy={100 + (i * 120) % 250} 
                  r="12" 
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className={cn(
                    "animate-ping",
                    s.health > 82 ? "text-primary/40" : "text-red-500/40"
                  )}
                />
             </g>
           ))}
        </svg>

        <div className="absolute bottom-6 left-8 flex gap-8">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,242,255,0.8)]" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Critical Assets</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Active Hazards</span>
           </div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl border-white/5 hud-border hud-corner-extra bg-black/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end relative z-10">
          <div>
            <label className="text-[8px] uppercase font-black tracking-[0.2em] text-primary mb-1 block">New_Registry_Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Bridge/Dam ID"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[8px] uppercase font-black tracking-[0.2em] text-primary mb-1 block">Asset_Classification</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "bridge" | "dam" | "tunnel")}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-primary/50 transition-colors"
            >
              <option value="bridge">Bridge System</option>
              <option value="dam">Hydro-Power Dam</option>
              <option value="tunnel">Transit Tunnel</option>
            </select>
          </div>
          <div>
            <label className="text-[8px] uppercase font-black tracking-[0.2em] text-primary mb-1 block">Geo_Zone</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Assign sector"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateStructure}
              className="flex-1 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <PlusCircle className="w-4 h-4 inline mr-2" /> Register
            </button>
            <button
              onClick={loadStructures}
              className="px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {structures.map((s, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={s.id} 
          >
            <Link 
              href={`/structures/${s.id}`}
              className="group block glass-card p-8 rounded-3xl border-white/5 hover:border-primary/50 transition-all relative overflow-hidden hud-border hud-corner-extra bg-black/40"
            >
              <div className="scanline opacity-5 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex gap-5 items-center">
                  <div className="w-14 h-14 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                    <Construction className="w-7 h-7 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black group-hover:text-primary transition-colors tracking-tight">{s.name.toUpperCase()}</h3>
                    <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-mono mt-1 font-black">CLASS: {s.type} | LOC: {s.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black italic tracking-tighter text-white/5 group-hover:text-primary/10 transition-colors">#{s.id.toString().padStart(3, '0')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-10 mt-10 relative z-10">
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em]">
                    <span className="text-white/40">Condition Integrity</span>
                    <span className={s.health > 80 ? "text-primary shadow-primary" : s.health > 50 ? "text-yellow-500 shadow-yellow-500" : "text-red-500 shadow-red-500"}>
                      {s.health.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${s.health}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        s.health > 80 ? "bg-primary shadow-[0_0_10px_rgba(0,242,255,0.4)]" : s.health > 50 ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                      )}
                    />
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center gap-4">
                  <div className="text-right">
                    <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] block", s.status === 'Safe' ? "text-emerald-500" : s.status === 'Warning' ? "text-yellow-500" : "text-red-500")}>
                      {s.status}
                    </span>
                    <span className="text-[6px] font-mono text-white/20">SENTINEL_OK</span>
                  </div>
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-primary transition-all group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_rgba(0,242,255,0.4)]">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="absolute top-2 right-4 text-[6px] font-mono text-white/10">0x{Math.random().toString(16).slice(2, 6).toUpperCase()}</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
