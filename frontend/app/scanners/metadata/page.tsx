"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, ConfidenceBar, WarningList, IOCTable, RawDataExpander, SaveToCase, ResultSection, KVRow } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { FileSearch, UploadCloud } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function MetadataPage() {
  const { token } = useAuthStore();
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);

  const run = async (file: File) => {
    setLoading(true); setResult(null);
    const form = new FormData();
    form.append("file", file);
    form.append("case_id", caseId);
    try {
      const res = await fetch("/api/scanners/metadata", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("Metadata extracted"); }
      else toast.error(d.error || "Extraction failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) run(f);
  };

  return (
    <ScannerShell title="Metadata Extractor" description="Extract hidden metadata from images, PDFs, and Office documents including author identity, creation timestamps, GPS coordinates, and software signatures." category="Document Forensics" slug="metadata">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">File Upload</h3>
            <label
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${dragOver ? "border-blue-500/50 bg-blue-950/10" : "border-white/5 hover:border-blue-500/20"}`}
            >
              <UploadCloud size={28} className={loading ? "text-blue-400 animate-bounce" : "text-slate-600"} />
              <div className="text-center">
                <p className="text-[11px] text-slate-400">{loading ? "Extracting metadata..." : "Drop file or click to upload"}</p>
                <p className="text-[10px] text-slate-600 mt-1 font-mono">JPG, PNG, PDF, DOCX, TIFF</p>
              </div>
              <input type="file" className="hidden" onChange={e => e.target.files?.[0] && run(e.target.files[0])} disabled={loading} accept=".jpg,.jpeg,.png,.pdf,.docx,.tiff,.gif,.bmp,.webp" />
            </label>
            <div className="space-y-1.5">
              <label className="label-mono">Attach to Case (optional)</label>
              <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 space-y-2">
            <h4 className="label-mono">Extracts From</h4>
            <div className="grid grid-cols-2 gap-2">
              {[["Images", "EXIF, GPS, device"], ["PDFs", "Author, creator, dates"], ["Word Docs", "Author, revisions, modifier"], ["Metadata", "Software, watermarks"]].map(([t, d]) => (
                <div key={t} className="p-2 bg-white/[0.02] rounded-lg">
                  <p className="text-[10px] font-bold text-slate-300">{t}</p>
                  <p className="text-[9px] text-slate-600">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <FileSearch size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Upload a file to extract metadata</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest animate-pulse">Parsing metadata fields...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white">{result.filename}</h2>
                  <SeverityBadge level={result.severity} />
                </div>
                <SaveToCase scannerName="Metadata Extractor" summary={`Metadata: ${result.filename}, ${result.iocs?.length || 0} IOCs`} result={result} />
              </div>

              <ConfidenceBar value={result.confidence} />
              <WarningList warnings={result.warnings} />

              <ResultSection title="File Identity">
                <KVRow label="Filename" value={result.filename} />
                <KVRow label="File Type" value={result.file_type} />
                <KVRow label="Size" value={`${(result.file_size / 1024).toFixed(2)} KB`} />
                <KVRow label="SHA-256" value={result.sha256} mono />
                <KVRow label="MD5" value={result.md5} mono />
              </ResultSection>

              {Object.keys(result.metadata || {}).length > 0 && (
                <ResultSection title={`Metadata Fields (${Object.keys(result.metadata).length})`}>
                  <div className="max-h-48 overflow-y-auto space-y-0">
                    {Object.entries(result.metadata).map(([k, v]) => (
                      <KVRow key={k} label={k} value={String(v)} mono={k.includes("GPS") || k.includes("hash")} />
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
