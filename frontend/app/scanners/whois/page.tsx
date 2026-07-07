"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, WarningList, IOCTable, RawDataExpander, SaveToCase, ResultSection, KVRow } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { Search, Globe } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function WHOISPage() {
  const { token } = useAuthStore();
  const [target, setTarget] = useState("");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) { toast.error("Enter a domain or IP."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/scanners/whois", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ target: target.trim(), case_id: caseId })
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("WHOIS lookup complete"); }
      else toast.error(d.error || "Lookup failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  return (
    <ScannerShell title="WHOIS Lookup" description="Query domain and IP ownership records, registrar information, creation dates, nameservers, and registration status." category="Reconnaissance" slug="whois">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">Query Parameters</h3>
            <form onSubmit={run} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-mono">Target Domain or IP</label>
                <div className="relative">
                  <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="text" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. google.com or 8.8.8.8" className="cyber-input pl-9" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label-mono">Attach to Case (optional)</label>
                <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2">
                {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Querying WHOIS...</> : <><Search size={13} /> Run WHOIS Lookup</>}
              </button>
            </form>
          </div>

          {/* Scan Tips */}
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h4 className="label-mono">Investigation Notes</h4>
            <ul className="text-[11px] text-slate-500 space-y-1 leading-relaxed list-disc list-inside">
              <li>Check registrar for known bullet-proof hosting providers</li>
              <li>Recent creation dates (&lt;30 days) often indicate phishing domains</li>
              <li>Mismatched nameservers can indicate domain hijacking</li>
              <li>Missing DNSSEC increases risk of DNS spoofing attacks</li>
            </ul>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <Globe size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Awaiting WHOIS query</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest animate-pulse">Querying WHOIS database...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white">{result.target}</h2>
                  <SeverityBadge level={result.risk} />
                </div>
                <SaveToCase scannerName="WHOIS Lookup" summary={`WHOIS for ${result.target}: Registrar=${result.result.registrar}`} result={result} />
              </div>

              {result.risk_reasons?.length > 0 && <WarningList warnings={result.risk_reasons} />}

              <ResultSection title="Registration Details">
                <KVRow label="Registrar" value={result.result.registrar} />
                <KVRow label="Registrant" value={result.result.registrant_name} />
                <KVRow label="Organization" value={result.result.org} />
                <KVRow label="Country" value={result.result.country} />
                <KVRow label="Created" value={result.result.creation_date} />
                <KVRow label="Expires" value={result.result.expiration_date} />
                <KVRow label="Updated" value={result.result.updated_date} />
                <KVRow label="Status" value={result.result.status} />
                <KVRow label="DNSSEC" value={result.result.dnssec} />
              </ResultSection>

              <ResultSection title="DNS Configuration">
                <KVRow label="Nameservers" value={result.result.name_servers} />
                <KVRow label="Emails" value={result.result.emails} />
              </ResultSection>

              <RawDataExpander data={result} />
            </div>
          )}
        </div>
      </div>
    </ScannerShell>
  );
}
