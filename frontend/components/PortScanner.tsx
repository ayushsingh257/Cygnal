// frontend/components/PortScanner.tsx

"use client";

import React, { useState } from "react";

const PortScanner = () => {
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState("fast");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setError("");
    setResults([]);
    if (!target) {
      setError("Please enter a valid IP or domain.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/port-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target, mode }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results);
      }
    } catch (err) {
      setError("Scan failed. Server error.");
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
        {loading ? "Scanning..." : "Start Scan"}
      </button>

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
