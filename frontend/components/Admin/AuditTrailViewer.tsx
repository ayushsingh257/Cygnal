// ✅ frontend/components/Admin/AuditTrailViewer.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";

interface AuditLogEntry {
  timestamp: string;
  ip: string;
  user: string;
  tool: string;
  input: any;
  result?: any;
}

export default function AuditTrailViewer() {
  const { user, token } = useAuthStore();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterUser, setFilterUser] = useState("");
  const [filterTool, setFilterTool] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchLogs();
  }, [token]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/get-audit-logs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) setLogs(data.logs);
      else setError(data.error || "Failed to load logs");
    } catch (err) {
      setError("Failed to fetch logs.");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      (filterUser ? log.user.toLowerCase().includes(filterUser.toLowerCase()) : true) &&
      (filterTool ? log.tool.toLowerCase().includes(filterTool.toLowerCase()) : true)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-4">📜 Audit Trail Viewer</h1>

      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by user"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700"
        />
        <input
          type="text"
          placeholder="Filter by tool"
          value={filterTool}
          onChange={(e) => setFilterTool(e.target.value)}
          className="px-4 py-2 rounded bg-zinc-800 border border-zinc-700"
        />
      </div>

      {loading ? (
        <p>Loading logs...</p>
      ) : error ? (
        <p className="text-red-400">❌ {error}</p>
      ) : (
        <div className="overflow-x-auto max-h-[75vh] border border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800 text-left">
              <tr>
                <th className="p-2">Timestamp</th>
                <th className="p-2">User</th>
                <th className="p-2">IP</th>
                <th className="p-2">Tool</th>
                <th className="p-2">Input</th>
                <th className="p-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .map((log, idx) => (
                  <tr key={idx} className="border-t border-zinc-700">
                    <td className="p-2 align-top whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-2 align-top">{log.user}</td>
                    <td className="p-2 align-top">{log.ip}</td>
                    <td className="p-2 align-top">{log.tool}</td>
                    <td className="p-2 align-top break-all text-xs">
                      {typeof log.input === "object" ? JSON.stringify(log.input) : log.input}
                    </td>
                    <td className="p-2 align-top break-all text-xs">
                      {log.result ? JSON.stringify(log.result).slice(0, 100) + "..." : ""}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
