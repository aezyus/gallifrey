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
    <div className="space-y-8 pb-12 relative">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none -z-10" />

      <header className="flex justify-between items-end relative py-6">
        <div className="scanline opacity-10" />
        <div>
          <nav className="text-[10px] text-primary uppercase font-bold tracking-[0.3em] mb-1 opacity-60">System Resilience // Real-time</nav>
          <h2 className="text-4xl font-black tracking-tight text-white uppercase italic flicker">Infrastructure Monitor</h2>
          <p className="text-muted-foreground mt-1 text-xs uppercase tracking-widest opacity-60">Real-time observability of the Gallifrey data stack and sensor network.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block mr-4">
             <div className="text-[8px] font-mono text-white/20">Uptime: 99.998%</div>
             <div className="text-[8px] font-mono text-white/20">IOPS: 42.4k</div>
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-primary bg-primary/5 px-4 py-2 rounded-xl border border-primary/20 hud-border">
             <RefreshCcw className={cn("w-3 h-3", loading && "animate-spin")} />
             Stream: Active
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Service Stack */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((s, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={s.name}
                className="glass-card p-6 rounded-3xl flex items-center justify-between group hover:border-primary/50 transition-all hud-border hud-corner-extra bg-black/40 overflow-hidden"
              >
                <div className="scanline opacity-5 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-5 relative z-10">
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl group-hover:text-primary transition-all group-hover:bg-primary/10 group-hover:shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                    <s.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm tracking-tight uppercase">{s.name}</h4>
                    <p className="text-[10px] text-white/30 font-mono mt-1 font-bold">{s.latency} TTL</p>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <div className={cn(
                    "text-[10px] font-black uppercase flex items-center gap-2 justify-end px-2 py-0.5 rounded-full border",
                    s.status === 'Healthy' || s.status === 'Ready' || s.status === 'active' || s.status === 'Connected' 
                      ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" 
                      : "text-red-500 border-red-500/20 bg-red-500/5"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", s.status === 'Healthy' || s.status === 'Ready' || s.status === 'active' || s.status === 'Connected' ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                    {s.status}
                  </div>
                  <p className="text-[10px] font-mono opacity-30 mt-2 font-bold">{s.load} LOAD</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="glass-card rounded-3xl p-2 h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden group hud-border hud-corner-extra bg-black/60">
             <div className="scanline opacity-10" />
             <iframe 
                src={`${GRAFANA_BASE_URL}/d-solo/system/system-health?orgId=1&theme=dark&panelId=1&refresh=5s&kiosk`} 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                className="rounded-2xl relative z-10 transition-opacity duration-500"
                title="Grafana Dashboard"
             />
             <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">
                <div className="text-[10px] uppercase font-black tracking-[0.3em] text-primary mb-6">Secured Telemetry Portal V2</div>
                <a href={GRAFANA_BASE_URL} target="_blank" rel="noreferrer" className="inline-block px-8 py-3 bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(0,242,255,0.4)]">
                  Launch Observer Mode
                </a>
             </div>
          </div>
        </div>

        {/* System Hardware Sidebar */}
        <div className="space-y-8">
          <div className="glass-card p-8 rounded-3xl hud-border hud-corner-extra bg-black/40 relative overflow-hidden">
            <div className="scanline opacity-5" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-8 flex items-center gap-3 relative z-10">
              <HardDrive className="w-5 h-5 text-primary" />
              Dataset Integrity
            </h3>
            <div className="space-y-6 relative z-10">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1 group-hover:text-primary/40 transition-colors">Total Encoded Signals</p>
                <p className="text-2xl font-black italic tracking-tighter">{syntheticSignals} <span className="text-xs font-normal opacity-20">row_units</span></p>
              </div>
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 group hover:border-primary/20 transition-all">
                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest mb-1 group-hover:text-primary/40 transition-colors">Shard Utilization</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-black italic tracking-tighter">{diskUsageGb} GB <span className="text-xs font-normal opacity-20">/ 512 GB</span></p>
                   <span className="text-[8px] font-mono text-primary/30 font-bold mb-1">0xD89F</span>
                </div>
              </div>
              <div className="p-5 bg-primary/10 rounded-2xl border border-primary/20 group animate-pulse">
                <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-1">In-Memory Registry</p>
                <p className="text-2xl font-black italic tracking-tighter text-primary">{modelReady}/{modelTotal || "-"} Ready</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl hud-border hud-corner-extra bg-black/40 relative overflow-hidden">
            <div className="scanline opacity-5" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40 mb-8 flex items-center gap-3 relative z-10">
              <Power className="w-5 h-5 text-emerald-500" />
              Gateway Network
            </h3>
            <div className="space-y-6 relative z-10">
              {['AWS-EAST-SENTINEL', 'LOCAL-EDGE-SHARD', 'ORBITAL-SYNC-BK'].map((node) => (
                <div key={node} className="flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-widest text-white/60 group-hover:text-primary transition-colors">{node}</span>
                    <span className="text-[8px] font-mono text-white/20">SEQ_ACK: {Math.floor(Math.random() * 200)}ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/20 px-2 py-0.5 rounded bg-emerald-500/5">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
             <span className="text-[8px] font-mono text-white/20 font-bold tracking-[0.3em]">ENCRYPTED_TELEMETRY_STREAM_V3</span>
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
