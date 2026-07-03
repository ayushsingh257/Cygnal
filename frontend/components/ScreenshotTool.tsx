"use client";

import { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";

export default function ScreenshotTool() {
  const [url, setUrl] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    <div className="bg-zinc-800 p-6 rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">📸 Website Screenshot</h2>

      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        className="w-full px-12 py-3 mb-6 rounded bg-zinc-700 text-white text-lg"
      />

      <button
        onClick={handleScreenshot}
        className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50 text-lg"
        disabled={loading}
      >
        {loading ? `Capturing (${progress}%)` : "Capture Screenshot"}
      </button>

      {loading && (
        <div className="w-full bg-zinc-700 rounded-full h-2 mt-4 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-red-500 mt-6 text-lg">{error}</p>}

      {image && !error && (
        <p className="text-green-500 mt-6 text-lg">✅ Screenshot captured successfully!</p>
      )}

      {image && (
        <div className="mt-6">
          <img
            src={image}
            alt="Website Screenshot"
            className="rounded border max-w-full h-auto"
          />
        </div>
      )}
    </div>
  );
}
