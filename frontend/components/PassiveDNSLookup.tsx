"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";

export default function PassiveDNSLookup() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const setUsed = useReportStore((state) => state.setToolUsed);
  const addToHistory = useReportStore((state) => state.addToHistory);

  const handleLookup = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("http://localhost:5000/api/passive-dns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.result);
        setUsed("passiveDNSUsed");
        addToHistory({
          tool: "Passive DNS",
          input: domain,
          result: data.result,
        });
      } else {
        setError(data.error || "Failed to fetch DNS records.");
      }
    } catch (err) {
      setError("Request failed.");
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
        {loading ? "Looking up..." : "Fetch DNS Records"}
      </button>

      {error && <p className="text-red-400 mt-3">{error}</p>}

      {result && (
        <div className="mt-6 bg-zinc-800 p-4 rounded-lg overflow-auto text-sm max-h-80">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
