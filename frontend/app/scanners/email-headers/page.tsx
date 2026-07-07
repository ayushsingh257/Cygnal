"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, ConfidenceBar, WarningList, IOCTable, RawDataExpander, SaveToCase, ResultSection, KVRow } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { Mail, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function EmailHeadersPage() {
  const { token } = useAuthStore();
  const [rawHeaders, setRawHeaders] = useState("");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawHeaders.trim()) { toast.error("Paste email headers."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/scanners/email-headers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ raw_headers: rawHeaders.trim(), case_id: caseId })
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("Email analysis complete"); }
      else toast.error(d.error || "Analysis failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  const AuthBadge = ({ label, status }: { label: string; status: string }) => {
    const ok = status === "pass";
    const unknown = status === "unknown";
    return (
      <div className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${ok ? "bg-emerald-950/10 border-emerald-500/15" : unknown ? "bg-slate-900 border-white/5" : "bg-red-950/10 border-red-500/15"}`}>
        {ok ? <CheckCircle size={16} className="text-emerald-400" /> : <XCircle size={16} className={unknown ? "text-slate-600" : "text-red-400"} />}
        <p className="text-[10px] font-bold text-white">{label}</p>
        <p className={`text-[9px] font-mono uppercase ${ok ? "text-emerald-400" : unknown ? "text-slate-600" : "text-red-400"}`}>{status}</p>
      </div>
    );
  };

  const SAMPLE = `From: suspicious@malicious-domain.ru\nTo: victim@company.com\nSubject: Urgent: Account Verification Required\nDate: Mon, 7 Jul 2026 09:00:00 +0000\nMessage-ID: <fake123@malicious-domain.ru>\nReceived: from mail.malicious-domain.ru (185.220.101.50) by mx.company.com\nX-Spam-Status: No\nAuthentication-Results: mx.company.com; spf=fail smtp.from=malicious-domain.ru`;

  return (
    <ScannerShell title="Email Header Analyzer" description="Parse raw email headers to trace routing hops, extract originating IPs, verify SPF/DKIM/DMARC authentication results, and detect spoofing indicators." category="Email Security" slug="email-headers">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">Paste Email Headers</h3>
            <form onSubmit={run} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="label-mono">Raw Headers</label>
                  <button type="button" onClick={() => setRawHeaders(SAMPLE)} className="text-[9px] text-blue-400 font-mono hover:text-blue-300">Load sample</button>
                </div>
                <textarea
                  value={rawHeaders}
                  onChange={e => setRawHeaders(e.target.value)}
                  placeholder="Paste raw email headers here..."
                  className="cyber-input font-mono text-[11px] h-52 leading-relaxed"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="label-mono">Attach to Case (optional)</label>
                <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2">
                {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</> : <><Mail size={13} /> Analyze Headers</>}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <Mail size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Paste headers to analyze</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest animate-pulse">Parsing header chain...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white truncate max-w-xs">{result.subject}</h2>
                  <SeverityBadge level={result.severity} />
                </div>
                <SaveToCase scannerName="Email Header Analyzer" summary={`Email: ${result.subject} from ${result.from}`} result={result} />
              </div>

              <ConfidenceBar value={result.confidence} />

              {/* Auth Status Grid */}
              <div className="grid grid-cols-3 gap-3">
                <AuthBadge label="SPF" status={result.spf} />
                <AuthBadge label="DKIM" status={result.dkim} />
                <AuthBadge label="DMARC" status={result.dmarc} />
              </div>

              <WarningList warnings={result.warnings} />

              <ResultSection title="Message Identity">
                <KVRow label="From" value={result.from} />
                <KVRow label="To" value={result.to} />
                <KVRow label="Reply-To" value={result.reply_to} />
                <KVRow label="Return-Path" value={result.return_path} />
                <KVRow label="Date" value={result.date} />
                <KVRow label="Message-ID" value={result.message_id} mono />
              </ResultSection>

              {result.hops?.length > 0 && (
                <ResultSection title={`Routing Hops (${result.hops.length})`}>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {result.hops.map((h: any) => (
                      <div key={h.hop} className="flex gap-3 items-start">
                        <span className="text-[9px] font-mono text-slate-600 pt-0.5 shrink-0">HOP {h.hop}</span>
                        <p className="text-[10px] font-mono text-slate-400 break-all">{h.raw}</p>
                      </div>
                    ))}
                  </div>
                </ResultSection>
              )}

              <IOCTable iocs={result.iocs || []} />
              <RawDataExpander data={result} />
            </div>
          )}
        </div>
      </div>
    </ScannerShell>
  );
}
