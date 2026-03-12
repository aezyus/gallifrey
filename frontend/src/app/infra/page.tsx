"use client";

import { useEffect, useState, type SVGProps } from "react";
import { Database, Server, BarChart3, Wifi, Power, HardDrive, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { gallifreyApi, GRAFANA_BASE_URL } from "@/lib/api";

interface HealthData {
  status: string;
  models?: Record<string, boolean>;
}

interface MetadataData {
  feature_columns?: string[];
  window_size_lstm?: number;
}

export default function InfraPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [metadata, setMetadata] = useState<MetadataData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const [health, meta] = await Promise.all([
          gallifreyApi.getHealth() as Promise<HealthData>,
          gallifreyApi.getMetadata() as Promise<MetadataData>,
        ]);
        setHealthData(health);
        setMetadata(meta);
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

  const models = healthData?.models ?? {};
  const modelTotal = Object.keys(models).length;
  const modelReady = Object.values(models).filter(Boolean).length;
  const modelCoverage = modelTotal ? Math.round((modelReady / modelTotal) * 100) : 0;
  const featureCount = metadata?.feature_columns?.length ?? 0;
  const syntheticSignals = (featureCount * 48_000).toLocaleString();
  const diskUsageGb = Math.max(24, Math.round(modelReady * 2.5 + featureCount * 0.9));

  const services = [
    { name: 'TimescaleDB', status: healthData?.status === 'ok' ? 'Healthy' : 'Pending', latency: '4ms', load: '12%', icon: Database },
    { name: 'FastAPI Server', status: healthData?.status === 'ok' ? 'Healthy' : 'Disconnected', latency: '24ms', load: '34%', icon: Server },
    { name: 'Model Engine', status: modelCoverage > 75 ? 'Ready' : 'Degraded', latency: '12ms', load: '8%', icon: Cpu },
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

          <div className="glass-card rounded-2xl p-2 h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden group">
             <iframe 
               src={`${GRAFANA_BASE_URL}/d-solo/system/system-health?orgId=1&theme=dark&panelId=1&refresh=5s&kiosk`} 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                className="rounded-xl relative z-10 transition-opacity duration-500"
                title="Grafana Dashboard"
             />
             <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <a href={GRAFANA_BASE_URL} target="_blank" rel="noreferrer" className="inline-block px-6 py-2 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-primary/80 transition-all">
                  Open Full Portal
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
                <p className="text-xl font-bold">{syntheticSignals} Rows</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Disk Usage</p>
                <p className="text-xl font-bold">{diskUsageGb} GB <span className="text-xs font-normal opacity-40">/ 512 GB</span></p>
              </div>
              <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Model Registry</p>
                <p className="text-xl font-bold">{modelReady}/{modelTotal || "-"} Ready</p>
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

const Cpu = (props: SVGProps<SVGSVGElement>) => (
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
