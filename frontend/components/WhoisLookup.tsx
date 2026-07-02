"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { pollTask } from "@/lib/taskPoll";

export default function WhoisLookup() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Record<string, string | string[] | null> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { setToolUsed, addToHistory } = useReportStore();
  const { user, token } = useAuthStore();

  if (!user) {
    return <p className="text-red-400 font-semibold">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 font-semibold">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  const handleLookup = async () => {
    setError("");
    setResult(null);
    setProgress(0);

    if (!domain.includes(".")) {
      setError("❌ Please enter a valid domain (e.g. example.com)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/whois-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain }),
      });

      const data = await response.json();
      console.log("[WHOIS] Task Initialized:", data);

      if (data.success && data.task_id) {
        const finalResult = await pollTask(data.task_id, (pct) => setProgress(pct));
        
        if (finalResult && finalResult.result) {
          setResult(finalResult.result);
          setToolUsed("whoisUsed");

          addToHistory({
            tool: "WHOIS Lookup",
            input: domain,
            result: JSON.stringify(finalResult.result, null, 2),
          });

          // Log scan
          await fetch("/api/log-scan", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              tool: "WHOIS Lookup",
              input: domain,
              result: finalResult.result,
            }),
          });
        } else {
          setError("❌ No WHOIS results returned.");
        }
      } else {
        setError("❌ Failed to initiate WHOIS scan: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError("❌ " + (err.message || "Failed to query backend."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white p-6 mt-10 rounded-lg shadow-lg max-w-xl mx-auto">
      <h3 className="text-xl font-semibold mb-4">🌐 WHOIS Lookup</h3>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1 px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 font-mono"
        />
        <button
          onClick={handleLookup}
          disabled={loading || !domain}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded transition disabled:opacity-50 font-semibold"
        >
          {loading ? `Scanning (${progress}%)` : "Lookup"}
        </button>
      </div>

      {loading && (
        <div className="w-full bg-gray-800 rounded-full h-2 mt-4 overflow-hidden">
          <div
            className="bg-purple-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-red-400 mt-4 font-mono">{error}</p>}

      {result && (
        <div className="mt-4 bg-black/30 p-4 rounded text-sm whitespace-pre-wrap text-left border border-gray-800 font-mono">
          {Object.entries(result).map(([key, val]) => (
            <div key={key} className="py-0.5 border-b border-gray-900 last:border-0">
              <span className="text-purple-400 font-semibold">{key}</span>:{" "}
              <span>{Array.isArray(val) ? val.join(", ") : val ?? "N/A"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
