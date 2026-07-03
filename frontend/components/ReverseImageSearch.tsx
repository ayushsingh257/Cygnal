"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";
import { Button } from "./ui/button";

interface SearchResult {
  match_path: string;
  match_percentage: number;
  image_data?: string;
  image_url?: string;
}

export default function ReverseImageSearch() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const { setToolUsed, addToHistory } = useReportStore();
  const { user, token } = useAuthStore();

  if (!user) {
    return <p className="text-red-400 text-xs font-mono">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 text-xs font-mono">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
    setResults([]);
    setError("");
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);
    setError("");
    setResults([]);
    setProgress(0);

    try {
      const finalResult = await submitAndPoll(
        "/api/reverse-image-search",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
        setProgress
      );

      const searchResults = finalResult.results || [];
      setResults(searchResults);
      setToolUsed("reverseImageUsed");

      addToHistory({
        tool: "Reverse Image Search",
        input: selectedFile.name,
        result: JSON.stringify(searchResults.slice(0, 3), null, 2),
      });

      await fetch("/api/log-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tool: "Reverse Image Search",
          input: selectedFile.name,
          result: searchResults,
        }),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to perform reverse image search.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-mono">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">Target Image File</label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.heic,image/*"
            onChange={handleFileChange}
            className="w-full bg-[#09090b] border border-white/5 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
          />
        </div>
        <Button onClick={handleSubmit} disabled={loading || !selectedFile} className="w-full sm:w-auto h-9">
          {loading ? `Searching (${progress}%)` : "Search Visual Database"}
        </Button>
      </div>

      {loading && (
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Visual Signature Matches</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((result, index) => (
              <div key={index} className="bg-black/25 border border-white/5 p-4 rounded-md flex gap-4 items-start">
                <div className="w-24 h-24 flex-shrink-0 bg-black/40 rounded overflow-hidden border border-white/5 flex items-center justify-center">
                  {result.image_data && (
                    <img
                      src={`data:image/jpeg;base64,${result.image_data}`}
                      alt={`Match ${index}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                  {result.image_url && (
                    <img
                      src={result.image_url}
                      alt={`Match ${index}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-[10px] space-y-1">
                  <div>
                    <span className="text-zinc-500 uppercase">Match Score:</span>{" "}
                    <span className="text-cyan-400 font-bold">{result.match_percentage.toFixed(2)}%</span>
                  </div>
                  <div className="break-all leading-relaxed text-zinc-400">
                    <span className="text-zinc-500 uppercase">Database Signature:</span><br />
                    {result.match_path}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
