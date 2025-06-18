"use client";

import React, { useState, useEffect } from "react";
import MapDisplay from "./MapDisplay";
import MetadataDiff from "./MetadataDiff";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
  const [diffIndexes, setDiffIndexes] = useState<number[]>([]);
  const MAX_FILE_SIZE_MB = 10;

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
      issues.push("⚠️ Future creation date");
      score = "Medium";
    }
    if (!isNaN(created.getTime()) && !isNaN(modified.getTime()) && modified < created) {
      issues.push("⚠️ Modified before creation");
      score = "Medium";
    }
    if (meta.author && meta.creator && meta.author !== meta.creator) {
      issues.push("⚠️ Author and creator mismatch");
      score = "Medium";
    }
    if (meta.title && /(tracker|spy|surveil|monitor)/i.test(meta.title)) {
      issues.push("🚨 Suspicious title keyword");
      score = "High";
    }
    if (meta.Software && /crack|spy|anonym/i.test(meta.Software)) {
      issues.push("🚨 Suspicious software identifier");
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

      const res = await fetch("http://localhost:5000/api/metadata", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        newResults.push({
          filename: file.name,
          metadata: { error: data.error || "Unknown error" },
          threats: [],
          score: "Low",
        });
        continue;
      }

      const { issues, score } = analyzeThreats(data.metadata);

      newResults.push({
        filename: file.name,
        metadata: data.metadata,
        threats: issues,
        score,
      });
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

  return (
    <div className="p-4 bg-gray-900 rounded-xl shadow-md text-white max-w-5xl mx-auto mt-6">
      <h2 className="text-2xl font-bold mb-4">📄 Metadata Recon Tool</h2>

      <input
        type="file"
        multiple
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.pdf,.docx"
        className="mb-2"
      />
      <p className="text-xs text-gray-400 mb-4">
        Supported: JPG, PNG, PDF, DOCX | Max: {MAX_FILE_SIZE_MB}MB each
      </p>

      {files.length > 0 && (
        <div className="mb-4">
          <ul className="list-disc list-inside text-sm mb-2 text-gray-300">
            {files.map((f) => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Processing..." : "Extract Metadata"}
          </button>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={downloadAllMetadata}
          className="bg-green-600 px-3 py-2 rounded hover:bg-green-700 text-sm"
        >
          ⬇ Export All Metadata (JSON + CSV)
        </button>
      </div>

      {results.length >= 2 && (
        <div className="mb-4">
          <h4 className="text-sm text-gray-300 mb-1">🔍 Compare Two Files:</h4>
          <div className="flex gap-2">
            {results.map((res, idx) => (
              <button
                key={idx}
                className={`text-xs px-2 py-1 border rounded ${
                  diffIndexes.includes(idx) ? "bg-blue-700" : "bg-gray-800"
                }`}
                onClick={() => {
                  const selected = diffIndexes.includes(idx)
                    ? diffIndexes.filter((i) => i !== idx)
                    : [...diffIndexes, idx].slice(-2);
                  setDiffIndexes(selected);
                }}
              >
                {res.filename}
              </button>
            ))}
          </div>
        </div>
      )}

      {diffIndexes.length === 2 && (
        <MetadataDiff
          file1={results[diffIndexes[0]]}
          file2={results[diffIndexes[1]]}
        />
      )}

      <div className="space-y-6">
        {results.map((res, idx) => (
          <div key={idx} className="bg-gray-800 p-4 rounded shadow">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-semibold">{res.filename}</h3>
                <p className="text-sm text-yellow-400">
                  Threat Score: {res.score}
                </p>
                {res.threats.map((t, i) => (
                  <p key={i} className="text-yellow-300 text-xs">
                    {t}
                  </p>
                ))}
              </div>
              <textarea
                value={res.note || ""}
                onChange={(e) => handleNoteChange(idx, e.target.value)}
                placeholder="Analyst note..."
                className="w-48 text-xs bg-gray-700 text-white border rounded p-1 resize-none"
              />
            </div>

            <ul className="text-sm mt-3 space-y-1">
              {Object.entries(res.metadata).map(([k, v]) => (
                <li key={k}>
                  <span className="text-blue-400 font-semibold">{k}:</span>{" "}
                  <span className="text-gray-300">{JSON.stringify(v)}</span>
                </li>
              ))}
            </ul>

            {res.metadata?.GPSLatitude && res.metadata?.GPSLongitude && (
              <MapDisplay
                latitude={res.metadata.GPSLatitude}
                longitude={res.metadata.GPSLongitude}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
