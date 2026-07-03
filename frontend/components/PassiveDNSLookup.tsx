"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { submitAndPoll } from "@/lib/taskPoll";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function PassiveDNSLookup() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const setUsed = useReportStore((state) => state.setToolUsed);
  const addToHistory = useReportStore((state) => state.addToHistory);

  const handleLookup = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setProgress(0);

    try {
      const finalResult = await submitAndPoll(
        "/api/passive-dns",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        },
        setProgress
      );

      if (finalResult.result) {
        setResult(finalResult.result);
        setUsed("passiveDNSUsed");
        addToHistory({
          tool: "Passive DNS",
          input: domain,
          result: finalResult.result,
        });
      } else {
        setError("Failed to fetch DNS records.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-mono">
      <p className="text-xs text-zinc-400 leading-relaxed">
        Fetch passive historical A, AAAA, and NS records using VirusTotal intelligence lookup integration.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">Target Domain</label>
          <Input
            type="text"
            placeholder="e.g. example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        <Button onClick={handleLookup} disabled={loading || !domain} className="w-full sm:w-auto h-9">
          {loading ? `Polling (${progress}%)` : "Fetch DNS Logs"}
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

      {result && (
        <div className="p-4 bg-black/35 border border-white/5 rounded text-xs leading-relaxed text-zinc-300">
          <h4 className="font-bold text-cyan-400 uppercase tracking-wider mb-2">Passive DNS History Records</h4>
          <pre className="text-xs overflow-auto max-h-60 leading-relaxed text-zinc-450">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
