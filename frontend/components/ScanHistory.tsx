"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { saveAs } from "file-saver";

export default function ScanHistory() {
  const scanHistory = useReportStore((state) => state.scanHistory);
  const [showHistory, setShowHistory] = useState(false);

  // 🔽 JSON Export
  const exportAsJSON = () => {
    const blob = new Blob([JSON.stringify(scanHistory, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "cygnal_session_log.json");
  };

  // 🔽 CSV Export
  const exportAsCSV = () => {
    const rows = [
      ["Tool", "Input", "Timestamp", "Result"],
      ...scanHistory.map((entry) => [
        entry.tool,
        entry.input,
        entry.timestamp,
        typeof entry.result === "object"
          ? JSON.stringify(entry.result)
          : entry.result,
      ]),
    ];
    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "cygnal_session_log.csv");
  };

  return (
    <div className="text-white text-center">
      {/* ONE TOGGLE BUTTON ONLY */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="btn-cygnal text-lg px-6 py-3 mb-6" /* Added mb-6 for bottom spacing */
      >
        {showHistory ? "📉 Hide Scan History" : "📈 Show Scan History"}
      </button>

      {/* CONDITIONAL HISTORY DISPLAY */}
      {showHistory && (
        <div className="bg-gray-900 text-white mt-6 p-6 rounded-lg shadow max-w-4xl mx-auto border border-purple-700">
          <h2 className="text-2xl font-bold mb-4 text-pink-400 flex items-center justify-center gap-2">
            📄 Session Scan History
          </h2>

          {/* 🔽 Download Buttons */}
          <div className="flex justify-center gap-4 mb-6">
            <button onClick={exportAsJSON} className="btn-cygnal px-4 py-2 text-sm">
              ⬇ Export JSON
            </button>
            <button onClick={exportAsCSV} className="btn-cygnal px-4 py-2 text-sm">
              ⬇ Export CSV
            </button>
          </div>

          {scanHistory.length === 0 ? (
            <p className="text-gray-400">No scans performed in this session yet.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 text-left">
              {scanHistory.map((entry, index) => (
                <div
                  key={index}
                  className="bg-gray-800 p-4 rounded border border-gray-700 shadow-sm"
                >
                  <div className="text-sm text-gray-300 mb-1">
                    <strong>🛠 Tool:</strong> {entry.tool} <br />
                    <strong>🔎 Input:</strong> {entry.input}
                  </div>
                  <div className="bg-black/30 rounded p-2 text-xs whitespace-pre-wrap mb-2 border border-gray-700">
                    {typeof entry.result === "string"
                      ? entry.result
                      : JSON.stringify(entry.result, null, 2)}
                  </div>
                  <p className="text-right text-xs text-gray-500">
                    🕒 {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}