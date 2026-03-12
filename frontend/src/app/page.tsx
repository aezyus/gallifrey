"use client";

import { StatsCard } from "@/components/StatsCard";
import { Activity, ShieldAlert, Boxes, Waves, Thermometer, Zap, ArrowRight } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

const mockPerformanceData = [
  { time: '00:00', strain: 45, vibration: 0.12 },
  { time: '04:00', strain: 52, vibration: 0.15 },
  { time: '08:00', strain: 85, vibration: 0.45 },
  { time: '12:00', strain: 92, vibration: 0.52 },
  { time: '16:00', strain: 78, vibration: 0.38 },
  { time: '20:00', strain: 58, vibration: 0.22 },
  { time: '23:59', strain: 48, vibration: 0.14 },
];

const mockStructureHealth = [
  { id: 'bridge-a4', name: 'Bridge-A4 (Main)', health: 92, status: 'Safe' },
  { id: 'west-arch', name: 'West-Arch-Span', health: 85, status: 'Safe' },
  { id: 'north-pillar', name: 'North-Support-Pillar', health: 42, status: 'Critical' },
  { id: 'east-extension', name: 'East-Extension', health: 65, status: 'Warning' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-[10px] text-primary uppercase font-bold tracking-widest mb-1">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live Fleet Analytics
          </nav>
          <h2 className="text-4xl font-black tracking-tight text-white uppercase italic">Fleet Intelligence</h2>
          <p className="text-muted-foreground mt-1">Real-time aggregate analysis across distributed SHM nodes.</p>
        </div>
        <div className="hidden md:flex gap-4">
          <div className="text-right p-4 glass-card rounded-2xl border-primary/20 bg-primary/5">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1">Global SHI</p>
            <p className="text-3xl font-black text-primary italic leading-none">84.2%</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Active Sensors" 
          value="1,242" 
          description="99.8% Connectivity" 
          icon={Activity} 
          variant="safe"
        />
        <StatsCard 
          title="Risk Anomalies" 
          value="12" 
          description="Detected in last 24h" 
          trend={15}
          icon={ShieldAlert} 
          variant="warning"
        />
        <StatsCard 
          title="Monitored Structures" 
          value="24" 
          description="Districts: 4" 
          icon={Boxes} 
        />
        <StatsCard 
          title="Avg PoF" 
          value="2.4%" 
          description="Prob. of Failure (Fleet Avg)" 
          icon={Zap} 
          variant="safe"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Performance Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-card p-8 rounded-3xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
             <Waves className="w-24 h-24 text-primary" />
          </div>
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-lg font-bold flex items-center gap-3 uppercase tracking-widest">
              <div className="p-2 bg-primary/10 rounded-lg"><Waves className="w-5 h-5 text-primary" /></div>
              Structural Dynamics (24h)
            </h3>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-primary rounded-full" /> Load Strain</span>
            </div>
          </div>
          
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockPerformanceData}>
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
                  contentStyle={{ backgroundColor: '#0a0b10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
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
        </motion.div>

        {/* Health Leaderboard */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8 rounded-3xl flex flex-col h-full bg-white/[0.02]"
        >
          <h3 className="text-lg font-bold mb-8 flex items-center gap-3 uppercase tracking-widest">
             <div className="p-2 bg-emerald-500/10 rounded-lg"><Activity className="w-5 h-5 text-emerald-500" /></div>
             Health Status
          </h3>
          <div className="space-y-8 flex-1">
            {mockStructureHealth.map((item, idx) => (
              <Link key={idx} href={`/structures/${item.id}`} className="block group">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.name}</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded border transition-colors",
                      item.status === 'Safe' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5 text-xs" : 
                      item.status === 'Warning' ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/5" : 
                      "text-red-500 border-red-500/20 bg-red-500/5"
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.health}%` }}
                      transition={{ duration: 1.5, delay: idx * 0.1 }}
                      className={cn(
                        "h-full rounded-full",
                        item.health > 80 ? "bg-emerald-500" : item.health > 50 ? "bg-yellow-500" : "bg-red-500"
                      )}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          <Link 
            href="/structures" 
            className="mt-10 group flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            Expand Fleet Inventory
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
