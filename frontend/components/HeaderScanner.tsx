"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function HeaderScanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { setToolUsed, addToHistory } = useReportStore();
  const { user, token } = useAuthStore();

  if (!user) {
    return <p className="text-red-400 text-xs font-mono">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 text-xs font-mono">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  const handleScan = async () => {
    setResult("");
    setError("");
    setProgress(0);

    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      setError("URL must start with http:// or https://");
      return;
    }

    setLoading(true);

    try {
      const finalResult = await submitAndPoll(
        "/api/header-scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url }),
        },
        setProgress
      );

      if (finalResult && finalResult.headers) {
        const lines = finalResult.headers
          .map(
            (header: { present: boolean; name: string }) =>
              `${header.present ? "[OK]" : "[MISSING]"} ${header.name}`
          )
          .join("\n");

        const finalOutput = `Header Scan Results for ${url}:\n\n${lines}`;
        setResult(finalOutput);
        setToolUsed("headerUsed");
        addToHistory({ tool: "Header Scanner", input: url, result: JSON.stringify(finalResult, null, 2) });

        await fetch("/api/log-scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tool: "Header Scanner", input: url, result: finalResult }),
        });
      } else {
        setError("Unexpected response structure from header scanner.");
      }
    } catch (err: unknown) {
      console.error("Header Scan Fetch Error:", err);
      setError(err instanceof Error ? err.message : "Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-mono">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">Target Endpoint URL</label>
          <Input
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button onClick={handleScan} disabled={loading} className="w-full sm:w-auto h-9">
          {loading ? `Scanning (${progress}%)` : "Verify Headers"}
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

      {error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}

      {result && (
        <pre className="p-4 bg-black/35 border border-white/5 rounded text-xs whitespace-pre-wrap leading-relaxed text-zinc-300">
          {result}
        </pre>
      )}
    </div>
  );
}
