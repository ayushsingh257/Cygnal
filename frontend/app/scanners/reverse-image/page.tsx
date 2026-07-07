"use client";
import React, { useState } from "react";
import ScannerShell from "@/components/ScannerShell";
import { SeverityBadge, ConfidenceBar, WarningList, IOCTable, RawDataExpander, SaveToCase, ResultSection, KVRow } from "@/components/ScannerComponents";
import { useAuthStore } from "@/store/useAuthStore";
import { Eye, UploadCloud, MapPin, ExternalLink } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function ReverseImagePage() {
  const { token } = useAuthStore();
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const run = async (file: File) => {
    setLoading(true); setResult(null);
    setPreview(URL.createObjectURL(file));
    const form = new FormData();
    form.append("file", file);
    form.append("case_id", caseId);
    try {
      const res = await fetch("/api/scanners/reverse-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const d = await res.json();
      if (d.success) { setResult(d); toast.success("Image analysis complete"); }
      else toast.error(d.error || "Analysis failed");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  return (
    <ScannerShell title="Image Forensics" description="Extract EXIF metadata from images, decode GPS coordinates, identify device fingerprints, detect software watermarks, and assess steganography likelihood." category="Digital Forensics" slug="reverse-image">
      <Toaster />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="label-mono">Image Upload</h3>
            <label
              onDrop={e => { e.preventDefault(); setDragOver(false); e.dataTransfer.files[0] && run(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all ${dragOver ? "border-pink-500/50" : "border-white/5 hover:border-pink-500/20"}`}
            >
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white font-mono">Click to change</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 flex flex-col items-center gap-3">
                  <UploadCloud size={28} className={loading ? "text-pink-400 animate-bounce" : "text-slate-600"} />
                  <div className="text-center">
                    <p className="text-[11px] text-slate-400">{loading ? "Analyzing..." : "Drop image or click to upload"}</p>
                    <p className="text-[10px] text-slate-600 mt-1 font-mono">JPG, PNG, TIFF, GIF, BMP, WEBP</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" onChange={e => e.target.files?.[0] && run(e.target.files[0])} disabled={loading} accept="image/*" />
            </label>
            <div className="space-y-1.5">
              <label className="label-mono">Attach to Case (optional)</label>
              <input type="text" value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="Case ID" className="cyber-input" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result && !loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 text-slate-600 space-y-2">
              <Eye size={32} className="text-slate-700" />
              <p className="text-xs font-mono uppercase tracking-widest">Upload an image to analyze</p>
            </div>
          )}
          {loading && (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
              <p className="text-[10px] font-mono text-pink-400 uppercase tracking-widest animate-pulse">Parsing EXIF metadata...</p>
            </div>
          )}
          {result && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold text-white">{result.filename}</h2>
                  <SeverityBadge level={result.severity} />
                </div>
                <SaveToCase scannerName="Image Forensics" summary={`Image analysis: ${result.filename}`} result={result} />
              </div>

              <ConfidenceBar value={result.confidence} />
              <WarningList warnings={result.warnings} />

              {result.gps?.latitude && (
                <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-950/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-red-400" />
                    <h4 className="text-[11px] font-bold text-red-400 uppercase tracking-wider">GPS Location Detected</h4>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono">
                    {result.gps.latitude.toFixed(6)}°, {result.gps.longitude.toFixed(6)}°
                  </p>
                  <a href={result.gps.maps_link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-mono">
                    <ExternalLink size={10} /> View on Google Maps
                  </a>
                </div>
              )}

              <ResultSection title="Image Properties">
                <KVRow label="Dimensions" value={result.dimensions} />
                <KVRow label="Format" value={result.format} />
                <KVRow label="Color Mode" value={result.color_mode} />
                <KVRow label="Device" value={result.device || "Unknown"} />
                <KVRow label="Entropy" value={`${result.pixel_entropy}/8.0`} mono />
                <KVRow label="Steg Suspect" value={result.steganography_suspect ? "YES — investigate further" : "No"} />
                <KVRow label="EXIF Fields" value={String(result.exif_fields_count)} />
              </ResultSection>

              <ResultSection title="File Identity">
                <KVRow label="Size" value={`${(result.file_size / 1024).toFixed(2)} KB`} />
                <KVRow label="SHA-256" value={result.sha256} mono />
                <KVRow label="MD5" value={result.md5} mono />
              </ResultSection>

              {/* Search Links */}
              {result.search_links && (
                <ResultSection title="Reverse Image Search">
                  <div className="flex gap-3 flex-wrap">
                    {Object.entries(result.search_links).map(([name, link]) => (
                      <a key={name} href={String(link)} target="_blank" rel="noopener noreferrer"
                        className="btn-cyber text-[10px] flex items-center gap-1.5">
                        <ExternalLink size={10} /> {name.replace("_", " ")}
                      </a>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">Upload the image manually to these services for visual reverse search</p>
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
