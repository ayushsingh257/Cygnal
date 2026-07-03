"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Button } from "@/components/ui/button";
import { Cpu, Terminal, PlayCircle, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function MultiAgentPage() {
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([
    { id: "agent_1", name: "Agent Alpha (Subdomain Sweeper)", status: "Idle", lastAction: "Syncing dns tables", accuracy: "99.4%" },
    { id: "agent_2", name: "Agent Beta (Port Auditor)", status: "Active", lastAction: "Sweeping port boundaries", accuracy: "98.1%" },
    { id: "agent_3", name: "Agent Gamma (RAG Assistant)", status: "Idle", lastAction: "Correlating case indicators", accuracy: "99.9%" }
  ]);

  const handleSyncAgents = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Security agents sync complete.");
    }, 1500);
  };

  const handleDispatch = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: "Active", lastAction: "Dispatched from workspace console" } : a));
    toast.success("Security agent dispatched successfully.");
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6 text-left font-sans">
        
        {/* Title */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 select-none">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Multi-Agent AI Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">Orchestrate and coordinate autonomous security scanning agents</p>
          </div>
          
          <Button 
            onClick={handleSyncAgents}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={loading ? "animate-spin text-blue-400" : ""} />
            Sync Agents
          </Button>
        </div>

        {/* Agents Grid List */}
        <div className="grid md:grid-cols-3 gap-6 select-none">
          {agents.map(a => (
            <div key={a.id} className="glass-card rounded-xl p-5 bg-[#0d1117]/60 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="h-7 w-7 rounded bg-blue-955/15 border border-blue-500/10 flex items-center justify-center">
                    <Cpu size={14} className="text-blue-450" />
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider ${
                    a.status === "Active" ? "bg-emerald-950/20 text-emerald-450 border border-emerald-800/20 animate-pulse" : "bg-slate-900/40 text-slate-500 border border-white/5"
                  }`}>
                    {a.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-200">{a.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono">Last Ingress: {a.lastAction}</p>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-3.5 text-[10px] font-mono">
                <span className="text-slate-550">Accuracy Score: <span className="text-blue-450 font-bold">{a.accuracy}</span></span>
                <Button 
                  onClick={() => handleDispatch(a.id)}
                  disabled={a.status === "Active"}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-[9px] font-mono tracking-wider"
                >
                  <PlayCircle size={10} className="mr-1" /> DISPATCH
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* System log terminal summary */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/80">
          <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 font-mono uppercase tracking-wider select-none">
            <Terminal size={14} className="text-blue-450" /> Security Dispatch Streams
          </h3>
          
          <div className="p-4 bg-[#060814]/85 border border-white/5 rounded-lg space-y-2 text-[10.5px] font-mono text-slate-400">
            <div>[08:15:10] <span className="text-blue-450 font-semibold">[Agent Alpha]</span> Synced target indicators list from database.</div>
            <div>[08:15:15] <span className="text-emerald-400 font-semibold">[Agent Beta]</span> Initialized port scanning triggers on node 02.</div>
            <div>[08:15:20] <span className="text-purple-400 font-semibold">[Agent Gamma]</span> Mapped 2 forensic note timeline logs.</div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
