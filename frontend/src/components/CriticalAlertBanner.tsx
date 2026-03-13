"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, X, Zap } from "lucide-react";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function CriticalAlertBanner() {
  const { lastResponse, isConnected } = useAnomalySocket({
    autoTelemetry: true,
    intervalMs: 1500,
    sampleCount: 6,
    featureCount: 8,
  });

  const [dismissed, setDismissed] = useState(false);

  const criticalCount = lastResponse?.is_anomaly.filter(Boolean).length ?? 0;
  const warningCount =
    lastResponse?.isolation_forest_score.filter((s) => Math.abs(s) > 0.05).length ?? 0;

  const show = !dismissed && isConnected && (criticalCount > 0 || warningCount > 0);
  const criticalMode = criticalCount > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-4"
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border px-4 py-3",
              criticalMode
                ? "border-red-500/30 bg-red-950/40"
                : "border-yellow-500/30 bg-yellow-950/30",
            )}
          >
            {/* Animated left edge pulse bar */}
            <span
              className={cn(
                "absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl",
                criticalMode ? "bg-red-500" : "bg-yellow-400",
              )}
              style={{ boxShadow: criticalMode ? "0 0 10px rgba(239,68,68,0.7)" : "0 0 8px rgba(234,179,8,0.5)" }}
            />

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pl-3">
              <div className="flex items-center gap-3">
                {/* Icon with pulse ring */}
                <div className="relative">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-lg animate-ping opacity-30",
                      criticalMode ? "bg-red-500" : "bg-yellow-400",
                    )}
                  />
                  <div className={cn(
                    "relative rounded-lg p-1.5",
                    criticalMode ? "bg-red-500/20" : "bg-yellow-400/20",
                  )}>
                    {criticalMode
                      ? <Zap className="h-4 w-4 text-red-400" />
                      : <AlertTriangle className="h-4 w-4 text-yellow-300" />
                    }
                  </div>
                </div>

                <div>
                  <span className={cn(
                    "text-[9px] font-black tracking-[0.25em] uppercase",
                    criticalMode ? "text-red-400" : "text-yellow-300",
                  )}>
                    {criticalMode ? "⚠ Critical Anomaly Detected" : "⚡ Elevated Drift Warning"}
                  </span>
                  <p className="text-[13px] font-semibold text-white/85 mt-0.5">
                    {criticalMode
                      ? `${criticalCount} structure${criticalCount !== 1 ? "s" : ""} require immediate investigation.`
                      : `${warningCount} structure${warningCount !== 1 ? "s" : ""} show elevated drift signatures.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-8 md:pl-0">
                <Link
                  href={criticalMode ? "/alerts?status=pending&type=critical" : "/alerts?status=pending"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest transition-all",
                    criticalMode
                      ? "bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/25"
                      : "bg-yellow-400/10 text-yellow-200 border border-yellow-400/20 hover:bg-yellow-400/20",
                  )}
                >
                  Open Triage
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => setDismissed(true)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
                  aria-label="Dismiss alert banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
