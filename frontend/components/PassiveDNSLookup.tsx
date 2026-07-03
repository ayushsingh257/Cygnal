"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { submitAndPoll } from "@/lib/taskPoll";

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
    <div className="bg-zinc-900 p-6 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold mb-4">🌐 Passive DNS Lookup</h2>
      <p className="text-sm text-gray-400 mb-3">
        Get historical A/AAAA/NS records using VirusTotal Passive DNS.
      </p>

      <input
        type="text"
        placeholder="Enter domain (e.g. example.com)"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        className="w-full mb-4 px-4 py-2 rounded bg-zinc-800 border border-zinc-700"
      />

      <button
        onClick={handleLookup}
        disabled={loading || !domain}
        className="btn-cygnal-primary disabled:opacity-50"
      >
        {loading ? `Looking up (${progress}%)` : "Fetch DNS Records"}
      </button>

      {loading && (
        <div className="w-full bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden">
          <div
            className="bg-purple-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-red-400 mt-3">{error}</p>}

      {result && (
        <div className="mt-6 bg-zinc-800 p-4 rounded-lg overflow-auto text-sm max-h-80">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
