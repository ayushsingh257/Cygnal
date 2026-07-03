"use client";

import React, { useState, useEffect } from "react";
import MapDisplay from "./MapDisplay";
import MetadataDiff from "./MetadataDiff";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

type MetaResult = {
  filename: string;
  metadata: Record<string, any>;
  threats: string[];
  score: "Low" | "Medium" | "High";
  note?: string;
};

export default function MetadataTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<MetaResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const MAX_FILE_SIZE_MB = 10;

  const { setToolUsed, addToHistory } = useReportStore();
  const { user, token } = useAuthStore();

  if (!user) {
    return <p className="text-red-400 text-xs font-mono">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 text-xs font-mono">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  useEffect(() => {
    const logs = sessionStorage.getItem("metaLogs");
    if (logs) setResults(JSON.parse(logs));
  }, []);

  useEffect(() => {
    sessionStorage.setItem("metaLogs", JSON.stringify(results));
  }, [results]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).filter((f) => {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`File ${f.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const analyzeThreats = (meta: Record<string, any>) => {
    const issues: string[] = [];
    let score: "Low" | "Medium" | "High" = "Low";

    const created = new Date(meta.creationDate || meta.Created || "");
    const modified = new Date(meta.modificationDate || meta.Modified || "");

    if (!isNaN(created.getTime()) && created.getTime() > Date.now()) {
      issues.push("Future creation date detected");
      score = "Medium";
    }
    if (!isNaN(created.getTime()) && !isNaN(modified.getTime()) && modified < created) {
      issues.push("Modification date predates creation date");
      score = "Medium";
    }
    if (meta.author && meta.creator && meta.author !== meta.creator) {
      issues.push("Author and software creator identity mismatch");
      score = "Medium";
    }
    if (meta.title && /(tracker|spy|surveil|monitor)/i.test(meta.title)) {
      issues.push("Suspicious title parameter match");
      score = "High";
    }
    if (meta.Software && /crack|spy|anonym/i.test(meta.Software)) {
      issues.push("Suspicious software tool identifier signature");
      score = "High";
    }
    return { issues, score };
  };

  const handleUpload = async () => {
    setLoading(true);
    const newResults: MetaResult[] = [];

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);

      try {
        const finalResult = await submitAndPoll(
          "/api/metadata",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          },
          () => {}
        );

        const metadata = finalResult.metadata || { error: "Unknown error" };
        const { issues, score } = analyzeThreats(metadata);
        const result: MetaResult = {
          filename: file.name,
          metadata,
          threats: issues,
          score,
        };

        addToHistory({
          tool: "Metadata",
          input: file.name,
          result: JSON.stringify({
            score,
            threats: issues.slice(0, 3),
            keys: Object.keys(metadata).slice(0, 3),
          }, null, 2),
        });

        setToolUsed("metadataUsed");

        await fetch("/api/log-scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tool: "Metadata Extraction",
            input: file.name,
            result: {
              score,
              threats: issues,
              fields: Object.keys(metadata),
            },
          }),
        });

        newResults.push(result);
      } catch (err: unknown) {
        newResults.push({
          filename: file.name,
          metadata: { error: err instanceof Error ? err.message : "Upload failed" },
          threats: [],
          score: "Low",
        });
      }
    }

    setResults((prev) => [...prev, ...newResults]);
    setFiles([]);
    setLoading(false);
  };

  const handleNoteChange = (index: number, note: string) => {
    const updated = [...results];
    updated[index].note = note;
    setResults(updated);
  };

  const downloadAllMetadata = async () => {
    const zip = new JSZip();
    const csvLines = ["Filename,Key,Value"];

    results.forEach((res) => {
      const jsonContent = JSON.stringify(res.metadata, null, 2);
      zip.file(`${res.filename.replace(/\.[^.]+$/, "")}.json`, jsonContent);

      Object.entries(res.metadata).forEach(([k, v]) => {
        csvLines.push(`"${res.filename}","${k}","${String(v).replace(/"/g, '""')}"`);
      });
    });

    zip.file("summary.csv", csvLines.join("\n"));
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "Cygnal_Metadata_Export.zip");
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="space-y-4 text-left font-mono">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">Select Target Files</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.pdf,.docx"
            className="w-full bg-[#09090b] border border-white/5 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
          />
          <p className="text-[9px] text-zinc-500">
            Supported: JPG, PNG, PDF, DOCX | Max size: {MAX_FILE_SIZE_MB}MB each
          </p>
        </div>
        {files.length > 0 && (
          <Button onClick={handleUpload} disabled={loading} className="w-full md:w-auto h-9">
            {loading ? "Extracting..." : `Extract Metadata (${files.length})`}
          </Button>
        )}
      </div>

      {files.length > 0 && (
        <div className="p-3 bg-black/20 border border-white/5 rounded-md">
          <div className="text-[10px] text-zinc-500 mb-1">STAGED FILE STACK:</div>
          <ul className="text-xs text-zinc-300 space-y-0.5 list-disc list-inside">
            {files.map((f) => (
              <li key={f.name} className="truncate">{f.name}</li>
            ))}
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={downloadAllMetadata}
            className="btn-cyber-secondary px-3 py-1.5 text-[10px] uppercase font-bold"
          >
            Export All (ZIP)
          </button>
          <button
            onClick={clearResults}
            className="btn-cyber-secondary px-3 py-1.5 text-[10px] text-red-400 hover:text-red-300 border-red-500/10 hover:border-red-500/35 uppercase font-bold"
          >
            Clear logs
          </button>
        </div>
      )}

      <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
        {results.map((res, idx) => (
          <div key={idx} className="bg-black/25 border border-white/5 p-4 rounded-md space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-gray-250 truncate">{res.filename}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-zinc-500 uppercase">THREAT SCORE:</span>
                  <span className={`tag-severity tag-severity-${res.score.toLowerCase()}`}>
                    {res.score}
                  </span>
                </div>
                {res.threats.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {res.threats.map((t, i) => (
                      <div key={i} className="text-[10px] text-yellow-500/90">⚠️ {t}</div>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                value={res.note || ""}
                onChange={(e) => handleNoteChange(idx, e.target.value)}
                placeholder="Analyst note logs..."
                className="w-full sm:w-60 text-xs bg-[#09090b] text-white border border-white/5 rounded p-2 h-16 resize-none focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <div className="text-[10px] text-zinc-500">CORRELATED PARAMETERS:</div>
                <ul className="text-xs space-y-1 text-zinc-350">
                  <li className="truncate"><span className="text-cyan-400 font-semibold uppercase text-[9px] mr-1.5">Author:</span> {res.metadata.author || "N/A"}</li>
                  <li className="truncate"><span className="text-cyan-400 font-semibold uppercase text-[9px] mr-1.5">Title:</span> {res.metadata.title || "N/A"}</li>
                  <li className="truncate"><span className="text-cyan-400 font-semibold uppercase text-[9px] mr-1.5">Created:</span> {res.metadata.created || res.metadata.creationDate || "N/A"}</li>
                  <li className="truncate"><span className="text-cyan-400 font-semibold uppercase text-[9px] mr-1.5">Modified:</span> {res.metadata.modified || res.metadata.modDate || "N/A"}</li>
                </ul>
              </div>

              {res.metadata?.GPSLatitude && res.metadata?.GPSLongitude && (
                <div className="h-32 border border-white/5 rounded overflow-hidden">
                  <MapDisplay
                    latitude={res.metadata.GPSLatitude}
                    longitude={res.metadata.GPSLongitude}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {results.length >= 2 && (
          <div className="border-t border-white/5 pt-4">
            <MetadataDiff file1={results[0]} file2={results[1]} />
          </div>
        )}
      </div>
    </div>
  );
}
