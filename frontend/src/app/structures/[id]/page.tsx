"use client";

import { StatsCard } from "@/components/StatsCard";
import { 
  History, Info, Waves, Activity, Zap, ArrowLeft, PlusCircle, FileDown
} from "lucide-react";
import Link from "next/link";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { gallifreyApi, SensorRecord, StructureRecord } from "@/lib/api";
import { useAnomalySocket } from "@/hooks/useAnomalySocket";
import { cn } from "@/lib/utils";
import { DigitalTwin3D } from "@/components/Bridge3D";

export default function StructureDetail() {
  const params = useParams<{ id: string }>();
  const structureId = Number(params.id);
  const [structure, setStructure] = useState<StructureRecord | null>(null);
  const [sensors, setSensors] = useState<SensorRecord[]>([]);
  const [history, setHistory] = useState<{ time: string; health: number }[]>([]);
  const [currentVibration, setCurrentVibration] = useState("0.24");
  const [sensorName, setSensorName] = useState("");
  const [sensorType, setSensorType] = useState("strain_gauge");
  const [busy, setBusy] = useState(false);

  const { lastResponse, isConnected } = useAnomalySocket({
    autoTelemetry: true,
    intervalMs: 1100,
    sampleCount: Math.max(1, sensors.length),
    featureCount: 8,
  });

  const healthStatus = useMemo(() => {
    const latest = history[history.length - 1]?.health ?? 92;
    return latest > 82 ? "Normal" : latest > 56 ? "Warning" : "Critical";
  }, [history]);

  const loadStructureData = useCallback(async () => {
    if (!Number.isFinite(structureId)) return;
    try {
      const [structurePayload, sensorPayload] = await Promise.all([
        gallifreyApi.getStructure(structureId),
        gallifreyApi.listSensors(structureId),
      ]);
      setStructure(structurePayload);
      setSensors(sensorPayload);
    } catch (error) {
      console.error("Failed loading structure", error);
    }
  }, [structureId]);

  useEffect(() => {
    loadStructureData();
  }, [loadStructureData]);

  useEffect(() => {
    if (!lastResponse) return;

    const ifScore = Math.abs(lastResponse.isolation_forest_score?.[0] ?? 0);
    const recon = lastResponse.reconstruction_error?.[0] ?? 0;
    const vibration = Math.max(0.08, Math.min(0.9, 0.18 + ifScore * 2 + recon * 10));
    const health = Math.max(20, Math.min(99, 96 - ifScore * 120 - recon * 600));

    setCurrentVibration(vibration.toFixed(2));
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          time: new Date().toLocaleTimeString([], {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          health: Number(health.toFixed(2)),
        },
      ];
      if (next.length > 40) next.shift();
      return next;
    });
  }, [lastResponse]);

  const handleAddSensor = async () => {
    if (!sensorName.trim() || !structure) return;
    setBusy(true);
    try {
      await gallifreyApi.connectSensor(structure.id, {
        name: sensorName.trim(),
        type: sensorType,
        x: Number((Math.random() * 8 - 4).toFixed(2)),
        y: Number((Math.random() * 4 + 1).toFixed(2)),
        z: Number((Math.random() * 2 - 1).toFixed(2)),
        stream_url: "mock://sensor-feed",
        connected: true,
      });
      setSensorName("");
      await loadStructureData();
    } catch (error) {
      console.error("Failed to add sensor", error);
    } finally {
      setBusy(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!structure) return;
    setBusy(true);
    try {
      const latestHealth = history[history.length - 1]?.health ?? 92;
      await gallifreyApi.generateStructureReportPdf({
        structure_id: structure.id,
        structure_name: structure.name,
        structure_type: structure.type,
        location: structure.location,
        sensors,
        telemetry_summary: {
          latest_health: Number(latestHealth.toFixed(2)),
          current_vibration_g: Number(currentVibration),
          websocket_connected: isConnected,
          sensor_count: sensors.length,
        },
      });
    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setBusy(false);
    }
  };

  if (!structure) {
    return <div className="space-y-8 pb-12"><p className="text-sm text-muted-foreground">Loading structure...</p></div>;
  }

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
            <span className="text-foreground">{structure.id}</span>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight">{structure.name.toUpperCase()}</h1>
        </div>
        
        <div className="ml-auto flex gap-3">
          <div className={cn(
            "px-4 py-2 border rounded-full text-xs font-bold flex items-center gap-2 uppercase tracking-widest",
            healthStatus === "Normal"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : healthStatus === "Warning"
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                : "bg-red-500/10 border-red-500/30 text-red-500"
          )}>
            <div className={cn("w-2 h-2 rounded-full", healthStatus === "Normal" ? "bg-emerald-500" : healthStatus === "Warning" ? "bg-yellow-400" : "bg-red-500")} /> {healthStatus}
          </div>
          <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-widest">
            {isConnected ? "Digital Twin Synchronized" : "Twin Sync Pending"}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Overviews */}
        <div className="lg:col-span-3 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatsCard 
              title="Vibration (RMS)" 
              value={`${currentVibration}g`}
              description="Delta from baseline: +2%" 
              icon={Activity} 
            />
            <StatsCard 
              title="Deterioration Rate" 
              value={`${history.length > 1 ? Math.max(0.01, (history[0].health - history[history.length - 1].health) / Math.max(1, history.length)).toFixed(2) : "0.05"}%`} 
              description="Live SHI drift per sample window" 
              icon={Zap} 
            />
          </div>

          {/* Digital Twin 3D View */}
          <div className="lg:col-span-3">
             <div className="mb-6 flex justify-between items-end relative">
                <div className="scanline opacity-10" />
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-3 uppercase tracking-[0.2em] flicker">
                    <div className="p-2 bg-primary/10 rounded-lg"><Activity className="w-5 h-5 text-primary" /></div>
                    Digital Twin // Simulation
                  </h3>
                  <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest mt-1">Real-time Physics Overlay // {structure.type}</p>
                </div>
                <div className="flex gap-2">
                   <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-mono text-white/40">Z_COORD: 104.2</div>
                   <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-mono text-white/40">BUFF: 0x92f</div>
                </div>
             </div>
             
             <div className="h-[500px] w-full">
               <DigitalTwin3D 
                 isAnomaly={lastResponse?.is_anomaly.some(Boolean)} 
                 anomalyScore={lastResponse?.isolation_forest_score?.[0] ?? 0}
               />
             </div>
          </div>

          <div className="glass-card p-8 rounded-2xl relative hud-border hud-corner-extra bg-black/40 overflow-hidden">
            <div className="scanline opacity-5" />
            <div className="flex justify-between items-center mb-10 relative z-10">
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

            <div className="h-[300px] relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis domain={[20, 100]} stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0b10', border: '1px solid rgba(0,242,255,0.2)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="health" stroke="var(--primary)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute bottom-4 left-8 text-[8px] font-mono text-white/20">LOG_STREAM: ACTIVE // ERROR_RATE: 0.00%</div>
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="space-y-8">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground mb-6">
              <Waves className="w-4 h-4" />
              Live Telemetry Context
            </h3>
            <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
              Structure type: {structure.type}. Location: {structure.location}. Active sensors: {sensors.length}. Telemetry stream feeds anomaly + SHI overlays in real time.
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
