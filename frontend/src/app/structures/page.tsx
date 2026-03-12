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
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Structural Assets</h2>
          <p className="text-muted-foreground mt-1">DB-backed structure inventory with live telemetry health overlays.</p>
        </div>
        <button className="px-6 py-2 bg-primary/10 border border-primary/30 rounded-xl text-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-all">
          <MapIcon className="w-4 h-4" /> Global View
        </button>
      </header>

      <div className="glass-card p-5 rounded-2xl border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bridge A4"
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "bridge" | "dam" | "tunnel")}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            >
              <option value="bridge">Bridge</option>
              <option value="dam">Dam</option>
              <option value="tunnel">Tunnel</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="District 4"
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateStructure}
              className="flex-1 px-4 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/20"
            >
              <PlusCircle className="w-4 h-4 inline mr-2" /> Add
            </button>
            <button
              onClick={loadStructures}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/10"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

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
                  <p className="text-2xl font-black italic tracking-tighter text-white/20">#{s.id}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8 mt-8">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-muted-foreground">Condition Index</span>
                    <span className={s.health > 80 ? "text-primary" : s.health > 50 ? "text-yellow-500" : "text-red-500"}>
                      {s.health.toFixed(1)}%
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
                  <span className={cn("text-[10px] font-black uppercase tracking-tighter", s.status === 'Safe' ? "text-emerald-500" : s.status === 'Warning' ? "text-yellow-500" : "text-red-500")}>
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
