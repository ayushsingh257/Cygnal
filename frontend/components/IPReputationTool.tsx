"use client";

import React, { useState } from "react";
import { useReportStore } from "../store/useReportStore";

const IPReputationTool: React.FC = () => {
  const [ip, setIp] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setUsed = useReportStore((state) => state.setToolUsed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const token = localStorage.getItem("cygnal_token");
      const res = await fetch("http://localhost:5000/api/ip-reputation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ip }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Reputation scan failed.");
      } else {
        setResult(data.result);
        setUsed("ipReputationUsed");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while querying AbuseIPDB.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow mb-6 border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-700">🛡️ IP Reputation Checker</h2>
      <p className="text-sm text-gray-600 mb-3">
        This tool uses AbuseIPDB to analyze the threat score and recent abuse reports for a given IP address.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-4 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Enter IP address (e.g. 8.8.8.8)"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
          disabled={loading}
        >
          {loading ? "Checking..." : "Check Reputation"}
        </button>
      </form>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {result && (
        <div className="bg-gray-50 p-4 border rounded text-sm">
          <h3 className="font-semibold text-gray-700 mb-2">Reputation Result:</h3>
          <p><strong>IP:</strong> {result.ipAddress}</p>
          <p><strong>Abuse Score:</strong> {result.abuseConfidenceScore}/100</p>
          <p><strong>Total Reports:</strong> {result.totalReports}</p>
          <p><strong>Last Reported:</strong> {result.lastReportedAt || "Never"}</p>
          <p><strong>Country:</strong> {result.countryCode || "N/A"}</p>
          <p><strong>ISP:</strong> {result.isp || "N/A"}</p>
          <p><strong>Usage Type:</strong> {result.usageType || "N/A"}</p>
          <p><strong>Domain:</strong> {result.domain || "N/A"}</p>
        </div>
      )}
    </div>
  );
};

export default IPReputationTool;
