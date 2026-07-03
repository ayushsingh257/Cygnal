"use client";

import React, { useState } from "react";
import { useReportStore } from "../store/useReportStore";
import { submitAndPoll } from "@/lib/taskPoll";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const IPReputationTool: React.FC = () => {
  const [ip, setIp] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const setUsed = useReportStore((state) => state.setToolUsed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setProgress(0);

    try {
      const token = localStorage.getItem("cygnal_token");
      const finalResult = await submitAndPoll(
        "/api/ip-reputation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ip }),
        },
        setProgress
      );

      if (finalResult.result) {
        setResult(finalResult.result);
        setUsed("ipReputationUsed");
      } else {
        setError("Reputation scan returned no data.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong while querying AbuseIPDB.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-mono">
      <p className="text-xs text-zinc-400 leading-relaxed">
        This tool uses <strong>AbuseIPDB</strong> definitions to verify threat indices and historical abuse flags for IPv4/IPv6 addresses.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">Target IP Address</label>
          <Input
            type="text"
            placeholder="e.g. 8.8.8.8"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto h-9">
          {loading ? `Checking (${progress}%)` : "Query Reputation"}
        </Button>
      </form>

      {loading && (
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <div className="text-red-500 text-xs">{error}</div>}

      {result && (
        <div className="p-4 bg-black/35 border border-white/5 rounded text-xs text-zinc-300 divide-y divide-white/5 font-mono">
          <div className="py-1.5 flex justify-between gap-4">
            <span className="text-cyan-400 font-semibold uppercase text-[10px]">Target Host IP</span>
            <span className="text-zinc-200">{result.ipAddress}</span>
          </div>
          <div className="py-1.5 flex justify-between gap-4">
            <span className="text-cyan-400 font-semibold uppercase text-[10px]">Abuse Confidence Score</span>
            <span className={`px-1.5 py-0.2 rounded font-bold ${
              result.abuseConfidenceScore > 50 
                ? "bg-red-950/20 text-red-400 border border-red-500/20" 
                : "bg-green-950/20 text-green-400 border border-green-500/20"
            }`}>
              {result.abuseConfidenceScore}/100
            </span>
          </div>
          <div className="py-1.5 flex justify-between gap-4">
            <span className="text-cyan-400 font-semibold uppercase text-[10px]">Incident Reports</span>
            <span className="text-zinc-200">{result.totalReports} total reports</span>
          </div>
          <div className="py-1.5 flex justify-between gap-4">
            <span className="text-cyan-400 font-semibold uppercase text-[10px]">Registry Country</span>
            <span className="text-zinc-200">{result.countryCode || "N/A"}</span>
          </div>
          <div className="py-1.5 flex justify-between gap-4">
            <span className="text-cyan-400 font-semibold uppercase text-[10px]">ISP Origin</span>
            <span className="text-zinc-200 truncate max-w-[200px]" title={result.isp}>{result.isp || "N/A"}</span>
          </div>
          <div className="py-1.5 flex justify-between gap-4">
            <span className="text-cyan-400 font-semibold uppercase text-[10px]">Domain Registry</span>
            <span className="text-zinc-200">{result.domain || "N/A"}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPReputationTool;
