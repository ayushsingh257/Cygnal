"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, WarningList, RawDataExpander, SaveToCase, ResultSection, KVRow } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { Camera, Globe, ExternalLink } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function ScreenshotPage() {
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
      const res = await fetch("/api/scanners/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim(), case_id: caseId })
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("Page archived"); }
      else toast.error(d.error || "Archive failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  return (
    <ScannerShell title="Page Archiver" description="Archive web page metadata including technology stack detection, external link enumeration, form identification, and page content analysis." category="Web Security" slug="screenshot">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">Query Parameters</h3>
            <form onSubmit={run} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label-mono">Target URL</label>
                <div className="relative">
                  <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" className="cyber-input pl-9" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="label-mono">Attach to Case (optional)</label>
                <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
              </div>
              <button type="submit" disabled={loading} className="btn-cyber-primary w-full flex items-center justify-center gap-2">
                {loading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Archiving...</> : <><Camera size={13} /> Archive Page</>}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <Camera size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Awaiting page archive request</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest animate-pulse">Fetching and archiving page...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-sm font-bold text-white truncate max-w-sm">{result.title}</h2>
                <SaveToCase scannerName="Page Archiver" summary={`Page archived: ${result.url}`} result={result} />
              </div>

              <WarningList warnings={result.warnings} />

              <ResultSection title="Page Identity">
                <KVRow label="Title" value={result.title} />
                <KVRow label="Description" value={result.description} />
                <KVRow label="Final URL" value={result.final_url} />
                <KVRow label="Status Code" value={String(result.status_code)} />
                <KVRow label="Content Type" value={result.content_type} />
                <KVRow label="Page Size" value={`${(result.page_size_bytes / 1024).toFixed(1)} KB`} />
              </ResultSection>

              {result.technologies?.length > 0 && (
                <ResultSection title="Technology Stack">
                  <div className="flex flex-wrap gap-2">
                    {result.technologies.map((t: string) => (
                      <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">{t}</span>
                    ))}
                  </div>
                </ResultSection>
              )}

              {result.forms?.length > 0 && (
                <ResultSection title={`Forms (${result.forms.length})`}>
                  {result.forms.map((f: any, i: number) => (
                    <div key={i} className="flex gap-3 text-[11px] py-1 border-b border-white/[0.03] last:border-0">
                      <span className="font-mono text-amber-400">{f.method}</span>
                      <span className="text-slate-400 truncate">{f.action || "(same page)"}</span>
                    </div>
                  ))}
                </ResultSection>
              )}

              {result.external_links?.length > 0 && (
                <ResultSection title={`External Links (${result.external_link_count})`}>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.external_links.map((l: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-white/[0.03] last:border-0">
                        <ExternalLink size={10} className="text-slate-700 shrink-0" />
                        <a href={l} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-blue-400 hover:text-blue-300 truncate">{l}</a>
                      </div>
                    ))}
                  </div>
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
