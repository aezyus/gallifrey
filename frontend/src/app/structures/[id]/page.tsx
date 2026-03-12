"use client";

import { WaveletScalogram } from "@/components/WaveletScalogram";
import { StatsCard } from "@/components/StatsCard";
import { DigitalTwin } from "@/components/DigitalTwin";
import { 
  History, Info, Waves, Activity, AlertTriangle, Zap, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const mockHistoricalHealth = [
  { day: 'Mon', health: 94 },
  { day: 'Tue', health: 93 },
  { day: 'Wed', health: 95 },
  { day: 'Thu', health: 88 },
  { day: 'Fri', health: 92 },
  { day: 'Sat', health: 91 },
  { day: 'Sun', health: 92 },
];

export default function StructureDetail({ params }: { params: { id: string } }) {
  const structureName = params.id.toUpperCase().replace('-', ' ');

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center gap-6">
        <Link href="/structures" className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <nav className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">
            <Link href="/structures" className="hover:text-primary transition-colors">Structures</Link>
            <span>/</span>
            <span className="text-foreground">{params.id}</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight">{structureName}</h1>
        </div>
        
        <div className="ml-auto flex gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-500 flex items-center gap-2 uppercase tracking-widest">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" /> Normal
          </div>
          <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-widest">
            Digital Twin Synchronized
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Overviews */}
        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatsCard 
              title="Vibration (RMS)" 
              value="0.24g" 
              description="Delta from baseline: +2%" 
              icon={Activity} 
            />
            <StatsCard 
              title="Deterioration Rate" 
              value="0.05%" 
              description="Monthly SHI decay" 
              icon={Zap} 
            />
          </div>

          <DigitalTwin />

          <div className="glass-card p-8 rounded-2xl relative">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                <History className="w-5 h-5 text-primary" />
                SHI History (7 Days)
              </h3>
              <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md opacity-100">7D</button>
                <button className="px-3 py-1 opacity-40">30D</button>
                <button className="px-3 py-1 opacity-40">MAX</button>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockHistoricalHealth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={[80, 100]} stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0b10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Line type="stepAfter" dataKey="health" stroke="var(--primary)" strokeWidth={3} dot={{ fill: 'var(--primary)', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="space-y-8">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground mb-6">
              <Waves className="w-4 h-4" />
              Spectral Analysis
            </h3>
            <WaveletScalogram />
            <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
              Real-time CWT decomposition showing structural resonant frequencies. Anomalous energy spikes in the 20-30Hz band indicate local joint flex.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl bg-primary/5 border-primary/20">
            <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-primary mb-4">
              <Info className="w-4 h-4" />
              Research Context
            </h3>
            <div className="space-y-4">
              <div className="pb-4 border-b border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Reliability Model</p>
                <p className="text-xs font-medium">Littlewood-Paley Wavelet Basis</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Passage Rate</p>
                <p className="text-xs font-medium">First-Passage Probability: 0.002%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
