"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Activity, 
  ShieldAlert, 
  LayoutDashboard, 
  Settings, 
  Box,
  Construction,
  Bot,
  Terminal,
  Cpu,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { gallifreyApi } from "@/lib/api";

const navItems = [
  { name: 'Fleet Overview', icon: LayoutDashboard, href: '/' },
  { name: 'Mission Control', icon: Terminal, href: '/control-room' },
  { name: 'Structures', icon: Construction, href: '/structures' },
  { name: 'Risk Analytics', icon: BarChart3, href: '/analytics' },
  { name: 'Alert Triage', icon: ShieldAlert, href: '/alerts' },
  { name: 'Infrastructure', icon: Cpu, href: '/infra' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mlStatus, setMlStatus] = useState(false);
  const [agenticStatus, setAgenticStatus] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const probe = async () => {
      try {
        const [mlHealth, agenticHealth] = await Promise.all([
          gallifreyApi.getHealth().then((data) => data?.status === "ok").catch(() => false),
          gallifreyApi.getAgenticHealth().then((data) => data.ok).catch(() => false),
        ]);

        setMlStatus(Boolean(mlHealth));
        setAgenticStatus(Boolean(agenticHealth));
      } catch {
        setMlStatus(false);
        setAgenticStatus(false);
      }
    };

    probe();
    const interval = setInterval(probe, 10000);
    return () => clearInterval(interval);
  }, []);

  const coreOnline = mlStatus && agenticStatus;

  return (
    <>
      <button
        onClick={() => setMobileOpen((prev) => !prev)}
        className="md:hidden fixed left-4 top-4 z-[60] rounded-xl border border-white/15 bg-black/70 p-2 text-white"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 glass-card border-r border-white/5 flex flex-col z-50 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10 group">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/30 group-hover:border-primary/60 transition-colors">
              <Box className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="font-black text-xl tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">GALLIFREY</h1>
            <p className="text-[9px] text-primary/70 uppercase font-bold tracking-[0.2em] leading-none mt-0.5">SHM Platform</p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/20 px-4 mb-2">Navigation</p>
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 relative",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-white/40 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav"
                      className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/15"
                      transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  {/* Left accent bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={cn(
                    "w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 relative z-10",
                    isActive ? "text-primary" : "text-white/35 group-hover:text-white/70"
                  )} />
                  <span className={cn(
                    "text-[13px] font-semibold relative z-10 tracking-tight",
                    isActive ? "text-primary" : ""
                  )}>{item.name}</span>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto w-1.5 h-1.5 bg-primary rounded-full relative z-10 shadow-[0_0_6px_rgba(0,242,255,0.8)]"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-auto p-5 space-y-3">
        {/* Service status rows */}
        <div className="p-4 bg-black/30 rounded-2xl border border-white/[0.07] space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bot className={cn("w-3.5 h-3.5", coreOnline ? "text-primary" : "text-red-400")} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">System Services</span>
          </div>

          {/* ML API row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                "status-dot flex-shrink-0",
                mlStatus ? "status-dot-healthy" : "status-dot-critical"
              )} />
              <span className="text-[11px] font-semibold text-white/60">ML Inference</span>
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
              mlStatus ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
            )}>{mlStatus ? "online" : "offline"}</span>
          </div>

          {/* Agentic API row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                "status-dot flex-shrink-0",
                agenticStatus ? "status-dot-healthy" : "status-dot-critical"
              )} />
              <span className="text-[11px] font-semibold text-white/60">Agentic LLM</span>
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
              agenticStatus ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
            )}>{agenticStatus ? "online" : "offline"}</span>
          </div>

          {/* Activity bar */}
          <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden mt-1">
            <motion.div
              animate={{ width: coreOnline ? ["20%", "90%", "55%", "75%"] : ["5%", "10%"] }}
              transition={{ duration: coreOnline ? 8 : 2, repeat: Infinity, ease: "easeInOut" }}
              className={cn("h-full rounded-full", coreOnline ? "bg-primary" : "bg-red-500")}
            />
          </div>
        </div>

        {/* Version / build tag */}
        <div className="flex items-center justify-between px-1 opacity-30">
          <span className="text-[9px] uppercase tracking-widest font-bold">GALLIFREY v2.0</span>
          <span className="text-[9px] font-mono">BUILD_042</span>
        </div>
      </div>
    </aside>
    </>
  );
}
