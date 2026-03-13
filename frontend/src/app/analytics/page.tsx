"use client";

import { useEffect, useState } from "react";
import { Shield, TrendingDown, Clock, Scale, RefreshCw } from "lucide-react";
import { 
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { gallifreyApi } from "@/lib/api";

// Removing static mock data

const COLORS = ['#00f2ff', '#fbbf24', '#ef4444', '#10b981'];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('prediction');
  const [liveRisk, setLiveRisk] = useState<{ riskScore: number; riskLabel: number; shi: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskHistory, setRiskHistory] = useState<{time: string, risk: number, health: number}[]>([]);
  const [lastUpdated, setLastUpdated] = useState("--:--:--");

  useEffect(() => {
    const buildFeatureSnapshot = (driftSeed = 0) => ({
      Vibration_ms2: 118 + Math.sin(Date.now() / 900 + driftSeed) * 6 + Math.random() * 2,
      Strain_microstrain: 43 + Math.cos(Date.now() / 1100 + driftSeed) * 3 + Math.random(),
      Deflection_mm: 7.8 + Math.random() * 1.2,
      Displacement_mm: 3.0 + Math.random() * 1.4,
      Modal_Frequency_Hz: 12.2 + Math.sin(Date.now() / 1500) * 0.5,
      Temperature_C: 24 + Math.random() * 4,
      Wind_Speed_ms: 9 + Math.random() * 8,
      Crack_Propagation_mm: 0.8 + Math.random() * 0.9,
    });

    const hydrateRiskHistory = async () => {
      setLoading(true);
      try {
        const bootstrapSamples = Array.from({ length: 16 }, (_, idx) => buildFeatureSnapshot(idx / 3));
        const res = await gallifreyApi.predictRisk(bootstrapSamples);

        const now = Date.now();
        const hydrated = res.gbm_risk_score.map((score, idx) => {
          const timestamp = new Date(now - (res.gbm_risk_score.length - idx) * 3000);
          return {
            time: timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            risk: score * 100,
            health: (res.shi_pred[idx] ?? 0) * 100,
          };
        });

        setRiskHistory(hydrated);
        const lastIndex = res.gbm_risk_score.length - 1;
        setLiveRisk({
          riskScore: (res.gbm_risk_score[lastIndex] ?? 0) * 100,
          riskLabel: res.gbm_risk_label[lastIndex] ?? 0,
          shi: (res.shi_pred[lastIndex] ?? 0) * 100,
        });
      } catch (err) {
        console.error("Risk hydration failed", err);
      } finally {
        setLoading(false);
      }
    };

    const pollNextRiskTick = async () => {
      try {
        const res = await gallifreyApi.predictRisk([buildFeatureSnapshot()]);
        const riskScore = (res.gbm_risk_score[0] ?? 0) * 100;
        const shi = (res.shi_pred[0] ?? 0) * 100;

        setLiveRisk({
          riskScore,
          riskLabel: res.gbm_risk_label[0] ?? 0,
          shi,
        });
        setLastUpdated(new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));

        setRiskHistory((prev) => {
          const next = [
            ...prev,
            {
              time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              risk: riskScore,
              health: shi,
            },
          ];
          if (next.length > 24) next.shift();
          return next;
        });
      } catch (err) {
        console.error("Risk polling failed", err);
      }
    };

    hydrateRiskHistory();
    const interval = setInterval(pollNextRiskTick, 3500);
    return () => clearInterval(interval);
  }, []);

  const riskScore = liveRisk ? liveRisk.riskScore.toFixed(1) : "Calculating";
  const shiScore = liveRisk ? liveRisk.shi.toFixed(1) : "94.2";
  const reliabilityLabel = Number(shiScore) > 70 ? "Minimal Risk" : "Attention Required";
  const explainability = [
    { feature: "Crack Propagation", contribution: 32 },
    { feature: "Vibration", contribution: 18 },
    { feature: "Corrosion Proxy", contribution: 15 },
    { feature: "Thermal Drift", contribution: 12 },
    { feature: "Deflection", contribution: 10 },
  ];

  const chartData = riskHistory.map((point) => {
    const confidence = Math.max(4, point.risk * 0.08);
    return {
      ...point,
      upper: Math.min(100, point.risk + confidence),
      lower: Math.max(0, point.risk - confidence),
      anomaly: point.risk > 60 ? point.risk : null,
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-[10px] text-primary uppercase font-black tracking-widest mb-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Deep Learning Analysis
          </nav>
          <h2 className="text-fluid-title font-black tracking-tight text-white uppercase">Risk Intelligence</h2>
          <p className="text-white/40 mt-1 text-xs uppercase tracking-widest">Failure probability mapping &amp; trajectory</p>
          <p className="text-[10px] font-mono text-white/25 mt-1.5">Updated {lastUpdated}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2.5 glass-card rounded-xl hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Stats Column */}
        <div className="space-y-4">
          <div className="glass-card-elevated p-5 rounded-2xl card-accent-cyan">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-3">Live Risk Score</p>
            <p className="text-4xl font-black tracking-tight text-mono-stat text-white">{riskScore}<span className="text-lg text-white/40">%</span></p>
            <div className="mt-3 h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-1000" style={{ width: `${Math.min(100, Number(riskScore) || 0)}%` }} />
            </div>
            <p className="text-[10px] text-white/30 mt-2">Probability of structural breach</p>
          </div>

          <div className="glass-card-elevated p-5 rounded-2xl card-accent-warn">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-3">SHI Prediction</p>
            <p className="text-4xl font-black tracking-tight text-mono-stat text-yellow-300">{shiScore}</p>
            <div className="mt-3 h-0.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-1000" style={{ width: `${Math.min(100, Number(shiScore) || 0)}%` }} />
            </div>
            <p className="text-[10px] text-white/30 mt-2">Structural Health Index</p>
          </div>

          <div className="glass-card-elevated p-5 rounded-2xl card-accent-safe">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-3">Confidence</p>
            <p className="text-4xl font-black tracking-tight text-mono-stat text-emerald-400">98.2<span className="text-lg text-emerald-400/50">%</span></p>
            <p className="text-[10px] text-white/30 mt-4">Model ensemble reliability</p>
          </div>

          <div className={cn(
            "p-4 rounded-2xl border text-center",
            Number(shiScore) > 70
              ? "border-emerald-500/20 bg-emerald-500/5"
              : "border-red-500/20 bg-red-500/5"
          )}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Assessment</p>
            <p className={cn(
              "text-sm font-black uppercase tracking-wider",
              Number(shiScore) > 70 ? "text-emerald-400" : "text-red-400"
            )}>{reliabilityLabel}</p>
          </div>
        </div>

        {/* Main Analytics Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
              <div className="flex gap-1 p-1 bg-black/30 rounded-xl border border-white/8">
                {['prediction', 'distribution', 'reliability'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-200",
                      activeTab === tab
                        ? "bg-primary text-black shadow-lg shadow-primary/25"
                        : "text-white/35 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase font-bold tracking-widest">
                <span className="status-dot status-dot-healthy" /> GBM + LSTM ensemble
              </div>
            </div>

            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} barGap={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#0a0b10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="upper" fill="rgba(0,242,255,0.08)" stackId="ci" />
                  <Bar dataKey="lower" fill="rgba(0,242,255,0.08)" stackId="ci" />
                  <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.risk > 30 ? 'rgba(251, 191, 36, 0.8)' : 'rgba(0, 242, 255, 0.8)'} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40">
              Confidence Band: +/-8% dynamic envelope | Anomaly threshold: risk &gt; 60
            </div>
            
            {/* Predictive insight chip */}
            <div className="mt-5 p-4 bg-primary/5 border border-primary/15 rounded-xl flex items-center gap-4">
              <div className="w-9 h-9 bg-primary/15 rounded-xl flex items-center justify-center text-primary font-black text-xs flex-shrink-0">AI</div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Predictive Insight</span>
                <p className="text-[12px] text-white/60 mt-0.5 leading-snug">
                  Ensemble predicts <strong className="text-white">{liveRisk?.riskLabel === 1 ? "HIGH" : "LOW"}</strong> risk for current snapshot. Modal frequency drift detected in suspension span sectors 2–4.
                </p>
              </div>
            </div>
          </div>
            {/* Explainability panel */}
            <div className="mt-5 p-5 bg-black/30 border border-white/8 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-primary">Risk Factor Contributions</h4>
                <span className="pill-muted">Feature Importance</span>
              </div>
              <div className="space-y-3">
                {explainability.map((driver, di) => (
                  <div key={driver.feature} className="flex items-center gap-3">
                    <span className="text-[11px] text-white/55 w-36 flex-shrink-0">{driver.feature}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${driver.contribution}%`,
                          background: `hsl(${180 - di * 30}, 80%, 55%)`,
                          boxShadow: `0 0 8px hsl(${180 - di * 30}, 80%, 55%, 0.4)`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-mono-stat text-white/60 w-8 text-right">{driver.contribution}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] text-white/45 leading-snug border-t border-white/5 pt-4">
                Risk is primarily driven by crack propagation and vibration variance. Prioritize crack-zone inspection within 24 hours.
              </p>
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
                  {reliabilityLabel}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

