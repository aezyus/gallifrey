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
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/40 group-hover:scale-110 transition-transform">
            <Box className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter italic text-white">GALLIFREY</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-none">Intelligence Hub</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110 relative z-10",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="text-sm font-bold relative z-10">{item.name}</span>
                {isActive && (
                   <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto w-1.5 h-1.5 bg-primary rounded-full relative z-10" 
                   />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        {/* Agentic Status Card */}
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Bot className={cn("w-4 h-4", coreOnline ? "text-primary animate-pulse" : "text-red-400")} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Core Status</span>
            </div>
            <p className="text-xs font-bold text-white mb-2">{coreOnline ? "Inference + Agentic online" : "Backend degraded"}</p>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
               <motion.div 
                animate={{ width: coreOnline ? ["15%", "95%", "45%", "72%"] : ["8%", "12%"] }}
                transition={{ duration: coreOnline ? 10 : 2, repeat: Infinity }}
                className={cn("h-full", coreOnline ? "bg-primary" : "bg-red-500")} 
               />
            </div>
            <div className="mt-2 flex justify-between text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
              <span className={mlStatus ? "text-emerald-400" : "text-red-400"}>ML API</span>
              <span className={agenticStatus ? "text-emerald-400" : "text-red-400"}>Agentic API</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 opacity-40">
           <div className="w-2 h-2 bg-emerald-500 rounded-full" />
           <span className="text-[10px] uppercase font-bold tracking-widest">Network Secure</span>
        </div>
      </div>
    </aside>
    </>
  );
}
