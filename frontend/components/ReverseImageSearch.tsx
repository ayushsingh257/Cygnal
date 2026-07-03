"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReportStore } from "@/store/useReportStore";
import { useAuthStore } from "@/store/useAuthStore";
import { submitAndPoll } from "@/lib/taskPoll";

interface SearchResult {
  match_path: string;
  match_percentage: number;
  image_data?: string;
  image_url?: string;
}

export default function ReverseImageSearch() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const { setToolUsed, addToHistory } = useReportStore();
  const { user, token } = useAuthStore();

  if (!user) {
    return <p className="text-red-400 font-semibold">🔒 Please log in to use this tool.</p>;
  }

  if (user.role !== "analyst" && user.role !== "admin") {
    return <p className="text-red-400 font-semibold">🚫 Access denied. Only analysts and admins can use this tool.</p>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
    setResults([]);
    setError("");
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);
    setError("");
    setResults([]);
    setProgress(0);

    try {
      const finalResult = await submitAndPoll(
        "/api/reverse-image-search",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
        setProgress
      );

      const searchResults = finalResult.results || [];
      setResults(searchResults);
      setToolUsed("reverseImageUsed");

      addToHistory({
        tool: "Reverse Image Search",
        input: selectedFile.name,
        result: JSON.stringify(searchResults.slice(0, 3), null, 2),
      });

      await fetch("/api/log-scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tool: "Reverse Image Search",
          input: selectedFile.name,
          result: searchResults,
        }),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to perform reverse image search.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <CardContent>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.tiff,.heic,image/*"
          onChange={handleFileChange}
        />
        <Button className="mt-2" onClick={handleSubmit} disabled={loading}>
          {loading ? `Searching (${progress}%)` : "Start Reverse Image Search"}
        </Button>

        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <p className="text-red-500 mt-2">{error}</p>}

        {results.length > 0 && (
          <div className="mt-4 space-y-4">
            <h2 className="text-lg font-bold">Search Results:</h2>
            {results.map((result, index) => (
              <div key={index} className="border p-4 rounded shadow-sm">
                {result.image_data && (
                  <img
                    src={`data:image/jpeg;base64,${result.image_data}`}
                    alt={`Match ${index}`}
                    className="w-48 h-auto mb-2 rounded"
                  />
                )}
                {result.image_url && (
                  <img
                    src={result.image_url}
                    alt={`Match ${index}`}
                    className="w-48 h-auto mb-2 rounded"
                  />
                )}
                <p>
                  <strong>Match:</strong> {result.match_percentage.toFixed(2)}%
                </p>
                <p className="break-all">
                  <strong>File Path:</strong> {result.match_path}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
