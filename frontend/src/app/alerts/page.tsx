"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert, Bell, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";
import Link from "next/link";

type AlertType = "critical" | "warning" | "info";
type AlertStatus = "pending" | "acknowledged" | "resolved";

interface LiveAlert {
  id: string;
  type: AlertType;
  structure: string;
  rootCause: string;
  msg: string;
  time: string;
  createdAt: number;
  status: AlertStatus;
}

interface GroupedAlert {
  key: string;
  structure: string;
  rootCause: string;
  type: AlertType;
  status: AlertStatus;
  count: number;
  latestTime: string;
  oldestCreatedAt: number;
  items: LiveAlert[];
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
  const [typeFilter, setTypeFilter] = useState<"all" | AlertType>("all");
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

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
      const rootCause = recon > 0.08 ? "Reconstruction drift" : Math.abs(iso) > 0.05 ? "Anomalous vibration" : "Telemetry jitter";
      const createdAt = Date.now();
      incoming.push({
        id: `${createdAt}-${index}`,
        type,
        structure: STRUCTURE_NAMES[index] ?? `Asset-${index + 1}`,
        rootCause,
        msg:
          type === "critical"
            ? `Anomalous response detected. iForest=${iso.toFixed(4)}, reconstruction=${recon.toFixed(4)}.`
            : type === "warning"
              ? `Elevated drift observed. iForest=${iso.toFixed(4)}.`
              : `Telemetry jitter normalized. Monitoring continues.`,
        time: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        createdAt,
        status: "pending",
      });
    });

    if (!incoming.length) return;

    setAlerts((prev) => {
      const merged = [...incoming, ...prev];
      return merged.slice(0, 60);
    });
  }, [lastResponse]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get("status");
    const urlType = params.get("type");

    if (urlStatus === "pending" || urlStatus === "acknowledged" || urlStatus === "resolved") {
      setStatusFilter(urlStatus);
    }
    if (urlType === "critical" || urlType === "warning" || urlType === "info") {
      setTypeFilter(urlType);
    }
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus = statusFilter === "all" ? true : alert.status === statusFilter;
    const matchesType = typeFilter === "all" ? true : alert.type === typeFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q.length === 0 ||
      alert.structure.toLowerCase().includes(q) ||
      alert.msg.toLowerCase().includes(q) ||
      alert.rootCause.toLowerCase().includes(q) ||
      alert.id.toLowerCase().includes(q);
    return matchesStatus && matchesType && matchesQuery;
  });

  const groupedAlerts: GroupedAlert[] = Object.values(
    filteredAlerts.reduce<Record<string, GroupedAlert>>((acc, alert) => {
      const key = `${alert.structure}|${alert.rootCause}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          structure: alert.structure,
          rootCause: alert.rootCause,
          type: alert.type,
          status: alert.status,
          count: 0,
          latestTime: alert.time,
          oldestCreatedAt: alert.createdAt,
          items: [],
        };
      }

      acc[key].items.push(alert);
      acc[key].count += 1;
      acc[key].latestTime = alert.time;
      acc[key].oldestCreatedAt = Math.min(acc[key].oldestCreatedAt, alert.createdAt);

      const severityOrder: Record<AlertType, number> = { critical: 3, warning: 2, info: 1 };
      if (severityOrder[alert.type] > severityOrder[acc[key].type]) {
        acc[key].type = alert.type;
      }

      if (alert.status === "pending") acc[key].status = "pending";
      else if (acc[key].status !== "pending" && alert.status === "acknowledged") acc[key].status = "acknowledged";

      return acc;
    }, {})
  );

  const criticalCount = alerts.filter((a) => a.type === "critical" && a.status === "pending").length;

  const updateAlertStatus = (id: string, status: AlertStatus) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const applyStatusToGroup = (groupKey: string, status: AlertStatus) => {
    setAlerts((prev) => prev.map((a) => (groupKey === `${a.structure}|${a.rootCause}` ? { ...a, status } : a)));
  };

  const toggleSelectedGroup = (groupKey: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupKey) ? prev.filter((k) => k !== groupKey) : [...prev, groupKey]
    );
  };

  const applyBatch = (status: AlertStatus) => {
    if (!selectedGroups.length) return;
    setAlerts((prev) =>
      prev.map((a) =>
        selectedGroups.includes(`${a.structure}|${a.rootCause}`) ? { ...a, status } : a
      )
    );
    setSelectedGroups([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[10px] text-primary uppercase font-black tracking-widest mb-1">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            Live Incident Queue
          </nav>
          <h2 className="text-fluid-title font-black tracking-tight text-white uppercase">Alert Triage</h2>
          <p className="text-white/40 mt-1 text-xs uppercase tracking-widest">Real-time anomaly incident management</p>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <div className="pill-crit animate-pulse">
              <ShieldAlert className="w-3 h-3" /> {criticalCount} critical
            </div>
          )}
          <div className="pill-muted">{groupedAlerts.length} groups</div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-48 bg-white/5 rounded-xl px-3 py-2 border border-white/8">
            <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search structure, cause, ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] w-full placeholder:text-white/25"
            />
          </div>

          {/* Type filter pills */}
          <div className="flex items-center gap-1.5">
            {(["all", "critical", "warning", "info"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  typeFilter === t
                    ? t === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : t === "warning" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                      : "bg-primary/15 text-primary border border-primary/25"
                    : "bg-white/5 text-white/35 border border-white/8 hover:bg-white/10 hover:text-white/60"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5">
            {(["all", "pending", "acknowledged", "resolved"] as const).map((state) => (
              <button
                key={state}
                onClick={() => setStatusFilter(state)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  statusFilter === state
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "bg-white/5 text-white/35 border border-white/8 hover:bg-white/10 hover:text-white/60"
                )}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Batch action bar */}
        {selectedGroups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="px-4 py-2.5 border-b border-white/5 bg-primary/5 flex items-center gap-3"
          >
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">{selectedGroups.length} selected</span>
            <button
              onClick={() => applyBatch("acknowledged")}
              className="px-3 py-1.5 rounded-lg border border-primary/25 bg-primary/10 text-[10px] uppercase tracking-widest font-bold text-primary hover:bg-primary/20 transition-all"
            >
              Acknowledge All
            </button>
            <button
              onClick={() => applyBatch("resolved")}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] uppercase tracking-widest font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"
            >
              Resolve All
            </button>
            <button onClick={() => setSelectedGroups([])} className="ml-auto text-[10px] text-white/30 hover:text-white/60 uppercase tracking-widest">
              Clear
            </button>
          </motion.div>
        )}

        {/* Alert group rows */}
        <div className="divide-y divide-white/[0.04]">
          <AnimatePresence>
            {groupedAlerts.length === 0 ? (
              <div className="py-20 text-center">
                <Bell className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm font-semibold">No alerts match current filters</p>
              </div>
            ) : groupedAlerts.map((group, i) => {
              const elapsedMinutes = Math.floor((Date.now() - group.oldestCreatedAt) / 60000);
              const escalation = elapsedMinutes >= 45 && group.status === "pending";
              const isSelected = selectedGroups.includes(group.key);

              return (
                <motion.div
                  key={group.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition-all duration-200 group relative",
                    "hover:bg-white/[0.025]",
                    isSelected ? "bg-primary/5" : "",
                    /* left accent by severity */
                    group.type === "critical" ? "border-l-2 border-l-red-500/70"
                      : group.type === "warning" ? "border-l-2 border-l-yellow-400/60"
                      : "border-l-2 border-l-white/10",
                  )}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    className="mt-3.5 h-3.5 w-3.5 rounded border-white/20 bg-transparent accent-primary flex-shrink-0 cursor-pointer"
                    checked={isSelected}
                    onChange={() => toggleSelectedGroup(group.key)}
                  />

                  {/* Severity icon */}
                  <div className={cn(
                    "mt-1 p-2 rounded-xl flex-shrink-0",
                    group.type === "critical" ? "bg-red-500/10 text-red-400"
                      : group.type === "warning" ? "bg-yellow-500/10 text-yellow-300"
                      : "bg-emerald-500/10 text-emerald-400"
                  )}>
                    {group.type === "critical" ? <ShieldAlert className="w-4 h-4" /> :
                      group.type === "warning" ? <AlertTriangle className="w-4 h-4" /> :
                      <Bell className="w-4 h-4" />}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-[13px] text-white/90 group-hover:text-primary transition-colors">{group.structure}</span>
                      <span className={cn(
                        "pill text-[9px]",
                        group.status === "pending" ? "pill-crit"
                          : group.status === "acknowledged" ? "pill-warn"
                          : "pill-safe"
                      )}>
                        {group.status}
                      </span>
                      {group.count > 1 && (
                        <span className="pill-muted text-[9px]">×{group.count}</span>
                      )}
                      {escalation && (
                        <span className="pill text-[9px] bg-orange-500/10 text-orange-300 border border-orange-500/20 animate-pulse">
                          ⚡ Escalated {elapsedMinutes}m
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-white/45 leading-snug">{group.rootCause}</p>
                    <p className="text-[10px] font-mono text-white/20 mt-1">{group.latestTime}</p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Link
                        href={`/analytics?structure=${encodeURIComponent(group.structure)}`}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider hover:bg-white/8 hover:text-white transition-all text-white/50"
                      >
                        Diagnose →
                      </Link>
                      {group.status === "pending" && (
                        <button
                          onClick={() => applyStatusToGroup(group.key, "acknowledged")}
                          className="px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/15 transition-all"
                        >
                          Acknowledge
                        </button>
                      )}
                      {group.status !== "resolved" && (
                        <button
                          onClick={() => applyStatusToGroup(group.key, "resolved")}
                          className="px-3 py-1.5 rounded-lg border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/10 transition-all"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Clear queue */}
      <div className="flex justify-center">
        <button
          onClick={() => setAlerts([])}
          className="text-[11px] font-bold uppercase tracking-widest text-white/25 hover:text-red-400 transition-colors"
        >
          Clear Volatile Queue
        </button>
      </div>
    </div>
  );
}
