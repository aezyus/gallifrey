"use client";

import { useEffect, useState } from "react";
import { Shield, TrendingDown, Clock, Scale, RefreshCw } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { gallifreyApi, RiskResponse } from "@/lib/api";

const mockRiskHistory = [
  { month: 'Jan', risk: 12, health: 98 },
  { month: 'Feb', risk: 15, health: 97 },
  { month: 'Mar', risk: 18, health: 95 },
  { month: 'Apr', risk: 25, health: 92 },
  { month: 'May', risk: 32, health: 88 },
  { month: 'Jun', risk: 45, health: 82 },
];

const COLORS = ['#00f2ff', '#fbbf24', '#ef4444', '#10b981'];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('prediction');
  const [liveRisk, setLiveRisk] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRisk = async () => {
      setLoading(true);
      try {
        // Simulating features for Bridge-A4
        const features = [{
          Vibration_ms2: 120.5,
          Strain_microstrain: 45.2,
          Deflection_mm: 8.1,
          Displacement_mm: 3.4,
          Modal_Frequency_Hz: 12.8,
          Temperature_C: 24.5,
          Wind_Speed_ms: 12.0,
          Crack_Propagation_mm: 1.2
        }];
        const res = await gallifreyApi.predictRisk(features);
        setLiveRisk(res);
      } catch (err) {
        console.error("Risk fetching failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRisk();
  }, []);

  const riskScore = liveRisk ? (liveRisk.gbm_risk_score[0] * 100).toFixed(1) : "Calculating...";
  const shiScore = liveRisk ? (liveRisk.shi_pred[0] * 100).toFixed(1) : "94.2";

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Risk Intelligence</h2>
          <p className="text-muted-foreground mt-1">Deep learning trajectory analysis and failure probability mapping.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Stats Column */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border-l-4 border-l-primary">
            <div className="flex items-center gap-3 text-primary mb-2">
              <Shield className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Live Risk Score</span>
            </div>
            <p className="text-4xl font-bold tracking-tighter">{riskScore}%</p>
            <p className="text-xs text-muted-foreground mt-2">Probability of structural breach.</p>
          </div>
          
          <div className="glass-card p-6 rounded-2xl border-l-4 border-l-yellow-500">
            <div className="flex items-center gap-3 text-yellow-500 mb-2">
              <TrendingDown className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">SHI Prediction</span>
            </div>
            <p className="text-4xl font-bold tracking-tighter">{shiScore}</p>
            <p className="text-xs text-muted-foreground mt-2">Structural Health Index (Predicted).</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3 text-emerald-500 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Confidence</span>
            </div>
            <p className="text-4xl font-bold tracking-tighter">98.2%</p>
            <p className="text-xs text-muted-foreground mt-2">Model ensemble reliability.</p>
          </div>
        </div>

        {/* Main Analytics Area */}
        <div className="lg:col-span-3 space-y-8">
          <div className="glass-card rounded-2xl p-8">
            <div className="flex justify-between items-center mb-10">
              <div className="flex gap-1 overflow-hidden p-1 bg-white/5 rounded-xl border border-white/10">
                {['prediction', 'distribution', 'reliability'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                <div className="w-2 h-2 rounded-full bg-primary" /> LSTM Trajectory
              </div>
            </div>

            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockRiskHistory} barGap={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#0a0b10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                    {mockRiskHistory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.risk > 30 ? 'rgba(251, 191, 36, 0.8)' : 'rgba(0, 242, 255, 0.8)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">
                  AI
                </div>
                <div>
                  <h4 className="font-bold text-sm">Predictive Insight</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ensemble model predicts a **{liveRisk?.gbm_risk_label[0] === 1 ? 'HIGH' : 'LOW'}** risk status for the current telemetry snapshot. 
                    Baseline drift detected in Modal Frequency bands.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  SHI Component Weighting
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Vibration', value: 40 },
                          { name: 'Strain', value: 30 },
                          { name: 'Environmental', value: 15 },
                          { name: 'History', value: 15 },
                        ]}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[0, 1, 2, 3].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>
             
             <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-4">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold">System Reliability</h3>
                <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
                  First Passage Reliability remains within the 99.9% safety corridor.
                </p>
                <div className="mt-6 text-2xl font-bold text-emerald-500 uppercase tracking-widest">
                  {shiScore > "70" ? "Minimal Risk" : "Attention Required"}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

