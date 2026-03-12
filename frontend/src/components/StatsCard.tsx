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

export function StatsCard({ title, value, description, trend, icon: Icon, variant = 'default' }: StatsCardProps) {
  const themes = {
    default: "text-primary border-primary/20",
    safe: "text-green-500 border-green-500/20",
    warning: "text-yellow-500 border-yellow-500/20",
    critical: "text-red-500 border-red-500/20"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-primary/40 transition-colors"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl bg-blend-soft-light bg-opacity-10", themes[variant])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trend > 0 ? "text-red-400" : "text-green-400")}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest leading-none">{title}</h3>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
        {description}
      </p>

      {/* Decorative pulse background */}
      <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 rounded-full", themes[variant].split(' ')[0])} />
    </motion.div>
  );
}
