"use client";

import { AlertTriangle, ShieldAlert, CheckCircle, Bell, Filter, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const mockAlerts = [
  { id: 1, type: 'critical', structure: 'North-Support-Pillar', msg: 'Resonant frequency shift detected (+12Hz). Potential joint fatigue.', time: '2 mins ago', status: 'pending' },
  { id: 2, type: 'warning', structure: 'Bridge-A4 (Main)', msg: 'Vibration RMS exceeding 0.4g corridor.', time: '14 mins ago', status: 'acknowledged' },
  { id: 3, type: 'warning', structure: 'East-Extension', msg: 'Strain sensor EL-04 reporting intermittent packets.', time: '1 hour ago', status: 'pending' },
  { id: 4, type: 'info', structure: 'System', msg: 'Backup sync completed successfully.', time: '3 hours ago', status: 'resolved' },
];

export default function AlertsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center text-white">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Alerts</h2>
          <p className="text-muted-foreground mt-1">Real-time incident queue and anomaly triage center.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-3 glass-card rounded-xl hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
          <div className="px-6 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> 2 Critical Events
          </div>
        </div>
      </header>

      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search alerts by structure, type or ID..." 
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="divide-y divide-white/5">
          <AnimatePresence>
            {mockAlerts.map((alert, i) => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-6 flex items-start gap-6 hover:bg-white/5 transition-colors group",
                  alert.status === 'pending' ? "bg-white/[0.02]" : ""
                )}
              >
                <div className={cn(
                  "p-3 rounded-xl shrink-0",
                  alert.type === 'critical' ? "bg-red-500/10 text-red-500" : 
                  alert.type === 'warning' ? "bg-yellow-500/10 text-yellow-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                   {alert.type === 'critical' ? <ShieldAlert className="w-6 h-6" /> : 
                    alert.type === 'warning' ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{alert.structure}</h4>
                    <span className="text-xs text-muted-foreground font-mono">{alert.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-2xl">{alert.msg}</p>
                  
                  <div className="flex items-center gap-4 mt-6">
                    <button className="px-4 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                      View Trace
                    </button>
                    <button className="px-4 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/20 transition-all">
                      Acknowledge
                    </button>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                   <div className={cn(
                     "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                     alert.status === 'pending' ? "bg-red-500 text-white" : "bg-white/10 text-muted-foreground"
                   )}>
                     {alert.status}
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="flex justify-center">
        <button className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
          Load Archive History
        </button>
      </div>
    </div>
  );
}
