"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";

export default function HeaderScanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
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

  const handleScan = async () => {
    setResult("");
    setError("");
    setProgress(0);

    if (!url.trim()) {
      setError("❌ Please enter a URL.");
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      setError("❌ URL must start with http:// or https://");
      return;
    }

    setLoading(true);

    try {
      const finalResult = await submitAndPoll(
        "/api/header-scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url }),
        },
        setProgress
      );

      if (finalResult && finalResult.headers) {
        const lines = finalResult.headers
          .map(
            (header: { present: boolean; name: string }) =>
              `${header.present ? "✅" : "❌"} ${header.name}: ${
                header.present ? "Present" : "Missing"
              }`
          )
          .join("\n");

        const finalOutput = `🔍 Header Scan Results for ${url}:\n\n${lines}`;
        setResult(finalOutput);
        setToolUsed("headerUsed");
        addToHistory({ tool: "Header Scanner", input: url, result: JSON.stringify(finalResult, null, 2) });

        await fetch("/api/log-scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tool: "Header Scanner", input: url, result: finalResult }),
        });
      } else {
        setError("❌ Unexpected error. Try again.");
      }
    } catch (err: unknown) {
      console.error("Header Scan Fetch Error:", err);
      setError("❌ " + (err instanceof Error ? err.message : "Could not connect to backend."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">🔎 Header Scanner</h3>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none"
        />
        <button
          onClick={handleScan}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
        >
          {loading ? `Scanning (${progress}%)` : "Scan"}
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

      {error && (
        <p className="mt-4 text-red-400 whitespace-pre-wrap">{error}</p>
      )}

      {result && (
        <pre className="mt-4 bg-black/30 p-4 rounded text-sm whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
