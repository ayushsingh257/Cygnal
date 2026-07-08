"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Cpu, 
  Terminal, 
  Shield, 
  RefreshCw, 
  Layers, 
  Compass, 
  Lock, 
  Activity, 
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";

interface AgentStep {
  agent: string;
  status: "pending" | "running" | "completed";
  logs: string[];
}

interface SocketLogEvent {
  alert_id: string;
  id: string;
  stage: string;
  level: string;
  message: string;
  reasoning?: string;
  details?: any;
  timestamp: string;
}

function MultiAgentPageContent() {
  const searchParams = useSearchParams();
  const alertId = searchParams.get("alert_id");
  const { token } = useAuthStore();

  // State for SIMULATED agent view
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([
    { agent: "Recon & OSINT Agent", status: "pending", logs: [] },
    { agent: "Malware Analysis Agent", status: "pending", logs: [] },
    { agent: "Custody Compliance Auditor", status: "pending", logs: [] },
    { agent: "Executive Compiler", status: "running", logs: ["Waiting for initialization..."] }
  ]);

  // State for REAL-TIME SIEM agent view
  const [alertMeta, setAlertMeta] = useState<any>(null);
  const [liveLogs, setLiveLogs] = useState<SocketLogEvent[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const socketRef = useRef<any>(null);

  // Fetch alert info and initial logs
  const fetchLiveAlertAndLogs = async (id: string) => {
    try {
      setLoadingLive(true);
      // Fetch alert meta
      const alertRes = await fetch(`/api/webhooks/alerts/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const alertData = await alertRes.json();
      if (alertData.success) {
        setAlertMeta(alertData.alert);
      }

      // Fetch logs
      const logsRes = await fetch(`/api/webhooks/alerts/${id}/logs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const logsData = await logsRes.json();
      if (logsData.success) {
        setLiveLogs(logsData.logs);
      }
    } catch {
      toast.error("Failed to load active agent context.");
    } finally {
      setLoadingLive(false);
    }
  };

  // Trigger Take Over action
  const handleTakeOver = async (id: string) => {
    if (!confirm("Are you sure you want to stop the autonomic loop? Control will be transferred to you.")) {
      return;
    }
    try {
      const res = await fetch(`/api/webhooks/alerts/${id}/take-over`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Autonomic loop aborted. Manual takeover registered.");
        fetchLiveAlertAndLogs(id);
      } else {
        toast.error(data.error || "Takeover request rejected.");
      }
    } catch {
      toast.error("Takeover connection error.");
    }
  };

  // WebSocket Live streaming connection
  useEffect(() => {
    if (!alertId || !token) return;

    fetchLiveAlertAndLogs(alertId);

    // Resolve URL for dev vs prod context
    let connectionUrl = "";
    if (typeof window !== "undefined") {
      const port = window.location.port;
      if (port === "3000" || port === "3001") {
        connectionUrl = "http://localhost:5000";
      } else {
        connectionUrl = window.location.origin;
      }
    }

    const socket = io(connectionUrl, {
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(`Connected. Joining agent alert room: ${alertId}`);
      socket.emit("join_alert", { alert_id: alertId });
    });

    socket.on("agent_log", (log: SocketLogEvent) => {
      setLiveLogs((prev) => {
        // Prevent duplicate logs if reconnected
        if (prev.some((l) => l.id === log.id)) return prev;
        return [...prev, log];
      });
    });

    socket.on("alert_updated", (data: { id: string; status: string }) => {
      if (data.id === alertId) {
        setAlertMeta((prev: any) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    return () => {
      socket.emit("leave_alert", { alert_id: alertId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [alertId, token]);

  // Handler for simulated pipeline
  const handleRunAgents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) {
      toast.error("Please provide a target host, IP, or Case ID.");
      return;
    }
    setLoading(true);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unhandled":
        return (
          <span className="flex items-center gap-1 bg-[#1e293b]/60 border border-slate-700/60 px-2 py-0.5 rounded text-[8px] font-mono font-bold text-slate-300">
            <span className="w-1 h-1 rounded-full bg-slate-400 animate-pulse" /> QUEUED
          </span>
        );
      case "investigating":
        return (
          <span className="flex items-center gap-1 bg-[#0d233a] border border-[#1b3d5c] px-2 py-0.5 rounded text-[8px] font-mono font-bold text-[#7eb6e8]">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> RUNNING
          </span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1 bg-[#0e2c24] border border-[#205747] px-2 py-0.5 rounded text-[8px] font-mono font-bold text-[#52d2b0]">
            <CheckCircle className="w-2.5 h-2.5" /> COMPLETED
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 bg-[#341113] border border-[#5c1c1f] px-2 py-0.5 rounded text-[8px] font-mono font-bold text-[#f87171]">
            <AlertTriangle className="w-2.5 h-2.5" /> NEEDS ANALYST
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6">
        
        {/* Render Live Webhook Agent Monitor if alert_id is set */}
        {alertId ? (
          <div className="space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
                  <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                    Autonomic Agent Execution Room
                  </h1>
                </div>
                <p className="text-xs text-slate-400">
                  Real-time streaming agent console. Review automated playbooks, reasoning, and security indicators.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="/alerts"
                  className="px-4 py-2 border border-[#408A71]/25 hover:border-[#408A71]/40 rounded-xl text-xs font-mono font-bold text-slate-350 transition-all bg-transparent"
                >
                  BACK TO TRIAGE
                </a>
              </div>
            </div>

            {/* Live Terminal & Metadata Workspace */}
            {loadingLive || !alertMeta ? (
              <div className="flex flex-col items-center justify-center p-20 bg-[#091413]/30 border border-[#408A71]/10 rounded-2xl space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#B0E4CC]" />
                <span className="text-xs font-mono uppercase text-[#B0E4CC]">Loading Active Agent...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Real-time Terminal Window (7/12 width) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#050b0a] border border-[#408A71]/20 rounded-2xl overflow-hidden shadow-xl">
                    {/* Terminal Titlebar */}
                    <div className="bg-[#091413] border-b border-[#408A71]/15 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                        <span className="text-[10px] font-mono text-slate-400 ml-2">agent_shell@cygnal.local</span>
                      </div>
                      <span className="text-[9px] font-mono text-[#B0E4CC] bg-[#408A71]/10 px-2 py-0.5 rounded border border-[#408A71]/20">
                        LIVE LOGS
                      </span>
                    </div>

                    {/* Terminal Logs Pane */}
                    <div className="p-4 h-[400px] overflow-y-auto font-mono text-xs text-[#a3c2b4]/90 space-y-2 select-text text-left leading-relaxed">
                      {liveLogs.length === 0 ? (
                        <div className="text-slate-600 animate-pulse">Initializing socket handshake, waiting for ingestion log...</div>
                      ) : (
                        liveLogs.map((log, index) => (
                          <div key={log.id || index} className="space-y-1">
                            <div className="flex items-start gap-2">
                              <span className="text-[#408A71] select-none font-bold">&gt;&gt;</span>
                              <span className="text-[9px] text-[#408A71] select-none">[{log.stage.toUpperCase()}]</span>
                              <span className="text-[9px] text-slate-500 select-none">[{log.timestamp.split("T")[1].slice(0, 8)}]</span>
                              <span className="font-bold text-white">{log.message}</span>
                            </div>
                            {log.reasoning && (
                              <div className="pl-12 text-[10px] text-slate-400 font-sans italic border-l border-[#408A71]/15 py-0.5 my-1">
                                Rationale: {log.reasoning}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Agent Rationale & Case Space (5/12 width) */}
                <div className="lg:col-span-5 space-y-6 text-left">
                  
                  {/* Alert & Loop Metadata */}
                  <div className="bg-[#091413]/50 border border-[#408A71]/15 p-5 rounded-2xl space-y-4">
                    <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Target Threat Info</h2>
                    <div className="space-y-3">
                      <div className="pb-3 border-b border-[#408A71]/10 space-y-1">
                        <span className="text-[10px] font-mono text-slate-400 block">Alert Title:</span>
                        <span className="text-sm font-bold text-white leading-snug">{alertMeta.title}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-slate-400">Severity</span>
                          <span className="text-xs font-bold text-white uppercase font-mono block">{alertMeta.severity}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-slate-400">Source Provider</span>
                          <span className="text-xs font-bold text-[#B0E4CC] uppercase font-mono block">{alertMeta.source}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-slate-400">Process State</span>
                          <span className="block mt-1">{getStatusBadge(alertMeta.status)}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-mono text-slate-400">Created At</span>
                          <span className="text-xs font-mono text-slate-350 block">{alertMeta.created_at.split("T")[1].slice(0, 8)} Z</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Decision Space */}
                  <div className="bg-[#0f2422]/10 border border-[#408A71]/15 p-5 rounded-2xl space-y-4">
                    <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Agent Control Gate</h2>
                    <div className="space-y-3">
                      {alertMeta.status === "investigating" && (
                        <button
                          onClick={() => handleTakeOver(alertMeta.id)}
                          className="w-full bg-red-950/40 text-red-400 hover:bg-red-900/30 border border-red-500/30 py-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <AlertTriangle className="w-4 h-4" /> TAKE OVER WORKSPACE
                        </button>
                      )}
                      
                      {alertMeta.case_id && (
                        <a
                          href={`/cases?id=${alertMeta.case_id}`}
                          className="w-full bg-[#B0E4CC] hover:bg-[#B0E4CC]/90 text-[#050b0a] py-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#B0E4CC]/10"
                        >
                          OPEN CORRELATED CASE <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      
                      <div className="text-[10px] text-slate-400 leading-relaxed font-sans pt-1">
                        <b>Analyst Control Guarantee:</b> Taking over stops background thread task execution instantly. All scan results obtained prior to abort remain populated in the timeline and cases databases.
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}
            
          </div>
        ) : (
          /* Render Simulated Sandbox Agent Monitor if alert_id is not set */
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
        )}

      </div>
    </DashboardShell>
  );
}

export default function MultiAgentPage() {
  return (
    <Suspense fallback={
      <DashboardShell>
        <div className="flex flex-col items-center justify-center p-20 bg-[#091413]/30 border border-[#408A71]/10 rounded-2xl space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#B0E4CC]" />
          <span className="text-xs font-mono uppercase text-[#B0E4CC]">Initializing agent console...</span>
        </div>
      </DashboardShell>
    }>
      <MultiAgentPageContent />
    </Suspense>
  );
}
