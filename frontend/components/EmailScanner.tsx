"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

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
    return <p className="text-red-400 text-xs font-mono">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 text-xs font-mono">🚫 Access denied. Only analysts and admins can use this tool.</p>;
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
      setError("Please enter a URL.");
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      setError("URL must start with http:// or https://");
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
        setStatus("Normal scan resolution completed.");
        setToolUsed("emailUsed");
        addToHistory({ tool: "Email Scanner", input: url, result: normalResult.emails });
        await logScan("Email Scanner (Normal)", normalResult.emails);
      } else {
        setStatus("No direct email tags. Executing deep JS script engine...");
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
          setStatus("JavaScript-based DOM scan completed.");
          setToolUsed("emailUsed");
          addToHistory({ tool: "Email Scanner (JS Fallback)", input: url, result: jsResult.emails });
          await logScan("Email Scanner (JS Fallback)", jsResult.emails);
        } else {
          setError("No email configurations found.");
        }
      }
    } catch (err: unknown) {
      console.error("Email Scan Fetch Error:", err);
      setError(err instanceof Error ? err.message : "Could not connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-mono">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">Target Endpoint URL</label>
          <Input
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button onClick={handleScan} disabled={loading} className="w-full sm:w-auto h-9">
          {loading ? `Scanning (${progress}%)` : "Harvest Emails"}
        </Button>
      </div>

      <div className="flex items-center text-xs text-zinc-400 select-none">
        <input
          type="checkbox"
          checked={includeSubpages}
          onChange={(e) => setIncludeSubpages(e.target.checked)}
          className="mr-2 rounded border-white/5 bg-zinc-900 accent-cyan-500"
        />
        Scan associated subpages recursively (slower processing)
      </div>

      {loading && (
        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-cyan-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status && <p className="text-zinc-500 text-[10px] uppercase font-bold">{status}</p>}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {result && (
        <div className="p-4 bg-black/35 border border-white/5 rounded text-xs text-zinc-300">
          <p className="font-semibold text-emerald-400 mb-2">✓ Recovered accounts ({result.length}):</p>
          <ul className="space-y-1">
            {result.map((email, index) => (
              <li key={index} className="flex items-center gap-1.5">
                <span className="text-zinc-500">&gt;</span> {email}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
