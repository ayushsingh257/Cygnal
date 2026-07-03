"use client";

import { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function ScreenshotTool() {
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { setToolUsed, addToHistory } = useReportStore();
  const { user, token } = useAuthStore();

  if (!user) {
    return <p className="text-red-400 text-xs font-mono">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 text-xs font-mono">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  const handleScreenshot = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setImage(null);
    setProgress(0);

    try {
      const finalResult = await submitAndPoll(
        "/api/screenshot",
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

      if (finalResult.image) {
        const imageBase64 = `data:image/png;base64,${finalResult.image}`;
        setImage(imageBase64);

        setToolUsed("screenshotUsed");
        addToHistory({
          tool: "Screenshot",
          input: url,
          result: "Screenshot captured",
        });

        await fetch("/api/log-scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tool: "Screenshot",
            input: url,
            result: "Screenshot captured successfully",
          }),
        });
      } else {
        setError("Failed to take screenshot");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-left font-mono">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="block text-[10px] text-zinc-400 uppercase tracking-wider">Target Website URL</label>
          <Input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        <Button onClick={handleScreenshot} disabled={loading || !url.trim()} className="w-full sm:w-auto h-9">
          {loading ? `Capturing (${progress}%)` : "Capture Screen"}
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

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {image && !error && (
        <p className="text-emerald-400 text-xs">✓ Capturing stream resolved successfully.</p>
      )}

      {image && (
        <div className="border border-white/5 rounded-md overflow-hidden bg-black/40 p-2">
          <img
            src={image}
            alt="Website Screenshot"
            className="rounded max-w-full h-auto mx-auto select-none"
          />
        </div>
      )}
    </div>
  );
}
