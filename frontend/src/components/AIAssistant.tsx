"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, User, Sparkles, AlertCircle, BarChart3, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { gallifreyApi } from "@/lib/api";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  { text: "System Health Summary", icon: Fingerprint },
  { text: "Predict Risk for Bridge-A4", icon: AlertCircle },
  { text: "Current Sensor Features", icon: BarChart3 },
];

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Systems online. I am Gallifrey-01. How can I assist with your structural audit today?" }
  ]);
  const [metadata, setMetadata] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gallifreyApi.getMetadata().then(setMetadata).catch(console.error);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    if (!textOverride) setInput("");

    // Thinking state
    setMessages(prev => [...prev, { role: 'assistant', content: "..." }]);

    setTimeout(() => {
      let response = "";
      const text = textToSend.toLowerCase();

      if (text.includes("status") || text.includes("health") || text.includes("summary")) {
        response = `All systems nominal. Analyzing ${metadata?.anomaly_features?.length || 8} primary sensor channels. Cluster integrity at 98.4%. No active breaches detected.`;
      } else if (text.includes("risk") || text.includes("bridge")) {
        response = "Bridge-A4 telemetrics show a localized strain concentration in the main span (Segment 3). Cumulative SHI remains at 94.2. No critical failure predicted in next 180 days.";
      } else if (text.includes("sensor") || text.includes("feature")) {
        response = `Active telemetry channels: ${metadata?.anomaly_features?.join(", ") || 'Vibration, Strain, Deflection, Displacement, Frequency, Temperature, Wind, Crack'}. Synchronization status: FIXED.`;
      } else {
        response = "Data verified. Telemetry audit shows vibration RMS within standard 2-sigma deviation. Digital Twin synchronized.";
      }

      setMessages(prev => {
        const filtered = prev.filter(m => m.content !== "...");
        return [...filtered, { role: 'assistant', content: response }];
      });
    }, 800);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[400px] h-[600px] glass-card rounded-[2.5rem] flex flex-col overflow-hidden border-primary/20 shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
          >
            {/* Header */}
            <div className="p-6 bg-primary/10 border-b border-white/5 flex justify-between items-center relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 overflow-hidden">
                <motion.div animate={{ x: [-400, 400] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="w-1/2 h-full bg-primary" />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                    <Bot className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#0a0b10]" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tighter">Gallifrey Sentinel</h4>
                  <p className="text-[10px] text-primary uppercase font-bold tracking-[0.2em] leading-none mt-1">AI Logic Core // Active</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-hide bg-black/40">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i} 
                  className={cn(
                    "flex items-start gap-4",
                    m.role === 'user' ? "flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl shrink-0 mt-1",
                    m.role === 'user' ? "bg-primary/20 border border-primary/20" : "bg-white/5 border border-white/5"
                  )}>
                    {m.role === 'user' ? <User className="w-4 h-4 text-primary" /> : <Sparkles className="w-4 h-4 text-primary" />}
                  </div>
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-3xl text-xs leading-relaxed font-medium shadow-sm",
                    m.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-white/[0.03] text-white/90 rounded-tl-none border border-white/10"
                  )}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Smart Suggestions */}
            <div className="px-6 pb-2 flex gap-2 overflow-x-auto scroll-hide">
               {SUGGESTIONS.map((s, i) => (
                 <button 
                  key={i}
                  onClick={() => handleSend(s.text)}
                  className="whitespace-nowrap px-4 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all flex items-center gap-2"
                 >
                   <s.icon className="w-3 h-3" />
                   {s.text}
                 </button>
               ))}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-white/5 bg-black/40">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask Gallifrey anything..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-xs focus:outline-none focus:border-primary/50 group-hover:border-white/20 transition-all placeholder:text-white/20 tracking-wide"
                />
                <button 
                  onClick={() => handleSend()}
                  className="absolute right-2 top-2 p-2.5 bg-primary text-primary-foreground rounded-xl hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 relative group overflow-hidden",
          isOpen ? "bg-white/10 text-white" : "bg-primary text-primary-foreground"
        )}
      >
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
        {isOpen ? <X className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-[3px] border-background animate-pulse flex items-center justify-center text-[10px] font-bold text-white">1</span>
        )}
      </motion.button>
    </div>
  );
}
