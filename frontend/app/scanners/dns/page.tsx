"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, WarningList, IOCTable, RawDataExpander, SaveToCase, ResultSection } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { DatabaseZap, CheckCircle, XCircle } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function DNSPage() {
  const { token } = useAuthStore();
  const [domain, setDomain] = useState("");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) { toast.error("Enter a domain."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/scanners/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ domain: domain.trim(), case_id: caseId })
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("DNS scan complete"); }
      else toast.error(d.error || "DNS query failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  const RecordSection = ({ type, records }: { type: string; records: string[] }) => {
    if (!records?.length) return null;
    return (
      <div className="space-y-1">
        <p className="label-mono">{type} Records ({records.length})</p>
        {records.map((r, i) => (
          <div key={i} className="px-3 py-1.5 bg-black/20 rounded-lg font-mono text-[11px] text-slate-300 break-all border border-white/[0.03]">{r}</div>
        ))}
      </div>
    );
  };

  return (
    <ScannerShell title="DNS Intelligence" description="Enumerate DNS records including A, AAAA, MX, NS, TXT, and CNAME entries. Verify SPF, DMARC configurations, and detect DNS misconfigurations." category="Reconnaissance" slug="dns">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">Query Parameters</h3>
            <form onSubmit={run} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-mono">Target Domain</label>
                <div className="relative">
                  <DatabaseZap size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. example.com" className="cyber-input pl-9" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label-mono">Attach to Case (optional)</label>
                <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2">
                {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Querying DNS...</> : <><DatabaseZap size={13} /> Run DNS Scan</>}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <DatabaseZap size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Awaiting DNS query</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest animate-pulse">Resolving DNS records...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white">{result.domain}</h2>
                  <SeverityBadge level={result.severity} />
                </div>
                <SaveToCase scannerName="DNS Intelligence" summary={`DNS scan: ${result.domain}`} result={result} />
              </div>

              {/* Auth Status */}
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "SPF", ok: result.spf }, { label: "DMARC", ok: result.dmarc }].map(({ label, ok }) => (
                  <div key={label} className={`flex items-center gap-2 p-3 rounded-xl border ${ok ? "bg-emerald-950/10 border-emerald-500/15" : "bg-red-950/10 border-red-500/15"}`}>
                    {ok ? <CheckCircle size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
                    <div>
                      <p className="text-[11px] font-bold text-white">{label}</p>
                      <p className={`text-[9px] font-mono uppercase ${ok ? "text-emerald-400" : "text-red-400"}`}>{ok ? "Configured" : "Missing"}</p>
                    </div>
                  </div>
                ))}
              </div>

              <WarningList warnings={result.warnings} />

              <ResultSection title="DNS Records">
                <div className="space-y-4">
                  {Object.entries(result.records || {}).map(([type, records]) => (
                    <RecordSection key={type} type={type} records={records as string[]} />
                  ))}
                </div>
              </ResultSection>

              <IOCTable iocs={result.iocs || []} />
              <RawDataExpander data={result} />
            </div>
          )}
        </div>
      </div>
    </ScannerShell>
  );
}
