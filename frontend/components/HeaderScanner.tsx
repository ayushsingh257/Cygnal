"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function HeaderScanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setToolUsed, addToHistory } = useReportStore();
  const { user, token } = useAuthStore();

  // 🔐 Check for login + role access
  if (!user) {
    return <p className="text-red-400 font-semibold">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 font-semibold">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  const handleScan = async () => {
    setResult("");
    setError("");

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
      const response = await fetch("http://127.0.0.1:5000/api/header-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ THIS IS CRUCIAL
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      console.log("[HeaderScan] Response:", data);

      if (data && data.headers) {
        const lines = data.headers
          .map(
            (header: any) =>
              `${header.present ? "✅" : "❌"} ${header.name}: ${
                header.present ? "Present" : "Missing"
              }`
          )
          .join("\n");

        const finalOutput = `🔍 Header Scan Results for ${url}:\n\n${lines}`;
        setResult(finalOutput);
        setToolUsed("headerUsed");
        addToHistory({ tool: "Header Scanner", input: url, result: JSON.stringify(data, null, 2) });

        await fetch("http://127.0.0.1:5000/api/log-scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // ✅ Add this
          },
          body: JSON.stringify({ tool: "Header Scanner", input: url, result: data }),
        });
      } else if (data.error) {
        setError("❌ Server error: " + data.error);
      } else {
        setError("❌ Unexpected error. Try again.");
      }
    } catch (err) {
      console.error("Header Scan Fetch Error:", err);
      setError("❌ Could not connect to backend.");
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
          {loading ? "Scanning..." : "Scan"}
        </button>
      </div>

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
