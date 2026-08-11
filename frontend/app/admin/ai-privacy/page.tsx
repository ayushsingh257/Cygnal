"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw, 
  KeyRound, 
  FileText, 
  Database, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  Search,
  Filter
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface PrivacyEvent {
  id: string;
  tenant_id: number;
  user_id: string;
  event_type: string;
  detected_category: string;
  severity: string;
  action_taken: string;
  details: Record<string, any>;
  timestamp: string;
}

interface PrivacyStats {
  success: boolean;
  tenant_id: number;
  privacy_score: number;
  total_events: number;
  total_blocked_secrets: number;
  total_sanitized_prompts: number;
  total_redacted_responses: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  by_event_type: Record<string, number>;
}

export default function AIPrivacyPage() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<PrivacyStats | null>(null);
  const [events, setEvents] = useState<PrivacyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Interactive Playground State
  const [testInput, setTestInput] = useState<string>(
    "Investigate user alex.chen@acme-corp.com connecting from 192.168.1.105 with key sk-live-998877665544332211 using password=AdminPassword2026!"
  );
  const [targetProvider, setTargetProvider] = useState<string>("external");
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [sanitizing, setSanitizing] = useState<boolean>(false);
  const [sanitizationResult, setSanitizationResult] = useState<any>(null);

  const fetchPrivacyData = async () => {
    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      };

      const [statsRes, eventsRes] = await Promise.all([
        fetch("/api/ai-privacy/stats", { headers }),
        fetch("/api/ai-privacy/events?limit=50", { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }
    } catch (err) {
      console.error("Failed to load AI privacy telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPrivacyData();
    }
  }, [token]);

  const handleTestSanitization = async () => {
    if (!testInput.trim()) return;
    setSanitizing(true);
    try {
      const res = await fetch("/api/ai-privacy/sanitize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: testInput,
          target_provider: targetProvider,
          strict: strictMode
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSanitizationResult(data.data);
        // Refresh telemetry events after test
        fetchPrivacyData();
      }
    } catch (err) {
      console.error("Sanitization test error:", err);
    } finally {
      setSanitizing(false);
    }
  };

  const filteredEvents = events.filter(e => {
    if (filterType !== "ALL" && e.event_type !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        e.user_id.toLowerCase().includes(term) ||
        e.detected_category.toLowerCase().includes(term) ||
        e.id.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toUpperCase()) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case "SECRET_BLOCKED":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "PROMPT_SANITIZED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "PII_MASKED":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "RESPONSE_REDACTED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "EMBEDDING_SANITIZED":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      default:
        return "bg-zinc-800 text-zinc-400 border-zinc-700";
    }
  };

  return (
    <DashboardShell>
      <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  AI Privacy Controls & Zero-Data-Leakage
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                    Era 5 Hardened
                  </span>
                </h1>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Automated PII detection, credential zero-leakage masking, prompt sanitization, and RAG vector safeguards.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchPrivacyData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium border border-white/10 transition-all self-start md:self-auto"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-emerald-400" : ""} />
            Sync Telemetry
          </button>
        </div>

        {/* Telemetry KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Privacy Posture Score */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tenant Privacy Score</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-extrabold text-white">
                    {stats?.privacy_score ?? 98}
                    <span className="text-lg text-emerald-400 font-semibold">/100</span>
                  </h3>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck size={22} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={14} /> Zero Outbound Leakages Enforced
            </div>
          </div>

          {/* Blocked Credentials */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Blocked Secret Injections</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">
                  {stats?.total_blocked_secrets ?? 0}
                </h3>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert size={22} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
              <span className="text-rose-400 font-semibold">{stats?.by_severity?.CRITICAL ?? 0}</span> Critical Credentials Intercepted
            </div>
          </div>

          {/* Sanitized Prompts */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sanitized AI Prompts</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">
                  {stats?.total_sanitized_prompts ?? 0}
                </h3>
              </div>
              <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <EyeOff size={22} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-cyan-400">
              <Sparkles size={14} /> Reversible & Irreversible Masks Active
            </div>
          </div>

          {/* Redacted LLM Outputs */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Redacted AI Responses</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">
                  {stats?.total_redacted_responses ?? 0}
                </h3>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Terminal size={22} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-purple-400">
              <Lock size={14} /> Accidental Model Leakages Guarded
            </div>
          </div>
        </div>

        {/* Interactive Zero-Data-Leakage Playground */}
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <Zap size={20} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white">Live Zero-Data-Leakage Gateway Playground</h2>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                />
                Strict Credential Blocking
              </label>
              <select
                value={targetProvider}
                onChange={(e) => setTargetProvider(e.target.value)}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-200 rounded-lg border border-white/10 text-xs font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="external">External AI Model (OpenAI / Gemini)</option>
                <option value="internal">Internal Sovereign Model (Reversible)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Input Area */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Raw Input Prompt (Includes Secrets & PII)
              </label>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={5}
                className="w-full p-3.5 bg-zinc-950/80 border border-white/10 rounded-xl text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                placeholder="Enter prompt containing sensitive API keys, emails, IP addresses, or passwords..."
              />
              <button
                onClick={handleTestSanitization}
                disabled={sanitizing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                {sanitizing ? "Sanitizing..." : "Pass Through AI Privacy Gateway"}
              </button>
            </div>

            {/* Sanitized Output Area */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Sanitized Outbound AI Payload
                </label>
                {sanitizationResult && (
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                    sanitizationResult.blocked ? "bg-rose-500/20 text-rose-400 border-rose-500/40" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  }`}>
                    {sanitizationResult.blocked ? "TRANSMISSION BLOCKED" : `${sanitizationResult.findings_count} Sensitive Items Masked`}
                  </span>
                )}
              </div>
              <div className={`p-3.5 rounded-xl border text-sm font-mono min-h-[125px] overflow-auto ${
                sanitizationResult?.blocked 
                  ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
                  : "bg-zinc-950/80 border-white/10 text-emerald-300"
              }`}>
                {sanitizationResult ? (
                  sanitizationResult.blocked ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-rose-400 font-bold">
                        <XCircle size={16} /> {sanitizationResult.block_reason}
                      </div>
                      <p className="text-xs text-rose-300/80">
                        Outbound transmission aborted to protect corporate secrets from third-party LLM providers.
                      </p>
                    </div>
                  ) : (
                    sanitizationResult.sanitized_text
                  )
                ) : (
                  <span className="text-zinc-600 italic">Click button to execute gateway sanitization pass.</span>
                )}
              </div>

              {sanitizationResult?.findings?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {sanitizationResult.findings.map((f: any, idx: number) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-white/5 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${f.is_secret ? "bg-rose-400" : "bg-cyan-400"}`} />
                      {f.finding_type}: <span className="font-mono text-zinc-400">{f.masked_value}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Privacy Audit Trail Ledger */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-cyan-400" />
                AI Privacy Audit Trail & Telemetry Ledger
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Immutable record of all sanitized prompts, blocked secret transmissions, and redacted responses.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-zinc-800/80 border border-white/10 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-zinc-800/80 border border-white/10 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Event Types</option>
                <option value="SECRET_BLOCKED">SECRET_BLOCKED</option>
                <option value="PROMPT_SANITIZED">PROMPT_SANITIZED</option>
                <option value="PII_MASKED">PII_MASKED</option>
                <option value="RESPONSE_REDACTED">RESPONSE_REDACTED</option>
                <option value="EMBEDDING_SANITIZED">EMBEDDING_SANITIZED</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-800/50 text-zinc-400 uppercase tracking-wider font-semibold border-b border-white/5">
                <tr>
                  <th className="p-3.5">Event ID & Timestamp</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Actor / User</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500 italic">
                      No AI privacy incidents detected matching the current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-zinc-200">{evt.id}</div>
                        <div className="text-[10px] text-zinc-500 font-sans">{new Date(evt.timestamp).toLocaleString()}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-sans font-medium ${getEventTypeBadge(evt.event_type)}`}>
                          {evt.event_type}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-200">{evt.detected_category}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-sans font-bold ${getSeverityBadge(evt.severity)}`}>
                          {evt.severity}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-300">{evt.action_taken}</td>
                      <td className="p-3.5 text-zinc-400 font-sans">{evt.user_id}</td>
                      <td className="p-3.5 text-[11px] text-zinc-400 max-w-xs truncate">
                        {JSON.stringify(evt.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
