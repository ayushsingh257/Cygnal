"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";

export default function EmailScanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(""); // ✅ Scan method status
  const [loading, setLoading] = useState(false);

  const { setToolUsed, addToHistory } = useReportStore();
  const { user } = useAuthStore();

  // 🔐 Login & Role Access
  if (!user) {
    return <p className="text-red-400 font-semibold">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 font-semibold">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  const handleScan = async () => {
    setResult(null);
    setError("");
    setStatus("");

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
      // 🧪 Try normal scan first
      let response = await fetch("http://127.0.0.1:5000/api/email-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      let data = await response.json();
      console.log("[EmailScan] Normal:", data);

      if (data.success && data.emails.length > 0) {
        setResult(data.emails);
        setStatus("Scanned with normal method.");
        setToolUsed("emailUsed");
        addToHistory({ tool: "Email Scanner", input: url, result: data.emails });

        await fetch("http://127.0.0.1:5000/api/log-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "Email Scanner (Normal)",
            input: url,
            result: data.emails,
          }),
        });
      } else {
        // 🔁 Fallback to JS scan
        setStatus("No emails found. Retrying with JS scan...");
        response = await fetch("http://127.0.0.1:5000/api/email-scan-js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        data = await response.json();
        console.log("[EmailScan] JS fallback:", data);

        if (data.success && data.emails.length > 0) {
          setResult(data.emails);
          setStatus("Scanned with JavaScript-based method.");
          setToolUsed("emailUsed");
          addToHistory({ tool: "Email Scanner (JS Fallback)", input: url, result: data.emails });

          await fetch("http://127.0.0.1:5000/api/log-scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tool: "Email Scanner (JS Fallback)",
              input: url,
              result: data.emails,
            }),
          });
        } else {
          setError(data.error || "❌ No emails found with fallback.");
        }
      }
    } catch (err) {
      console.error("Email Scan Fetch Error:", err);
      setError("❌ Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">📧 Email Scanner</h3>
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

      {/* ✅ Scan method info */}
      {status && <p className="mt-2 text-blue-300 text-sm">{status}</p>}

      {error && <p className="mt-4 text-red-400 whitespace-pre-wrap">{error}</p>}

      {result && (
        <div className="mt-4 text-sm">
          <p className="font-semibold text-green-400">✅ Emails found:</p>
          <ul className="list-disc list-inside">
            {result.map((email, index) => (
              <li key={index}>{email}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
