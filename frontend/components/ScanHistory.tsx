"use client";

import React, { useState } from "react";
import { useReportStore } from "@/store/useReportStore";
import { saveAs } from "file-saver";

export default function ScanHistory() {
  const scanHistory = useReportStore((state) => state.scanHistory);
  const [showHistory, setShowHistory] = useState(false);

  const exportAsJSON = () => {
    const blob = new Blob([JSON.stringify(scanHistory, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "cygnal_session_log.json");
  };

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
    <div className="space-y-4 text-center font-mono">
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="btn-cyber-secondary px-4 py-2 text-xs uppercase font-bold"
      >
        {showHistory ? "Hide Scan Console Logs" : "Show Scan Console Logs"}
      </button>

      {showHistory && (
        <div className="glass-panel p-5 bg-[#0c0c0e]/80 text-left border border-white/5 max-w-4xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-2.5 gap-2 select-none">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Session Action Telemetry Logs
            </h3>
            <div className="flex gap-2">
              <button onClick={exportAsJSON} className="btn-cyber-secondary px-2.5 py-1 text-[9px] uppercase font-semibold">
                Export JSON
              </button>
              <button onClick={exportAsCSV} className="btn-cyber-secondary px-2.5 py-1 text-[9px] uppercase font-semibold">
                Export CSV
              </button>
            </div>
          </div>

          {scanHistory.length === 0 ? (
            <p className="text-zinc-500 text-xs py-4 text-center">No active queries ran in this session context.</p>
          ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {scanHistory.map((entry, index) => (
                <div
                  key={index}
                  className="bg-black/25 border border-white/5 p-3 rounded-md space-y-2"
                >
                  <div className="text-[10px] text-zinc-400 space-y-0.5">
                    <div>
                      <span className="text-zinc-500 uppercase">MODULE:</span>{" "}
                      <span className="text-cyan-400 font-semibold">{entry.tool}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 uppercase">TARGET PARAMETER:</span>{" "}
                      <span className="text-zinc-300 font-semibold break-all">{entry.input}</span>
                    </div>
                  </div>
                  <pre className="p-3 bg-black/45 border border-white/5 rounded text-[10px] leading-relaxed text-zinc-400 overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {typeof entry.result === "string"
                      ? entry.result
                      : JSON.stringify(entry.result, null, 2)}
                  </pre>
                  <div className="text-right text-[9px] text-zinc-500">
                    LOGGED: {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}