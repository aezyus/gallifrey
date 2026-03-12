"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, Bell, Filter, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";

type AlertType = "critical" | "warning" | "info";
type AlertStatus = "pending" | "acknowledged" | "resolved";

interface LiveAlert {
  id: string;
  type: AlertType;
  structure: string;
  msg: string;
  time: string;
  status: AlertStatus;
}

const STRUCTURE_NAMES = [
  "Bridge-A4 (Main)",
  "West-Arch-Span",
  "North-Support-Pillar",
  "East-Extension",
  "South-Tower",
];

export default function AlertsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AlertStatus>("all");
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);

  useAnomalySocket({
    autoTelemetry: true,
    intervalMs: 1100,
    sampleCount: 5,
    featureCount: 8,
  });

  const { lastResponse } = useAnomalySocket();

  useEffect(() => {
    if (!lastResponse) return;

    const incoming: LiveAlert[] = [];
    lastResponse.is_anomaly.forEach((isAnomaly, index) => {
      const iso = lastResponse.isolation_forest_score[index] ?? 0;
      const recon = lastResponse.reconstruction_error?.[index] ?? 0;
      if (!isAnomaly && Math.abs(iso) < 0.06 && recon < 0.05) return;

      const type: AlertType = isAnomaly || recon > 0.08 ? "critical" : Math.abs(iso) > 0.04 ? "warning" : "info";
      incoming.push({
        id: `${Date.now()}-${index}`,
        type,
        structure: STRUCTURE_NAMES[index] ?? `Asset-${index + 1}`,
        msg:
          type === "critical"
            ? `Anomalous response detected. iForest=${iso.toFixed(4)}, reconstruction=${recon.toFixed(4)}.`
            : type === "warning"
              ? `Elevated drift observed. iForest=${iso.toFixed(4)}.`
              : `Telemetry jitter normalized. Monitoring continues.`,
        time: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        status: "pending",
      });
    });

    if (!incoming.length) return;

    setAlerts((prev) => {
      const merged = [...incoming, ...prev];
      return merged.slice(0, 60);
    });
  }, [lastResponse]);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus = statusFilter === "all" ? true : alert.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q.length === 0 ||
      alert.structure.toLowerCase().includes(q) ||
      alert.msg.toLowerCase().includes(q) ||
      alert.id.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const criticalCount = alerts.filter((a) => a.type === "critical" && a.status === "pending").length;

  const updateAlertStatus = (id: string, status: AlertStatus) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center text-white">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Alerts</h2>
          <p className="text-muted-foreground mt-1">Real-time incident queue and anomaly triage center.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-3 glass-card rounded-xl hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
          <div className="px-6 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> {criticalCount} Critical Events
          </div>
        </div>
      </header>

      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search alerts by structure, type or ID..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/50"
          />
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
            {(["all", "pending", "acknowledged", "resolved"] as const).map((state) => (
              <button
                key={state}
                onClick={() => setStatusFilter(state)}
                className={cn(
                  "px-2.5 py-1 rounded-md border transition-colors",
                  statusFilter === state
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-white/10 text-muted-foreground hover:bg-white/10"
                )}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-white/5">
          <AnimatePresence>
            {filteredAlerts.map((alert, i) => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-6 flex items-start gap-6 hover:bg-white/5 transition-colors group",
                  alert.status === 'pending' ? "bg-white/[0.02]" : ""
                )}
              >
                <div className={cn(
                  "p-3 rounded-xl shrink-0",
                  alert.type === 'critical' ? "bg-red-500/10 text-red-500" : 
                  alert.type === 'warning' ? "bg-yellow-500/10 text-yellow-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                   {alert.type === 'critical' ? <ShieldAlert className="w-6 h-6" /> : 
                    alert.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{alert.structure}</h4>
                    <span className="text-xs text-muted-foreground font-mono">{alert.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-2xl">{alert.msg}</p>
                  
                  <div className="flex items-center gap-4 mt-6">
                    <button className="px-4 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                      View Trace
                    </button>
                    <button
                      onClick={() => updateAlertStatus(alert.id, "acknowledged")}
                      className="px-4 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => updateAlertStatus(alert.id, "resolved")}
                      className="px-4 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/10 transition-all"
                    >
                      Resolve
                    </button>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                   <div className={cn(
                     "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                     alert.status === 'pending' ? "bg-red-500 text-white" : "bg-white/10 text-muted-foreground"
                   )}>
                     {alert.status}
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={() => setAlerts([])}
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          Clear Volatile Queue
        </button>
      </div>
    </div>
  );
}
