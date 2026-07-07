"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, ConfidenceBar, WarningList, RawDataExpander, SaveToCase, ResultSection, KVRow } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert, AlertTriangle, ShieldCheck, ChevronDown } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

const IOC_TYPES = ["auto", "ip", "domain", "sha256", "md5", "sha1", "cve", "url"];

export default function ThreatIntelPage() {
  const { token } = useAuthStore();
  const [ioc, setIoc] = useState("");
  const [iocType, setIocType] = useState("auto");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ioc.trim()) { toast.error("Enter an IOC value."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/scanners/threat-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ioc: ioc.trim(), ioc_type: iocType, case_id: caseId })
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("Threat lookup complete"); }
      else toast.error(d.error || "Lookup failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  return (
    <ScannerShell title="Threat Intelligence" description="Look up indicators of compromise (IOCs) across threat intelligence feeds, cross-reference with previous Cygnal investigations, and enrich CVE data." category="Threat Intelligence" slug="threat-intel">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">IOC Query</h3>
            <form onSubmit={run} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-mono">IOC Value</label>
                <div className="relative">
                  <ShieldAlert size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="text" value={ioc} onChange={e => setIoc(e.target.value)} placeholder="IP, domain, hash, CVE, URL..." className="cyber-input pl-9 font-mono" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label-mono">IOC Type</label>
                <div className="relative">
                  <select value={iocType} onChange={e => setIocType(e.target.value)} className="cyber-input appearance-none pr-8">
                    {IOC_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label-mono">Attach to Case (optional)</label>
                <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2">
                {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Looking up...</> : <><ShieldAlert size={13} /> Query Threat Intel</>}
              </button>
            </form>
          </div>
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h4 className="label-mono">Intelligence Sources</h4>
            <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
              <li>Cygnal Local Hash Database</li>
              <li>Cygnal Investigation Timeline X-Ref</li>
              <li>Production: VirusTotal / OTX / MISP</li>
              <li>Production: AbuseIPDB / NVD/NIST</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <ShieldAlert size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Enter an IOC to query</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-orange-400 uppercase tracking-widest animate-pulse">Querying threat feeds...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white font-mono truncate max-w-xs">{result.ioc}</h2>
                  <SeverityBadge level={result.severity} />
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-white/5">{result.ioc_type}</span>
                </div>
                <SaveToCase scannerName="Threat Intelligence" summary={`Threat intel: ${result.ioc} (${result.ioc_type})`} result={result} />
              </div>

              {/* Threat Banner */}
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${result.threat_found ? "bg-red-950/15 border-red-500/20" : "bg-emerald-950/10 border-emerald-500/15"}`}>
                {result.threat_found
                  ? <AlertTriangle size={24} className="text-red-400 shrink-0" />
                  : <ShieldCheck size={24} className="text-emerald-400 shrink-0" />}
                <div>
                  <p className={`font-black text-sm uppercase ${result.threat_found ? "text-red-400" : "text-emerald-400"}`}>
                    {result.threat_found ? "Known Threat Detected" : "No Threat Match"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {result.threat_found ? `Type: ${result.threat_details?.type}` : "IOC not found in current threat feeds"}
                  </p>
                </div>
              </div>

              <ConfidenceBar value={result.confidence} />
              <WarningList warnings={result.warnings} />

              {result.threat_details && (
                <ResultSection title="Threat Intelligence Match">
                  <KVRow label="Type" value={result.threat_details.type} />
                  <KVRow label="First Seen" value={result.threat_details.first_seen} />
                  <KVRow label="Confidence" value={`${result.threat_details.confidence}%`} />
                  <div className="space-y-1">
                    <p className="label-mono">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {result.threat_details.tags?.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/15">{tag}</span>
                      ))}
                    </div>
                  </div>
                </ResultSection>
              )}

              {result.db_hits?.length > 0 && (
                <ResultSection title={`Cygnal Timeline Cross-References (${result.db_hits.length})`}>
                  {result.db_hits.map((hit: any, i: number) => (
                    <div key={i} className="py-2 border-b border-white/[0.03] last:border-0 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-mono font-bold text-blue-400">{hit.case_number}</span>
                        <span className="text-[9px] text-slate-600 font-mono">{hit.timestamp?.split("T")[0]}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{hit.description}</p>
                    </div>
                  ))}
                </ResultSection>
              )}

              {result.cve_details && (
                <ResultSection title="CVE Information">
                  <KVRow label="CVE ID" value={result.cve_details.id} mono />
                  <KVRow label="CVSS Score" value={result.cve_details.cvss_score} />
                  <KVRow label="Note" value={result.cve_details.note} />
                </ResultSection>
              )}

              <RawDataExpander data={result} />
            </div>
          )}
        </div>
      </div>
    </ScannerShell>
  );
}
