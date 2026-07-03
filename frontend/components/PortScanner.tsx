"use client";

import React, { useState } from "react";
import { submitAndPoll } from "@/lib/taskPoll";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const PortScanner = () => {
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState("fast");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleScan = async () => {
    setError("");
    setResults([]);
    setProgress(0);
    if (!target) {
      setError("Please enter a valid IP or domain.");
      return;
    }

    setLoading(true);
    try {
      const finalResult = await submitAndPoll(
        "/api/port-scan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, mode }),
        },
        setProgress
      );

      if (finalResult.error) {
        setError(finalResult.error);
      } else if (finalResult.results) {
        setResults(finalResult.results);
      } else {
        setError("Scan returned no results.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Scan failed. Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Target IP or Domain</label>
          <Input
            type="text"
            placeholder="e.g. 8.8.8.8 or example.com"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto space-y-1.5">
          <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Scan Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full sm:w-48 bg-[#09090b] border border-white/5 rounded-md px-3 py-2 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="fast">Fast Scan (Masscan)</option>
            <option value="deep">Deep Scan (Nmap)</option>
          </select>
        </div>
        <Button onClick={handleScan} disabled={loading} size="default" className="w-full sm:w-auto h-9">
          {loading ? `Scanning (${progress}%)` : "Start Scan"}
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

      {error && <div className="text-red-500 text-xs font-mono">{error}</div>}

      {results.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-mono text-xs font-bold text-cyan-400 uppercase tracking-wider">Scan Results</h3>
          <div className="border border-white/5 rounded-md overflow-hidden bg-black/20">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 bg-zinc-900/30">
                  <th className="p-2">Port</th>
                  <th className="p-2">Protocol</th>
                  <th className="p-2">State</th>
                  <th className="p-2">Service</th>
                  <th className="p-2">Scanner Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {results.map((res, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-2 font-semibold text-gray-200">{res.port}</td>
                    <td className="p-2 uppercase">{res.protocol}</td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.2 rounded bg-green-950/20 text-green-400 border border-green-900/30">
                        {res.state}
                      </span>
                    </td>
                    <td className="p-2 text-cyan-400">{res.service}</td>
                    <td className="p-2 text-zinc-500">{res.scan_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortScanner;
