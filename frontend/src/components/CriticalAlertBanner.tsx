"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";

export function CriticalAlertBanner() {
  const { lastResponse, isConnected } = useAnomalySocket({
    autoTelemetry: true,
    intervalMs: 1500,
    sampleCount: 6,
    featureCount: 8,
  });

  const criticalCount =
    lastResponse?.is_anomaly.filter(Boolean).length ?? 0;
  const warningCount =
    lastResponse?.isolation_forest_score.filter((score) => Math.abs(score) > 0.05)
      .length ?? 0;

  if (!isConnected && criticalCount === 0 && warningCount === 0) {
    return null;
  }

  const criticalMode = criticalCount > 0;
  const label = criticalMode ? "CRITICAL" : "WARNING";
  const message = criticalMode
    ? `${criticalCount} structures require immediate investigation.`
    : `${warningCount} structures show elevated drift signatures.`;

  return (
    <div
      className={
        criticalMode
          ? "mb-4 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3"
          : "mb-4 rounded-2xl border border-yellow-500/35 bg-yellow-500/10 px-4 py-3"
      }
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-black/20 p-2">
            <AlertTriangle
              className={criticalMode ? "h-4 w-4 text-red-400" : "h-4 w-4 text-yellow-300"}
            />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-white/70">{label} ALERT</p>
            <p className="text-sm text-white">{message}</p>
          </div>
        </div>

        <Link
          href={criticalMode ? "/alerts?status=pending&type=critical" : "/alerts?status=pending"}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-white/10"
        >
          Open Triage
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
