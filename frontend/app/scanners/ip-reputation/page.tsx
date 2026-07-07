"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, WarningList, IOCTable, RawDataExpander, SaveToCase, ResultSection, KVRow } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { Radar, MapPin } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function IPReputationPage() {
  const { token } = useAuthStore();
  const [ip, setIp] = useState("");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) { toast.error("Enter an IP address."); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/scanners/ip-reputation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ip: ip.trim(), case_id: caseId })
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("IP lookup complete"); }
      else toast.error(d.error || "Lookup failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  const riskColor = (score: number) =>
    score >= 50 ? "text-red-400" : score >= 20 ? "text-amber-400" : "text-emerald-400";
  const riskBg = (score: number) =>
    score >= 50 ? "bg-red-500" : score >= 20 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <ScannerShell title="IP Reputation" description="Geolocate IP addresses, identify ASN and hosting provider, detect TOR exit nodes, and cross-reference against known threat actor subnets." category="Threat Intelligence" slug="ip-reputation">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">Query Parameters</h3>
            <form onSubmit={run} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-mono">IPv4 Address</label>
                <div className="relative">
                  <Radar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="text" value={ip} onChange={e => setIp(e.target.value)} placeholder="e.g. 8.8.8.8" className="cyber-input pl-9 font-mono" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label-mono">Attach to Case (optional)</label>
                <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2">
                {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking reputation...</> : <><Radar size={13} /> Query IP Reputation</>}
              </button>
            </form>
          </div>
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h4 className="label-mono">Analysis Includes</h4>
            <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
              <li>Geolocation (country, city, region)</li>
              <li>ASN and ISP identification</li>
              <li>Hosting/datacenter detection</li>
              <li>TOR exit node database check</li>
              <li>Known threat actor subnet matching</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <Radar size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Awaiting IP query</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest animate-pulse">Querying threat intelligence feeds...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white font-mono">{result.ip}</h2>
                  <SeverityBadge level={result.severity} />
                </div>
                <SaveToCase scannerName="IP Reputation" summary={`IP: ${result.ip}, Risk=${result.severity}`} result={result} />
              </div>

              {/* Risk Score Gauge */}
              <div className="glass-card rounded-xl p-5 flex items-center gap-6">
                <div className="text-center shrink-0">
                  <p className={`text-4xl font-black ${riskColor(result.risk_score)}`}>{result.risk_score}</p>
                  <p className="label-mono mt-1">Risk Score</p>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${riskBg(result.risk_score)}`} style={{ width: `${result.risk_score}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">{result.risk_score === 0 ? "No threats detected" : result.risk_score < 30 ? "Low risk — clean IP" : result.risk_score < 60 ? "Medium risk — investigate further" : "High risk — known threat actor"}</p>
                </div>
              </div>

              <WarningList warnings={result.warnings} />

              <ResultSection title="Geolocation">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={12} className="text-blue-400" />
                  <span className="text-[11px] text-slate-300">{[result.city, result.region, result.country].filter(Boolean).join(", ")}</span>
                </div>
                <KVRow label="Country" value={result.country} />
                <KVRow label="Region" value={result.region} />
                <KVRow label="City" value={result.city} />
                <KVRow label="Timezone" value={result.timezone} />
                <KVRow label="Coordinates" value={result.location} mono />
              </ResultSection>

              <ResultSection title="Network Identity">
                <KVRow label="ASN" value={result.asn} mono />
                <KVRow label="ISP / Org" value={result.isp} />
                <KVRow label="Full Org" value={result.org} />
                <KVRow label="Hostname" value={result.hostname} />
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
