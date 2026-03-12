"use client";

import { useEffect, useState } from "react";
import { Settings, Database, Server, BarChart3, Wifi, Power, HardDrive, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { gallifreyApi } from "@/lib/api";

export default function InfraPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await gallifreyApi.getHealth();
        setHealthData(data);
      } catch (err) {
        console.error("Health check failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { name: 'TimescaleDB', status: healthData?.services?.database || 'Pending', latency: '4ms', load: '12%', icon: Database },
    { name: 'FastAPI Server', status: healthData?.status === 'ok' ? 'Healthy' : 'Disconnected', latency: '24ms', load: '34%', icon: Server },
    { name: 'Model Engine', status: healthData?.model_available ? 'Ready' : 'Not Loaded', latency: '12ms', load: '8%', icon: Cpu },
    { name: 'Prometheus', status: 'Connected', latency: '12ms', load: '8%', icon: BarChart3 },
    { name: 'IoT Gateway', status: 'Healthy', latency: '82ms', load: '21%', icon: Wifi },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Infrastructure Monitor</h2>
          <p className="text-muted-foreground mt-1">Real-time observability of the Gallifrey data stack and sensor network.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
           <RefreshCcw className={cn("w-3 h-3", loading && "animate-spin")} />
           Auto-Refreshing
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Service Stack */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((s, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={s.name}
                className="glass-card p-5 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl group-hover:text-primary transition-colors">
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-tight">{s.name}</h4>
                    <p className="text-xs text-muted-foreground">{s.latency} Latency</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-[10px] font-black uppercase flex items-center gap-1 justify-end",
                    s.status === 'Healthy' || s.status === 'Ready' || s.status === 'active' || s.status === 'Connected' ? "text-emerald-500" : "text-red-500"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", s.status === 'Healthy' || s.status === 'Ready' || s.status === 'active' || s.status === 'Connected' ? "bg-emerald-500" : "bg-red-500")} />
                    {s.status}
                  </div>
                  <p className="text-xs font-mono opacity-40 mt-1">{s.load} Load</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-8 h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-primary/20 blur-[100px] -top-1/2 -left-1/2" />
                <div className="absolute inset-0 bg-purple-500/20 blur-[100px] -bottom-1/2 -right-1/2" />
             </div>
             
             <div className="relative z-10">
                <div className="w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mb-6 mx-auto">
                   <BarChart3 className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Metrics Virtualization</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-8">
                  Integrated Prometheus & Grafana dashboarding for deep-dive sensor analysis.
                </p>
                <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="inline-block px-8 py-3 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(0,242,255,0.3)] transition-all">
                  Launch Grafana Portal
                </a>
             </div>
          </div>
        </div>

        {/* System Hardware Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Dataset Integrity
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Total Signals</p>
                <p className="text-xl font-bold">4.2M Rows</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Disk Usage</p>
                <p className="text-xl font-bold">128 GB <span className="text-xs font-normal opacity-40">/ 512 GB</span></p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
              <Power className="w-4 h-4" />
              Gateway Status
            </h3>
            <div className="space-y-4">
              {['AWS-East-1', 'Local-Edge-01', 'Backup-Sync'].map((node) => (
                <div key={node} className="flex justify-between items-center text-xs">
                  <span className="font-medium text-muted-foreground">{node}</span>
                  <span className="font-bold text-primary">CONNECTED</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Cpu = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M15 2v2" />
    <path d="M15 20v2" />
    <path d="M2 15h2" />
    <path d="M2 9h2" />
    <path d="M20 15h2" />
    <path d="M20 9h2" />
    <path d="M9 2v2" />
    <path d="M9 20v2" />
  </svg>
)
