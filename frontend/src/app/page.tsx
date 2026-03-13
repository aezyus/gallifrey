"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Activity, ShieldAlert, Boxes, Waves, Zap, ArrowRight } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";

interface StructureHealth {
  id: string;
  name: string;
  health: number;
  status: "Safe" | "Warning" | "Critical";
}

export default function Dashboard() {
  const { isConnected, lastResponse } = useAnomalySocket({
    autoTelemetry: true,
    intervalMs: 1000,
    sampleCount: 5,
    featureCount: 8,
  });

  const [performanceData, setPerformanceData] = useState([
    { time: '00:00:00', strain: 48, vibration: 0.16 },
    { time: '00:00:03', strain: 52, vibration: 0.19 },
    { time: '00:00:06', strain: 50, vibration: 0.17 },
  ]);
  const [structures, setStructures] = useState<StructureHealth[]>([
    { id: 'bridge-a4', name: 'Bridge-A4 (Main)', health: 92, status: 'Safe' },
    { id: 'west-arch', name: 'West-Arch-Span', health: 88, status: 'Safe' },
    { id: 'north-pillar', name: 'North-Support-Pillar', health: 74, status: 'Warning' },
    { id: 'east-extension', name: 'East-Extension', health: 81, status: 'Safe' },
  ]);
  const [recentAnomalies, setRecentAnomalies] = useState(0);

  useEffect(() => {
    if (!lastResponse) return;

    const anomalyCount = lastResponse.is_anomaly.filter(Boolean).length;
    const avgIso =
      lastResponse.isolation_forest_score.reduce((acc, val) => acc + Math.abs(val), 0) /
      Math.max(1, lastResponse.isolation_forest_score.length);
    const reconAvg =
      (lastResponse.reconstruction_error?.reduce((acc, val) => acc + val, 0) ?? 0) /
      Math.max(1, lastResponse.reconstruction_error?.length ?? 1);

    const strain = Math.min(100, Math.max(25, 40 + avgIso * 130 + anomalyCount * 8));
    const vibration = Math.min(1, Math.max(0.08, 0.1 + reconAvg * 8));

    setPerformanceData((prev) => {
      const next = [
        ...prev,
        {
          time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          strain: Number(strain.toFixed(2)),
          vibration: Number(vibration.toFixed(3)),
        },
      ];
      if (next.length > 28) next.shift();
      return next;
    });

    setRecentAnomalies((prev) => Math.min(999, prev + anomalyCount));

    setStructures((prev) =>
      prev.map((item, idx) => {
        const pressure = lastResponse.is_anomaly[idx] ? 8 : 1.5;
        const scorePenalty = Math.max(0, (Math.abs(lastResponse.isolation_forest_score[idx] ?? 0) - 0.02) * 80);
        const drift = pressure + scorePenalty;
        const nextHealth = Math.max(18, Math.min(99, item.health - drift * 0.18 + Math.random() * 0.9));
        const status: StructureHealth["status"] = nextHealth > 82 ? "Safe" : nextHealth > 58 ? "Warning" : "Critical";
        return { ...item, health: Number(nextHealth.toFixed(1)), status };
      }),
    );
  }, [lastResponse]);

  const fleetSHI = (structures.reduce((acc, current) => acc + current.health, 0) / structures.length).toFixed(1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 relative">
      {/* Global Background Grid */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none -z-10" />
      
      <header className="flex justify-between items-end relative">
        <div className="scanline opacity-20" />
        <div>
          <nav className="flex items-center gap-2 text-[10px] text-primary uppercase font-bold tracking-widest mb-1">
             <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
             {isConnected ? "Live Fleet Analytics" : "Telemetry Reconnecting"}
             <span className="ml-4 opacity-30 font-mono">SEQ_ID: {Math.floor(Math.random() * 10000)}</span>
          </nav>
          <h2 className="text-4xl font-black tracking-tight text-white uppercase italic flicker">Fleet Intelligence</h2>
          <p className="text-muted-foreground mt-1 text-xs uppercase tracking-widest opacity-60">Real-time aggregate analysis across distributed SHM nodes.</p>
        </div>
        <div className="hidden md:flex gap-4">
          <div className="text-right p-4 glass-card rounded-2xl border-primary/20 bg-primary/5 hud-border hud-corner-extra">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1">Global SHI</p>
            <p className="text-3xl font-black text-primary italic leading-none">{fleetSHI}%</p>
            <div className="mt-2 text-[8px] font-mono text-white/20">SYSTEM_READY // 0xAF42</div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="hud-border hud-corner-extra rounded-2xl overflow-hidden group">
          <div className="scanline group-hover:opacity-100 opacity-0 transition-opacity" />
          <StatsCard 
            title="Active Sensors" 
            value={isConnected ? "1,242" : "1,187"} 
            description={isConnected ? "99.8% Connectivity" : "96.2% Connectivity"} 
            icon={Activity} 
            variant="safe"
          />
        </div>
        <div className="hud-border hud-corner-extra rounded-2xl overflow-hidden group">
           <div className="scanline group-hover:opacity-100 opacity-0 transition-opacity" />
           <StatsCard 
            title="Risk Anomalies" 
            value={String(recentAnomalies)} 
            description="Detected from live telemetry stream" 
            trend={recentAnomalies > 0 ? 15 : 0}
            icon={ShieldAlert} 
            variant="warning"
          />
        </div>
        <div className="hud-border hud-corner-extra rounded-2xl overflow-hidden group">
           <div className="scanline group-hover:opacity-100 opacity-0 transition-opacity" />
           <StatsCard 
            title="Monitored Structures" 
            value="24" 
            description="Districts: 4" 
            icon={Boxes} 
          />
        </div>
        <div className="hud-border hud-corner-extra rounded-2xl overflow-hidden group">
           <div className="scanline group-hover:opacity-100 opacity-0 transition-opacity" />
           <StatsCard 
            title="Avg PoF" 
            value={`${Math.max(0.3, Number((recentAnomalies / 60).toFixed(1)))}%`} 
            description="Prob. of Failure (Fleet Avg)" 
            icon={Zap} 
            variant="safe"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Performance Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-card p-8 rounded-3xl relative overflow-hidden group hud-border hud-corner-extra"
        >
          <div className="scanline opacity-10" />
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
             <Waves className="w-24 h-24 text-primary" />
          </div>
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-3 uppercase tracking-widest">
                <div className="p-2 bg-primary/10 rounded-lg"><Waves className="w-5 h-5 text-primary" /></div>
                Structural Dynamics (24h)
              </h3>
              <span className="text-[8px] font-mono text-white/30 ml-12">DATA_STREAM: [LIVE_FED_CHANNEL_01]</span>
            </div>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,242,255,0.8)]" /> Load Strain</span>
            </div>
          </div>
          
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorStrain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0b10', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="strain" 
                  stroke="var(--primary)" 
                  fillOpacity={1} 
                  fill="url(#colorStrain)" 
                  strokeWidth={3} 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute bottom-4 left-8 text-[8px] font-mono text-white/20">BUFFER_LIMIT: 1024KB // PARITY_CHECK: PASSED</div>
        </motion.div>

        {/* Health Leaderboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8 rounded-3xl flex flex-col h-full bg-white/[0.02] hud-border hud-corner-extra relative overflow-hidden"
        >
          <div className="scanline opacity-5" />
          <h3 className="text-lg font-bold mb-8 flex items-center gap-3 uppercase tracking-widest relative z-10">
             <div className="p-2 bg-emerald-500/10 rounded-lg"><Activity className="w-5 h-5 text-emerald-500" /></div>
             Health Status
          </h3>
          <div className="space-y-8 flex-1 relative z-10">
            {structures.map((item, idx) => (
              <Link key={idx} href={`/structures/${item.id}`} className="block group">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.name}</span>
                      <span className="text-[8px] font-mono text-white/20">ADDR: {item.id.toUpperCase()}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded border transition-colors",
                      item.status === 'Safe' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : 
                      item.status === 'Warning' ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/5" : 
                      "text-red-500 border-red-500/20 bg-red-500/5"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.health}%` }}
                      transition={{ duration: 1.5, delay: idx * 0.1 }}
                      className={cn(
                        "h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]",
                        item.health > 80 ? "bg-emerald-500 shadow-emerald-500/40" : item.health > 50 ? "bg-yellow-500 shadow-yellow-500/40" : "bg-red-500 shadow-red-500/40"
                      )}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          <Link 
            href="/structures" 
            className="mt-10 group flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all duration-300 text-[10px] font-black uppercase tracking-[0.2em] relative z-10"
          >
            Expand Fleet Inventory
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
