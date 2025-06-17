"use client";

import React, { useState } from "react";

export default function HeaderScanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!url.startsWith("http")) {
      setResult("❌ Please enter a valid URL (starting with http or https).");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await fetch("http://127.0.0.1:5000/api/header-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      console.log("🔧 Server Response:", data); // Debug log

      if (data && Array.isArray(data.headers)) {
        const lines = data.headers
          .map((header: any) => `${header.present ? "✅" : "❌"} ${header.name}`)
          .join("\n");

        setResult(`🔍 Scan result for ${url}:\n\n${lines}`);
      } else if (data.error) {
        setResult(`❌ ${data.error}`);
      } else {
        setResult("❌ Failed to analyze headers.");
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setResult("❌ Error connecting to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg mt-10 max-w-xl mx-auto">
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
      {result && (
        <pre className="mt-4 bg-black/30 p-4 rounded text-sm whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
