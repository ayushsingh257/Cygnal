"use client";

import React, { useState } from "react";
import { submitAndPoll } from "@/lib/taskPoll";

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
    <div className="p-4 rounded-xl bg-white shadow-xl">
      <h2 className="text-xl font-bold mb-2">Port Scanner</h2>
      <input
        type="text"
        placeholder="Target IP or domain"
        className="border p-2 rounded w-full mb-2"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      >
        <option value="fast">Fast Scan (Masscan)</option>
        <option value="deep">Deep Scan (Nmap)</option>
      </select>
      <button
        onClick={handleScan}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? `Scanning (${progress}%)` : "Start Scan"}
      </button>

      {loading && (
        <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <div className="text-red-600 mt-3">{error}</div>}

      {results.length > 0 && (
        <div className="mt-5">
          <h3 className="font-semibold mb-2">Scan Results</h3>
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">Port</th>
                <th className="border px-2 py-1">Protocol</th>
                <th className="border px-2 py-1">State</th>
                <th className="border px-2 py-1">Service</th>
                <th className="border px-2 py-1">Tool</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res, idx) => (
                <tr key={idx}>
                  <td className="border px-2 py-1">{res.port}</td>
                  <td className="border px-2 py-1">{res.protocol}</td>
                  <td className="border px-2 py-1">{res.state}</td>
                  <td className="border px-2 py-1">{res.service}</td>
                  <td className="border px-2 py-1">{res.scan_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PortScanner;
