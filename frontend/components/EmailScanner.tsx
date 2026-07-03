"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";

export default function EmailScanner() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [includeSubpages, setIncludeSubpages] = useState(false);

  const { setToolUsed, addToHistory } = useReportStore();
  const { user, token } = useAuthStore();

  if (!user) {
    return <p className="text-red-400 font-semibold">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 font-semibold">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  const logScan = async (tool: string, emails: string[]) => {
    await fetch("/api/log-scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tool, input: url, result: emails }),
    });
  };

  const handleScan = async () => {
    setResult(null);
    setError("");
    setStatus("");
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
      const normalResult = await submitAndPoll(
        "/api/email-scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url, includeSubpages }),
        },
        setProgress
      );

      if (normalResult.emails?.length > 0) {
        setResult(normalResult.emails);
        setStatus("Scanned with normal method.");
        setToolUsed("emailUsed");
        addToHistory({ tool: "Email Scanner", input: url, result: normalResult.emails });
        await logScan("Email Scanner (Normal)", normalResult.emails);
      } else {
        setStatus("No emails found. Retrying with JS scan...");
        setProgress(0);
        const jsResult = await submitAndPoll(
          "/api/email-scan-js",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ url, includeSubpages }),
          },
          setProgress
        );

        if (jsResult.emails?.length > 0) {
          setResult(jsResult.emails);
          setStatus("Scanned with JavaScript-based method.");
          setToolUsed("emailUsed");
          addToHistory({ tool: "Email Scanner (JS Fallback)", input: url, result: jsResult.emails });
          await logScan("Email Scanner (JS Fallback)", jsResult.emails);
        } else {
          setError("❌ No emails found with fallback.");
        }
      }
    } catch (err: unknown) {
      console.error("Email Scan Fetch Error:", err);
      setError("❌ " + (err instanceof Error ? err.message : "Could not connect to backend."));
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
          {loading ? `Scanning (${progress}%)` : "Scan"}
        </button>
      </div>

      <div className="flex items-center mt-3 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={includeSubpages}
          onChange={(e) => setIncludeSubpages(e.target.checked)}
          className="mr-2"
        />
        Scan linked subpages (slower, deeper)
      </div>

      {loading && (
        <div className="w-full bg-gray-800 rounded-full h-2 mt-4 overflow-hidden">
          <div
            className="bg-purple-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

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
