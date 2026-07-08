"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Brain, Send, Sparkles, Shield, AlertTriangle, CheckCircle2,
  ChevronRight, Loader2, Activity, Target, Network, Clock,
  FileSearch, RefreshCw, Play, Eye, BarChart3, X, Zap
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "copilot";
  content: string;
  timestamp: string;
  intent?: string;
  confidence?: number;
  iocs?: IOC[];
  proposedAction?: ProposedAction | null;
  requires_approval?: boolean;
}

interface IOC {
  value: string;
  type: string;
  confidence: number;
}

interface ScannerStep {
  scanner: string;
  target: string;
  reason: string;
}

interface ProposedAction {
  type: string;
  iocs: IOC[];
  plan: { scanners: ScannerStep[]; total_scanners: number; estimated_seconds: number };
  case_id: string | null;
}

interface JobStatus {
  id: string;
  status: string;
  progress: number;
  current_scanner: string;
  total_scanners: number;
  completed_scanners: string[];
  case_id: string;
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

const IOC_BADGE: Record<string, { label: string; color: string }> = {
  ip:     { label: "IP",     color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  domain: { label: "DOMAIN", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  url:    { label: "URL",    color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  email:  { label: "EMAIL",  color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  hash:   { label: "HASH",   color: "bg-red-500/20 text-red-300 border-red-500/30" },
  cve:    { label: "CVE",    color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
};

const INTENT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  INVESTIGATE_TARGET: { label: "Investigation Requested",  color: "text-amber-400",  icon: <Target className="w-3.5 h-3.5" /> },
  EXPLAIN_CASE:       { label: "Context Lookup",           color: "text-blue-400",   icon: <Eye className="w-3.5 h-3.5" /> },
  SUMMARIZE_FINDINGS: { label: "Findings Summary",         color: "text-green-400",  icon: <BarChart3 className="w-3.5 h-3.5" /> },
  RECOMMEND_NEXT_STEPS:{ label: "Recommendation Mode",    color: "text-purple-400", icon: <Sparkles className="w-3.5 h-3.5" /> },
  ANSWER_QUESTION:    { label: "Database Query",           color: "text-slate-400",  icon: <FileSearch className="w-3.5 h-3.5" /> },
};

const SUGGESTION_CHIPS = [
  { label: "Investigate 8.8.8.8",            prompt: "Investigate IP 8.8.8.8 found in firewall logs" },
  { label: "Check domain: example.com",       prompt: "Check domain example.com — is it suspicious?" },
  { label: "Summarize findings",              prompt: "Summarize the current investigation findings" },
  { label: "What should I do next?",          prompt: "What should I do next in this investigation?" },
  { label: "Explain active cases",            prompt: "Explain the active cases in the workspace" },
  { label: "Check CVE-2021-44228",            prompt: "Investigate CVE-2021-44228 Log4Shell vulnerability" },
];

// ─── Markdown Renderer (lightweight) ─────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let keyIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = keyIdx++;

    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key} className="text-sm font-bold text-[#B0E4CC] mt-3 mb-1 font-mono tracking-wide border-b border-[#408A71]/20 pb-1">
          {line.replace(/^## /, "")}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key} className="text-[11px] font-semibold text-[#a3c2b4] mt-2.5 mb-1 uppercase tracking-wider font-mono">
          {line.replace(/^### /, "")}
        </h3>
      );
    } else if (line.startsWith("#### ")) {
      elements.push(
        <h4 key={key} className="text-[10px] font-semibold text-slate-300 mt-2 mb-0.5 font-mono">
          {line.replace(/^#### /, "")}
        </h4>
      );
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      const content = line.replace(/^[-•] /, "");
      elements.push(
        <div key={key} className="flex gap-2 items-start text-[11px] text-slate-300 my-0.5">
          <span className="text-[#408A71] mt-0.5 shrink-0">▸</span>
          <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(content) }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s(.*)/);
      if (num) {
        elements.push(
          <div key={key} className="flex gap-2 items-start text-[11px] text-slate-300 my-0.5">
            <span className="text-[#B0E4CC] font-mono text-[10px] mt-0.5 shrink-0">{num[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(num[2]) }} />
          </div>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={key} className="h-1" />);
    } else {
      elements.push(
        <p key={key} className="text-[11px] text-slate-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }}
        />
      );
    }
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-[#0f2422] border border-[#408A71]/20 text-[#B0E4CC] text-[10px] px-1.5 py-0.5 rounded font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="text-slate-400 italic">$1</em>');
}

// ─── IOC Chips ────────────────────────────────────────────────────────────────

function IOCChips({ iocs }: { iocs: IOC[] }) {
  if (!iocs.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {iocs.map((ioc, idx) => {
        const badge = IOC_BADGE[ioc.type] || { label: ioc.type.toUpperCase(), color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
        return (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono border ${badge.color}`}
            title={`${ioc.type} — Confidence: ${ioc.confidence}%`}
          >
            <span className="opacity-60">{badge.label}</span>
            <span className="font-medium truncate max-w-[120px]">{ioc.value}</span>
          </span>
        );
      })}
    </div>
  );
}

// ─── Investigation Plan Card ──────────────────────────────────────────────────

function InvestigationPlanCard({
  action,
  onApprove,
  loading,
}: {
  action: ProposedAction;
  onApprove: (action: ProposedAction) => void;
  loading: boolean;
}) {
  return (
    <div className="mt-3 border border-amber-500/25 bg-amber-950/15 rounded-xl p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-amber-300 font-mono uppercase tracking-wider">
              Investigation Proposed
            </p>
            <p className="text-[9px] text-slate-500">
              {action.plan.total_scanners} scan(s) · ~{action.plan.estimated_seconds}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-400/70 bg-amber-950/40 border border-amber-500/20 px-2 py-1 rounded-lg">
          <Shield className="w-3 h-3" />
          Awaiting Approval
        </div>
      </div>

      {/* Scanners list */}
      <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
        {action.plan.scanners.slice(0, 8).map((s, idx) => (
          <div key={idx} className="flex items-center gap-2 text-[10px]">
            <ChevronRight className="w-3 h-3 text-[#408A71] shrink-0" />
            <span className="font-mono text-[#B0E4CC] shrink-0">{s.scanner}</span>
            <span className="text-slate-600 shrink-0">→</span>
            <code className="text-slate-400 text-[9px] truncate">{s.target}</code>
          </div>
        ))}
        {action.plan.scanners.length > 8 && (
          <p className="text-[9px] text-slate-500 pl-5">+{action.plan.scanners.length - 8} more scanners</p>
        )}
      </div>

      {/* Approval button */}
      <button
        onClick={() => onApprove(action)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
          bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC]/80
          text-white text-xs font-semibold font-mono tracking-wide
          hover:opacity-90 disabled:opacity-40 transition-all
          shadow-[0_0_20px_rgba(64,138,113,0.25)]"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {loading ? "Launching Investigation..." : "✓ Approve & Investigate"}
      </button>
    </div>
  );
}

// ─── Job Progress HUD ─────────────────────────────────────────────────────────

function JobProgressHUD({ jobId, token, onComplete }: { jobId: string; token: string; onComplete: (caseId: string) => void }) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const resp = await fetch(`/api/investigations/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (data.success) {
          setJob(data.job);
          if ((data.job.status === "completed" || data.job.status === "failed") && !completedRef.current) {
            completedRef.current = true;
            clearInterval(poll);
            onComplete(data.job.case_id);
          }
        }
      } catch {}
    }, 1500);
    return () => clearInterval(poll);
  }, [jobId, token, onComplete]);

  if (!job) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2 font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#408A71]" />
        Initializing investigation...
      </div>
    );
  }

  const pct = Math.round(job.progress) || 0;
  const statusColor = job.status === "completed" ? "text-green-400" : job.status === "failed" ? "text-red-400" : "text-amber-400";

  return (
    <div className="mt-3 border border-[#408A71]/20 bg-[#091413]/60 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <Activity className={`w-3.5 h-3.5 animate-pulse ${statusColor}`} />
          <span className={statusColor}>{job.status.toUpperCase()}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">{job.current_scanner !== "None" ? job.current_scanner : "Queued"}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3 h-3" />
          {elapsed}s
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-[#0f2422] rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: job.status === "completed"
              ? "linear-gradient(90deg, #285A48, #B0E4CC)"
              : "linear-gradient(90deg, #285A48, #408A71)",
            boxShadow: "0 0 8px rgba(64,138,113,0.5)",
          }}
        />
      </div>

      <div className="flex justify-between text-[9px] text-slate-600 font-mono">
        <span>{pct}% complete</span>
        <span>{job.completed_scanners.length}/{job.total_scanners} scanners</span>
      </div>

      {job.status === "completed" && (
        <div className="flex items-center gap-1.5 text-[9px] text-green-400 font-mono">
          <CheckCircle2 className="w-3 h-3" />
          Investigation complete. Generating summary...
        </div>
      )}
    </div>
  );
}

// ─── Main Copilot Page ────────────────────────────────────────────────────────

export default function AIInvestigationCopilotPage() {
  const { token } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "copilot",
      content: `## 🤖 AI Investigation Copilot — Online

### Welcome, Investigator

I am your AI Investigation Copilot — an intelligent interface to the Cygnal investigation workspace.

I can help you:

- Detect and extract **IOCs** from any suspicious text, logs, or alerts
- Plan and execute **parallel scans** using the Investigation Orchestrator
- **Explain** case findings and timeline events from the database
- **Summarize** completed investigations
- Recommend **next investigation steps**

### Getting Started
Paste any suspicious indicator, alert text, or case number below.
You can also use the quick-action chips to begin.

*All responses are sourced from verified local database records. No information is fabricated.*`,
      timestamp: new Date().toLocaleTimeString(),
      intent: undefined,
    },
  ]);

  const [input, setInput] = useState("");
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const addCopilotMessage = (content: string, extras: Partial<Message> = {}) => {
    setMessages(prev => [...prev, {
      role: "copilot",
      content,
      timestamp: new Date().toLocaleTimeString(),
      ...extras,
    }]);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;
    if (!textToSend) setInput("");

    const userMsg: Message = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await fetch("/api/copilot/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: query, case_id: activeCaseId }),
      });
      const data = await resp.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: "copilot",
          content: data.response,
          timestamp: new Date().toLocaleTimeString(),
          intent: data.intent,
          confidence: data.confidence,
          iocs: data.iocs_detected || [],
          proposedAction: data.proposed_action || null,
          requires_approval: data.requires_approval,
        }]);
      } else {
        toast.error(data.error || "Copilot request failed.");
      }
    } catch {
      toast.error("Copilot connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (action: ProposedAction) => {
    setApproveLoading(true);
    try {
      const resp = await fetch("/api/copilot/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ proposed_action: action }),
      });
      const data = await resp.json();

      if (data.success) {
        setActiveJobId(data.job_id);
        if (data.case_id) setActiveCaseId(data.case_id);
        addCopilotMessage(
          `## 🤖 Investigation Copilot — Investigation Launched\n\n### ✅ Orchestrator Deployed\nJob \`${data.job_id}\` is now running in parallel.\n\n### 📊 Monitoring\nTracking real-time progress below. The Knowledge Graph and Timeline will refresh automatically on completion.`,
          { intent: "INVESTIGATE_TARGET" }
        );
      } else {
        toast.error(data.error || "Investigation launch failed.");
      }
    } catch {
      toast.error("Failed to approve investigation.");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleInvestigationComplete = useCallback(async (caseId: string) => {
    setActiveJobId(null);
    if (!caseId) return;

    try {
      const resp = await fetch(`/api/copilot/summary/${caseId}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await resp.json();
      if (data.success) {
        addCopilotMessage(data.summary, {
          intent: "SUMMARIZE_FINDINGS",
          confidence: data.confidence,
        });
      }
    } catch {
      addCopilotMessage(
        `## 🤖 Investigation Copilot — Investigation Complete\n\n### ✅ Scans Finished\nAll scanners have completed. Review the **Knowledge Graph** and **Timeline** in the Cases workspace for detailed findings.`,
        { intent: "SUMMARIZE_FINDINGS" }
      );
    }
  }, [token]);

  return (
    <DashboardShell>
      <Toaster />
      <div className="flex flex-col h-full min-h-[calc(100vh-80px)] gap-0">

        {/* Header */}
        <div className="flex items-center justify-between px-1 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#285A48] to-[#B0E4CC]/30 border border-[#408A71]/30 flex items-center justify-center shadow-[0_0_20px_rgba(64,138,113,0.2)]">
              <Brain className="w-5 h-5 text-[#B0E4CC]" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white font-mono tracking-wider uppercase">
                AI Investigation Copilot
              </h1>
              <p className="text-[10px] text-slate-500">
                Intelligent investigation interface · Orchestrator-powered · Zero hallucination
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeCaseId && (
              <div className="flex items-center gap-1.5 bg-[#091413]/60 border border-[#408A71]/20 px-2.5 py-1.5 rounded-xl text-[9px] font-mono text-[#B0E4CC]">
                <Activity className="w-3 h-3 animate-pulse" />
                Case Context Active
                <button onClick={() => setActiveCaseId(null)} className="ml-1 text-slate-500 hover:text-white">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-[#091413]/60 border border-[#408A71]/20 px-2.5 py-1.5 rounded-xl text-[9px] font-mono text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              COPILOT ONLINE
            </div>
          </div>
        </div>

        {/* Main Layout: Chat + Context */}
        <div className="flex flex-1 gap-4 overflow-hidden">

          {/* Left: Chat Panel */}
          <div className="flex flex-col flex-1 min-w-0 border border-[#408A71]/15 rounded-2xl bg-[#0a1a18]/60 overflow-hidden">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                  {msg.role === "copilot" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#285A48] to-[#408A71]/60 border border-[#408A71]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="w-3.5 h-3.5 text-[#B0E4CC]" />
                    </div>
                  )}

                  <div className="max-w-[88%] space-y-1.5">
                    {/* Role label + metadata */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">
                        {msg.role === "user" ? "Investigator" : "AI Copilot"}
                      </span>
                      <span className="text-[8px] font-mono text-slate-700">{msg.timestamp}</span>
                      {msg.intent && INTENT_META[msg.intent] && (
                        <span className={`flex items-center gap-1 text-[8px] font-mono ${INTENT_META[msg.intent].color}`}>
                          {INTENT_META[msg.intent].icon}
                          {INTENT_META[msg.intent].label}
                        </span>
                      )}
                      {msg.confidence !== undefined && (
                        <span className="text-[8px] font-mono text-slate-600">
                          Confidence: {msg.confidence}%
                        </span>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div className={`rounded-2xl p-4 border text-left ${
                      msg.role === "user"
                        ? "bg-[#285A48]/15 border-[#408A71]/25 rounded-tr-sm"
                        : "bg-[#091413]/70 border-[#408A71]/12 rounded-tl-sm"
                    }`}>
                      {msg.role === "user"
                        ? <p className="text-xs text-white">{msg.content}</p>
                        : renderMarkdown(msg.content)
                      }

                      {/* IOC chips */}
                      {msg.iocs && msg.iocs.length > 0 && <IOCChips iocs={msg.iocs} />}

                      {/* Investigation proposal */}
                      {msg.requires_approval && msg.proposedAction && (
                        <InvestigationPlanCard
                          action={msg.proposedAction}
                          onApprove={handleApprove}
                          loading={approveLoading}
                        />
                      )}
                    </div>

                    {/* Live job progress for this conversation position */}
                    {activeJobId && idx === messages.length - 1 && msg.role === "copilot" && (
                      <JobProgressHUD
                        jobId={activeJobId}
                        token={token || ""}
                        onComplete={handleInvestigationComplete}
                      />
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-[#285A48]/20 border border-[#408A71]/25 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[9px] font-bold text-[#B0E4CC] uppercase select-none">
                      IN
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-[#285A48]/40 border border-[#408A71]/30 flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-[#B0E4CC] animate-spin" />
                  </div>
                  <div className="bg-[#091413]/70 border border-[#408A71]/12 rounded-2xl rounded-tl-sm p-4">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#408A71] animate-ping" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#408A71] animate-ping delay-100" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#408A71] animate-ping delay-200" />
                      <span className="ml-1">Analyzing request...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Suggestion chips */}
            <div className="px-4 pt-2 pb-1 border-t border-[#408A71]/10 flex flex-wrap gap-1.5">
              {SUGGESTION_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.prompt)}
                  disabled={loading}
                  className="text-[9px] font-mono border border-[#408A71]/15 bg-[#0f2422]/30 text-slate-500 hover:text-[#B0E4CC] hover:border-[#408A71]/35 px-2.5 py-1 rounded-lg transition-all disabled:opacity-40 cursor-pointer"
                >
                  ✦ {chip.label}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div className="border-t border-[#408A71]/15 bg-[#091413]/80 p-3">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2 items-center"
              >
                <div className="relative flex-1">
                  <Network className="absolute left-3.5 top-3.5 w-3.5 h-3.5 text-[#408A71]/50" />
                  <input
                    type="text"
                    disabled={loading}
                    placeholder="Paste an IP, domain, hash, CVE, or ask a question..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full bg-[#091413]/60 border border-[#408A71]/15 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-[#B0E4CC]/30 focus:border-[#408A71]/50 font-sans transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC]/80 text-white p-3 rounded-xl transition-all hover:opacity-90 disabled:opacity-30 cursor-pointer shadow-[0_0_15px_rgba(64,138,113,0.2)] shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Context & Status Panel */}
          <div className="w-64 shrink-0 flex flex-col gap-3">

            {/* Copilot Status */}
            <div className="border border-[#408A71]/15 bg-[#091413]/40 rounded-2xl p-3 space-y-2">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Copilot Status</p>
              <div className="space-y-1.5">
                {[
                  { label: "Intent Engine",     ok: true },
                  { label: "IOC Extractor",      ok: true },
                  { label: "RAG Database",       ok: true },
                  { label: "Orchestrator Link",  ok: true },
                  { label: "Timeline Link",      ok: true },
                  { label: "Knowledge Graph",    ok: true },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-slate-500">{label}</span>
                    <span className={ok ? "text-green-400" : "text-red-400"}>
                      {ok ? "● ONLINE" : "● OFFLINE"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* IOC Type Guide */}
            <div className="border border-[#408A71]/15 bg-[#091413]/40 rounded-2xl p-3 space-y-2">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Supported IOC Types</p>
              <div className="space-y-1">
                {Object.entries(IOC_BADGE).map(([type, badge]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${badge.color}`}>{badge.label}</span>
                    <span className="text-[9px] text-slate-600 capitalize">{type === "cve" ? "CVE Identifier" : type === "ip" ? "IP Address" : type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Investigation Workflow */}
            <div className="border border-[#408A71]/15 bg-[#091413]/40 rounded-2xl p-3 space-y-2 flex-1">
              <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Investigation Workflow</p>
              <div className="space-y-2">
                {[
                  { step: "1", label: "Paste suspicious content", icon: <FileSearch className="w-3 h-3" /> },
                  { step: "2", label: "Copilot extracts IOCs",    icon: <Target className="w-3 h-3" /> },
                  { step: "3", label: "Review proposed plan",     icon: <Shield className="w-3 h-3" /> },
                  { step: "4", label: "Approve investigation",    icon: <Play className="w-3 h-3" /> },
                  { step: "5", label: "Monitor live progress",    icon: <Activity className="w-3 h-3" /> },
                  { step: "6", label: "Review summary + next steps", icon: <Sparkles className="w-3 h-3" /> },
                ].map(({ step, label, icon }) => (
                  <div key={step} className="flex items-start gap-2 text-[9px]">
                    <span className="font-mono text-[#408A71] shrink-0 w-3">{step}.</span>
                    <span className="text-[#408A71] shrink-0 mt-px">{icon}</span>
                    <span className="text-slate-500 leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active investigation job */}
            {activeJobId && (
              <div className="border border-amber-500/20 bg-amber-950/10 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Active Job
                </div>
                <code className="text-[8px] text-slate-500 block truncate">{activeJobId}</code>
                <a
                  href="/cases"
                  className="block w-full text-center text-[9px] font-mono text-[#B0E4CC] border border-[#408A71]/25 bg-[#0f2422]/40 hover:bg-[#285A48]/20 px-2 py-1.5 rounded-lg transition-all"
                >
                  View in Cases →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
