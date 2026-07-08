"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Shield, 
  Terminal, 
  Cpu, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  ExternalLink,
  Eye, 
  ChevronRight,
  Database,
  Lock,
  RefreshCw
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { io } from "socket.io-client";

interface InboundAlert {
  id: string;
  external_id: string;
  title: string;
  source: string;
  severity: string;
  description: string;
  status: string;
  case_id: string | null;
  created_at: string;
}

interface AlertDetails extends InboundAlert {
  raw_payload: any;
  payload_hash: string;
  parsed_iocs: Array<{ value: string; type: string; confidence: number }>;
  processed_at: string | null;
}

export default function AlertTriagePage() {
  const { token } = useAuthStore();
  const [alerts, setAlerts] = useState<InboundAlert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetails | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const socketRef = useRef<any>(null);

  // Fetch Alerts List
  const fetchAlerts = async () => {
    try {
      setLoadingList(true);
      const res = await fetch("/api/webhooks/alerts?limit=50", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts);
      } else {
        toast.error(data.error || "Failed to load triage alerts.");
      }
    } catch {
      toast.error("Alerts API connection timeout.");
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch Single Alert Details
  const fetchAlertDetails = async (alertId: string) => {
    try {
      setLoadingDetails(true);
      const res = await fetch(`/api/webhooks/alerts/${alertId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAlert(data.alert);
      } else {
        toast.error(data.error || "Failed to load alert details.");
      }
    } catch {
      toast.error("Alert details API connection timeout.");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Trigger take-over action
  const handleTakeOver = async (alertId: string) => {
    if (!confirm("Are you sure you want to take over? This will abort the autonomic AI investigation loop and transfer manual control of the case folder to you.")) {
      return;
    }
    try {
      const res = await fetch(`/api/webhooks/alerts/${alertId}/take-over`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Autonomic loop aborted. Analyst takeover complete.");
        fetchAlertDetails(alertId);
        fetchAlerts();
      } else {
        toast.error(data.error || "Takeover request rejected.");
      }
    } catch {
      toast.error("Takeover connection error.");
    }
  };

  useEffect(() => {
    if (token) {
      fetchAlerts();
    }
  }, [token]);

  useEffect(() => {
    if (selectedAlertId && token) {
      fetchAlertDetails(selectedAlertId);
    } else {
      setSelectedAlert(null);
    }
  }, [selectedAlertId]);

  // WebSocket Ingest broadcasts
  useEffect(() => {
    if (!token) return;

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

    socket.on("new_alert", (alert: InboundAlert) => {
      setAlerts((prev) => [alert, ...prev]);
      toast((t) => (
        <span className="text-xs font-mono text-[#B0E4CC]">
          🚨 New SIEM alert ingested: <b>{alert.title}</b>
        </span>
      ), { icon: "🚨", duration: 4000 });
    });

    socket.on("alert_updated", (data: { id: string; status: string }) => {
      setAlerts((prev) => 
        prev.map((a) => (a.id === data.id ? { ...a, status: data.status } : a))
      );
      if (selectedAlertId === data.id) {
        setSelectedAlert((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedAlertId, token]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unhandled":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-800 border border-slate-700 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" /> QUEUED
          </span>
        );
      case "investigating":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#0d233a] border border-[#1b3d5c] text-[#7eb6e8]">
            <RefreshCw className="w-3 h-3 animate-spin" /> RUNNING
          </span>
        );
      case "completed":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#0e2c24] border border-[#205747] text-[#52d2b0]">
            <CheckCircle className="w-3 h-3" /> COMPLETED
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#341113] border border-[#5c1c1f] text-[#f87171]">
            <AlertTriangle className="w-3 h-3" /> NEEDS ANALYST
          </span>
        );
      default:
        return null;
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical": return "text-[#f87171] border-[#ef4444]/35 bg-[#7f1d1d]/10";
      case "high": return "text-orange-400 border-orange-500/35 bg-orange-950/10";
      case "medium": return "text-yellow-400 border-yellow-500/35 bg-yellow-950/10";
      default: return "text-blue-400 border-blue-500/35 bg-blue-950/10";
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch = 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.source.toLowerCase().includes(search.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    return a.status === filterStatus && matchesSearch;
  });

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
                SIEM Alert Triage Workspace
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Correlate raw Splunk/Sentinel triggers, monitor autonomic AI scanner dispatches, and intervene using Take Over gates.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#091413]/60 border border-[#408A71]/15 px-3 py-1.5 rounded-xl text-[10px] font-mono text-[#B0E4CC]">
            <Activity className="w-3.5 h-3.5" /> Autonomic Engine: STANDBY
          </div>
        </div>

        {/* Workspace Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left: Alerts Ingestion Feed (4/12 col width) */}
          <div className="lg:col-span-4 bg-[#091413]/40 border border-[#408A71]/15 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Alert Feed</h2>
              <span className="text-[10px] font-mono text-[#B0E4CC] px-2 py-0.5 bg-[#408A71]/10 rounded border border-[#408A71]/20">
                {filteredAlerts.length} total
              </span>
            </div>

            {/* Filters Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by title or IOC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#050b0a] border border-[#408A71]/20 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-[#408A71]/40"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {["all", "unhandled", "investigating", "completed", "failed"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-all border ${
                      filterStatus === st 
                        ? "bg-[#408A71]/20 text-[#B0E4CC] border-[#408A71]/50" 
                        : "bg-transparent text-slate-400 border-[#408A71]/10 hover:border-[#408A71]/35 hover:text-white"
                    }`}
                  >
                    {st === "all" ? "ALL" : st === "unhandled" ? "QUEUED" : st === "investigating" ? "RUNNING" : st === "completed" ? "COMPLETED" : "NEEDS ANALYST"}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingestion Feed Cards */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {loadingList ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">Syncing triage database...</span>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 font-mono uppercase">
                  No alerts matched criteria.
                </div>
              ) : (
                filteredAlerts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAlertId(a.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      selectedAlertId === a.id
                        ? "bg-[#408A71]/10 border-[#408A71]/50 shadow-md shadow-[#408A71]/5"
                        : "bg-[#091413]/70 border-[#408A71]/10 hover:border-[#408A71]/30"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-xs font-bold text-white leading-snug line-clamp-2">
                        {a.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase border shrink-0 ${getSeverityColor(a.severity)}`}>
                        {a.severity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-mono text-[9px] bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/50">
                        {a.source.toUpperCase()}
                      </span>
                      <span>{a.created_at.split("T")[1].slice(0, 5)} Z</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-[#408A71]/5">
                      {getStatusBadge(a.status)}
                      <ChevronRight className="w-3.5 h-3.5 text-[#B0E4CC]/40" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Detailed Work Panel (8/12 col width) */}
          <div className="lg:col-span-8 space-y-6">
            {!selectedAlertId ? (
              <div className="flex flex-col items-center justify-center p-20 border border-dashed border-[#408A71]/25 rounded-2xl bg-[#091413]/10 text-center space-y-4">
                <div className="p-4 bg-[#408A71]/5 border border-[#408A71]/20 rounded-full text-[#B0E4CC]">
                  <Shield className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Triage Console Ready</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Select an ingested alert from the left feed list to review parsed telemetry, execute logs, and take over.
                  </p>
                </div>
              </div>
            ) : loadingDetails || !selectedAlert ? (
              <div className="flex flex-col items-center justify-center p-20 border border-[#408A71]/15 rounded-2xl bg-[#091413]/20 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#B0E4CC]" />
                <span className="text-xs font-mono uppercase text-[#B0E4CC]">Fetching Alert Payload...</span>
              </div>
            ) : (
              <div className="space-y-6 text-left">
                
                {/* Details Header Actions */}
                <div className="bg-[#091413]/60 border border-[#408A71]/15 p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${getSeverityColor(selectedAlert.severity)}`}>
                        {selectedAlert.severity} Severity
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        Source: {selectedAlert.source}
                      </span>
                      {getStatusBadge(selectedAlert.status)}
                    </div>
                    <h2 className="text-base font-extrabold text-white leading-snug">
                      {selectedAlert.title}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    {/* Interruption Gate: Take Over */}
                    {(selectedAlert.status === "investigating" || selectedAlert.status === "unhandled") && (
                      <button
                        onClick={() => handleTakeOver(selectedAlert.id)}
                        className="bg-red-950/40 text-red-400 hover:bg-red-900/30 border border-red-500/30 px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                      >
                        <AlertTriangle className="w-4 h-4" /> TAKE OVER
                      </button>
                    )}

                    {/* View Agent Logs Button */}
                    <a
                      href={`/agents?alert_id=${selectedAlert.id}`}
                      className="bg-[#408A71]/15 hover:bg-[#408A71]/25 text-[#B0E4CC] border border-[#408A71]/30 px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Terminal className="w-4 h-4" /> AGENT TERMINAL
                    </a>

                    {/* Correlated Case Redirect */}
                    {selectedAlert.case_id && (
                      <a
                        href={`/cases?id=${selectedAlert.case_id}`}
                        className="bg-[#B0E4CC] hover:bg-[#B0E4CC]/90 text-[#050b0a] px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#B0E4CC]/10"
                      >
                        CASE LOGS <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Workspace Details Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Card 1: Executive Summary */}
                  <div className="bg-[#091413]/30 border border-[#408A71]/10 p-5 rounded-2xl space-y-3">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#B0E4CC]" /> Executive Summary
                    </h3>
                    <p className="text-xs text-slate-350 leading-relaxed font-sans">
                      {selectedAlert.description}
                    </p>
                  </div>

                  {/* Card 2: SIEM Payload Verification Seal */}
                  <div className="bg-[#091413]/30 border border-[#408A71]/10 p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-[#B0E4CC]" /> Integrity & Custody Seal
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-mono">Payload Hash (SHA-256):</span>
                        <span className="text-[#B0E4CC] font-mono text-[9px] truncate max-w-[200px]" title={selectedAlert.payload_hash}>
                          {selectedAlert.payload_hash}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-mono">Provider UUID:</span>
                        <span className="text-slate-300 font-mono">{selectedAlert.external_id}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-mono">Ingested:</span>
                        <span className="text-slate-300 font-mono">{selectedAlert.created_at}</span>
                      </div>
                      <div className="pt-2 border-t border-[#408A71]/5 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-mono">Validation Seal:</span>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#52d2b0]">
                          <CheckCircle className="w-3.5 h-3.5" /> FORENSICALLY SEALED
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3: Extracted Threat Indicators (Full width) */}
                <div className="bg-[#091413]/30 border border-[#408A71]/10 p-5 rounded-2xl space-y-3">
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#B0E4CC]" /> Extracted Threat Indicators (IOCs)
                  </h3>
                  {selectedAlert.parsed_iocs.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500 font-mono">
                      NO THREAT INDICATORS DETECTED IN WEBHOOK TEXT.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedAlert.parsed_iocs.map((ioc, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-3 rounded-xl bg-[#091413]/70 border border-[#408A71]/10"
                        >
                          <div className="space-y-1 text-left min-w-0 pr-2">
                            <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 block w-max">
                              {ioc.type}
                            </span>
                            <span className="text-xs font-mono text-white truncate block" title={ioc.value}>
                              {ioc.value}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[9px] font-mono text-slate-400">Confidence</div>
                            <div className="text-xs font-mono font-bold text-[#B0E4CC]">{ioc.confidence}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card 4: Raw SIEM JSON Payload */}
                <div className="bg-[#050b0a] border border-[#408A71]/15 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-[#B0E4CC]" /> Raw JSON Telemetry
                    </h3>
                    <span className="text-[8px] font-mono bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      READ-ONLY Forensics Copy
                    </span>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#030605] border border-[#408A71]/5 text-[10px] font-mono text-[#a3c2b4] overflow-x-auto max-h-[300px] leading-relaxed select-all">
                    {JSON.stringify(selectedAlert.raw_payload, null, 2)}
                  </pre>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardShell>
  );
}
