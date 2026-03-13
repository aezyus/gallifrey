"use client";

import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: number;
  icon: LucideIcon;
  variant?: 'default' | 'warning' | 'critical' | 'safe';
}

const themes = {
  default: {
    icon: "bg-primary/10 text-primary border-primary/20",
    accent: "card-accent-cyan",
    glow: "rgba(0,242,255,0.08)",
    value: "text-white",
    badge: "bg-primary/10 text-primary",
  },
  safe: {
    icon: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    accent: "card-accent-safe",
    glow: "rgba(16,185,129,0.08)",
    value: "text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400",
  },
  warning: {
    icon: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
    accent: "card-accent-warn",
    glow: "rgba(234,179,8,0.08)",
    value: "text-yellow-300",
    badge: "bg-yellow-500/10 text-yellow-300",
  },
  critical: {
    icon: "bg-red-500/10 text-red-400 border-red-500/20",
    accent: "card-accent-crit",
    glow: "rgba(239,68,68,0.08)",
    value: "text-red-400",
    badge: "bg-red-500/10 text-red-400",
  },
};

export function StatsCard({ title, value, description, trend, icon: Icon, variant = 'default' }: StatsCardProps) {
  const t = themes[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "glass-card p-6 rounded-2xl relative overflow-hidden group transition-all duration-300",
        "hover:bg-white/[0.055] hover:shadow-lg",
        t.accent,
      )}
      style={{ boxShadow: `0 4px 24px ${t.glow}` }}
    >
      {/* Top row: icon + trend */}
      <div className="flex justify-between items-start mb-5">
        <div className={cn("p-3 rounded-xl border", t.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <span className={cn(
            "flex items-center gap-1 text-[10px] font-bold tracking-wider px-2 py-1 rounded-full border",
            trend > 0
              ? "bg-red-500/10 text-red-400 border-red-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          )}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Label */}
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40 mb-1">{title}</p>

      {/* Value */}
      <p className={cn("text-3xl font-black tracking-tight leading-none text-mono-stat", t.value)}>{value}</p>

      {/* Description */}
      <p className="text-[11px] text-white/40 mt-3 leading-tight">{description}</p>

      {/* Radial glow blob */}
      <div
        className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl opacity-20 pointer-events-none group-hover:opacity-35 transition-opacity"
        style={{ background: t.glow.replace('0.08', '1') }}
      />

      {/* Shimmer on hover */}
      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
    </motion.div>
  );
}
