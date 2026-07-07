"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, WarningList, RawDataExpander, SaveToCase, ResultSection, KVRow } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { Wifi, CheckCircle, XCircle } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function HeaderScannerPage() {
  const { token } = useAuthStore();
  const [url, setUrl] = useState("");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) { toast.error("Enter a URL."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/scanners/headers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim(), case_id: caseId })
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("Header scan complete"); }
      else toast.error(d.error || "Scan failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  const scoreColor = (score: number) =>
    score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <ScannerShell title="HTTP Header Scanner" description="Audit security response headers, detect missing protections like CSP/HSTS, identify server information disclosure, and score overall security posture." category="Web Security" slug="headers">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">Query Parameters</h3>
            <form onSubmit={run} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-mono">Target URL</label>
                <div className="relative">
                  <Wifi size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="cyber-input pl-9" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label-mono">Attach to Case (optional)</label>
                <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2">
                {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning...</> : <><Wifi size={13} /> Scan Headers</>}
              </button>
            </form>
          </div>
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h4 className="label-mono">Security Headers Checked</h4>
            <ul className="text-[11px] text-slate-500 space-y-1 font-mono">
              {["Strict-Transport-Security", "Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"].map(h => (
                <li key={h} className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-slate-700" />{h}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <Wifi size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Awaiting header scan</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest animate-pulse">Fetching security headers...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white truncate max-w-xs">{result.target}</h2>
                  <SeverityBadge level={result.severity} />
                  <span className="text-[10px] font-mono text-slate-500">HTTP {result.status_code}</span>
                </div>
                <SaveToCase scannerName="HTTP Header Scanner" summary={`Header scan for ${result.target}: score ${result.security_score}%`} result={result} />
              </div>

              {/* Score Card */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-6">
                <div className="text-center shrink-0">
                  <p className={`text-4xl font-black ${scoreColor(result.security_score)}`}>{result.security_score}</p>
                  <p className="label-mono mt-1">Security Score</p>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${result.security_score >= 70 ? "bg-emerald-500" : result.security_score >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${result.security_score}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>{result.present_count} headers present</span>
                    <span>{result.missing_count} headers missing</span>
                  </div>
                </div>
              </div>

              <WarningList warnings={result.warnings} />

              {/* Header audit table */}
              <ResultSection title="Security Header Audit">
                <div className="space-y-1">
                  {result.security_headers?.map((h: any) => (
                    <div key={h.header} className="flex items-start gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
                      {h.status === "present"
                        ? <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                        : <XCircle size={12} className="text-red-400 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono text-slate-300">{h.header}</p>
                        {h.value && <p className="text-[10px] text-slate-600 truncate">{h.value}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </ResultSection>

              <ResultSection title="Server Information">
                <KVRow label="Server" value={result.server} />
                <KVRow label="Powered By" value={result.powered_by} />
                <KVRow label="Content Type" value={result.content_type} />
                {result.redirect_url && <KVRow label="Redirect" value={result.redirect_url} />}
              </ResultSection>

              <RawDataExpander data={result} />
            </div>
          )}
        </div>
      </div>
    </ScannerShell>
  );
}
