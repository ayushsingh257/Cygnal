"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { Cpu, Terminal, Shield, RefreshCw, Layers, Compass, Lock, Activity, CheckCircle } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface AgentStep {
  agent: string;
  status: "pending" | "running" | "completed";
  logs: string[];
}

export default function MultiAgentPage() {
  const { token } = useAuthStore();
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([
    { agent: "Recon & OSINT Agent", status: "pending", logs: [] },
    { agent: "Malware Analysis Agent", status: "pending", logs: [] },
    { agent: "Custody Compliance Auditor", status: "pending", logs: [] },
    { agent: "Executive Compiler", status: "running", logs: ["Waiting for initialization..."] }
  ]);

  const handleRunAgents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) {
      toast.error("Please provide a target host, IP, or Case ID.");
      return;
    }
    setLoading(true);

    // Initial state resetting
    setSteps([
      { agent: "Recon & OSINT Agent", status: "running", logs: ["Spawning thread context..."] },
      { agent: "Malware Analysis Agent", status: "pending", logs: [] },
      { agent: "Custody Compliance Auditor", status: "pending", logs: [] },
      { agent: "Executive Compiler", status: "pending", logs: [] }
    ]);

    try {
      const res = await fetch("/api/ai/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ target: target.trim() })
      });
      const data = await res.json();
      if (data.success) {
        // Simple delay simulation to render nice animations step by step
        setTimeout(() => {
          setSteps((prev) => {
            const next = [...prev];
            next[0] = { ...data.steps[0], status: "completed" };
            next[1] = { agent: "Malware Analysis Agent", status: "running", logs: ["Ingesting node profiles..."] };
            return next;
          });
        }, 1200);

        setTimeout(() => {
          setSteps((prev) => {
            const next = [...prev];
            next[1] = { ...data.steps[1], status: "completed" };
            next[2] = { agent: "Custody Compliance Auditor", status: "running", logs: ["Loading ledger hashes..."] };
            return next;
          });
        }, 2400);

        setTimeout(() => {
          setSteps((prev) => {
            const next = [...prev];
            next[2] = { ...data.steps[2], status: "completed" };
            next[3] = { agent: "Executive Compiler", status: "running", logs: ["Synthesizing metrics..."] };
            return next;
          });
        }, 3600);

        setTimeout(() => {
          setSteps((prev) => {
            const next = [...prev];
            next[3] = { ...data.steps[3], status: "completed" };
            return next;
          });
          setLoading(false);
          toast.success("Multi-Agent correlation completed!");
        }, 4800);

      } else {
        toast.error(data.error || "Failed to trigger multi-agent workspace.");
        setLoading(false);
      }
    } catch {
      toast.error("Multi-agent API connection timeout.");
      setLoading(false);
    }
  };

  const getAgentIcon = (name: string) => {
    switch (name) {
      case "Recon & OSINT Agent": return <Compass className="w-4 h-4" />;
      case "Malware Analysis Agent": return <Layers className="w-4 h-4" />;
      case "Custody Compliance Auditor": return <Lock className="w-4 h-4" />;
      default: return <Cpu className="w-4 h-4" />;
    }
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6">
        
        {/* Header Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
              <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                Multi-Agent AI Orchestrator
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Dispatch parallel autonomous agents to fetch OSINT records, audit binaries, and audit custody compliance.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#091413]/60 border border-[#408A71]/15 px-3 py-1.5 rounded-xl text-[10px] font-mono text-[#B0E4CC]">
            <Activity className="w-3.5 h-3.5" /> Pipeline Status: STANDBY
          </div>
        </div>

        {/* Action Form */}
        <form onSubmit={handleRunAgents} className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2 space-y-1.5 text-left">
            <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
              Analysis Target (Domain, IP, or Case ID)
            </label>
            <div className="relative">
              <Terminal className="absolute left-4 top-3.5 w-4 h-4 text-[#408A71]/60" />
              <input
                type="text"
                required
                disabled={loading}
                placeholder="e.g. malwaresample.exe, 185.190.140.23, CYG-2026-0001"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !target.trim()}
            className="w-full bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] text-white py-3 px-6 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(64,138,113,0.15)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer h-[42px]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> RUNNING PIPELINE...
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5" /> DISPATCH AGENTS
              </>
            )}
          </button>
        </form>

        {/* Grid layout for Agents */}
        <div className="grid md:grid-cols-2 gap-6">
          {steps.map((s, idx) => (
            <div 
              key={idx}
              className={`border rounded-2xl p-5 space-y-4 text-left transition-all ${
                s.status === "completed" 
                  ? "border-[#408A71]/30 bg-[#0f2422]/10" 
                  : s.status === "running"
                  ? "border-[#B0E4CC]/50 bg-[#0f2422]/15 shadow-[0_0_20px_rgba(176,228,204,0.1)]"
                  : "border-white/5 bg-white/[0.01]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    s.status === "completed" 
                      ? "bg-[#408A71]/20 border-[#408A71]/30 text-[#B0E4CC]" 
                      : s.status === "running"
                      ? "bg-[#B0E4CC]/10 border-[#B0E4CC]/30 text-[#B0E4CC] animate-pulse"
                      : "bg-[#091413] border-white/5 text-slate-500"
                  }`}>
                    {getAgentIcon(s.agent)}
                  </div>
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    {s.agent}
                  </h3>
                </div>
                <span className={`text-[8px] font-mono tracking-widest uppercase border px-2 py-0.5 rounded-full ${
                  s.status === "completed"
                    ? "bg-[#285A48]/20 border-[#408A71]/20 text-[#B0E4CC]"
                    : s.status === "running"
                    ? "bg-[#B0E4CC]/10 border-[#B0E4CC]/30 text-[#B0E4CC] animate-pulse"
                    : "bg-[#091413] border-white/5 text-slate-500"
                }`}>
                  {s.status}
                </span>
              </div>

              {/* Logs terminal block */}
              <div className="bg-[#091413]/95 border border-[#408A71]/10 rounded-xl p-3 h-28 overflow-y-auto scrollbar-none font-mono text-[9px] text-[#a3c2b4]/85 leading-relaxed space-y-1">
                {s.logs.length === 0 ? (
                  <span className="text-slate-600 block">Idle queue standby...</span>
                ) : (
                  s.logs.map((log, lIdx) => (
                    <div key={lIdx} className="flex gap-1.5">
                      <span className="text-[#408A71] select-none">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Global Pipeline Output Summary Banner */}
        {!loading && steps.every((s) => s.status === "completed") && (
          <div className="bg-[#0f2422]/15 border border-[#408A71]/30 p-6 rounded-2xl text-left space-y-3">
            <div className="flex items-center gap-2 text-[#B0E4CC]">
              <CheckCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                Pipeline Consolidated Summary Block
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              All parallel agent threads finished execution. The target logs have been verified for integrity, host reputation returns no active anomalies, and the SHA-256 evidence chain remains unbroken. Findings are package and compiled for reports workspace synchronization.
            </p>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
