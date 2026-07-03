"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { pollTask } from "@/lib/taskPoll";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function WhoisLookup() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Record<string, string | string[] | null> | null>(null);
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

  const handleLookup = async () => {
    setError("");
    setResult(null);
    setProgress(0);

    if (!domain.includes(".")) {
      setError("Please enter a valid domain (e.g. example.com)");
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
          setError("No WHOIS results returned.");
        }
      } else {
        setError("Failed to initiate WHOIS scan: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to query backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-mono">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">Target Domain Name</label>
          <Input
            type="text"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        <Button onClick={handleLookup} disabled={loading || !domain} className="w-full sm:w-auto h-9">
          {loading ? `Scanning (${progress}%)` : "Lookup WHOIS"}
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
        <div className="p-4 bg-black/35 border border-white/5 rounded text-xs leading-relaxed text-zinc-300 divide-y divide-white/5 font-mono">
          {Object.entries(result).map(([key, val]) => (
            <div key={key} className="py-1.5 flex justify-between gap-4">
              <span className="text-cyan-400 font-semibold uppercase">{key.replace("_", " ")}</span>
              <span className="text-right text-zinc-200">{Array.isArray(val) ? val.join(", ") : val ?? "N/A"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
