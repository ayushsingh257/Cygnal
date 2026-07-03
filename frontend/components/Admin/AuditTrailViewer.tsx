"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardShell from "../DashboardShell";
import { Input } from "../ui/input";
import { 
  FileSpreadsheet, 
  Search 
} from "lucide-react";

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
      const res = await fetch("/api/get-audit-logs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) setLogs(data.logs);
      else setError(data.error || "Failed to load logs");
    } catch {
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
    <DashboardShell>
      <div className="space-y-6 text-left font-sans">
        
        {/* Header Title */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 select-none">
          <FileSpreadsheet className="text-cyan-400 w-5 h-5" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Security Audit Trails
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 font-sans">Chronological historical access logs</p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="glass-card rounded-xl p-4 bg-[#0d1117]/60 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-xs text-slate-400 select-none font-mono">
            <Search size={14} className="text-cyan-400" />
            <span>Telemetry Filters:</span>
          </div>
          <Input
            type="text"
            placeholder="Search by analyst user..."
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full sm:w-56 h-8.5 text-xs font-mono"
          />
          <Input
            type="text"
            placeholder="Search by scanner title..."
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
            className="w-full sm:w-56 h-8.5 text-xs font-mono"
          />
        </div>

        {/* Audit Log Table */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60">
          {loading ? (
            <p className="text-slate-550 text-xs py-10 text-center animate-pulse font-mono">Querying system access logs...</p>
          ) : error ? (
            <p className="text-red-400 text-xs py-10 text-center font-mono">❌ {error}</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-slate-550 text-xs py-10 text-center font-mono">No audit records correlated.</p>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] pr-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 font-mono">
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">Security User</th>
                    <th className="p-3 text-left">Origin IP</th>
                    <th className="p-3 text-left">Scanner Module</th>
                    <th className="p-3 text-left">Input Scope</th>
                    <th className="p-3 text-left">Forensics Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[10.5px] font-sans">
                  {filteredLogs
                    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                    .map((log, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-all text-slate-300">
                        <td className="p-3 whitespace-nowrap text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-3 font-semibold text-cyan-400">{log.user}</td>
                        <td className="p-3 text-slate-450 font-mono">{log.ip}</td>
                        <td className="p-3 text-purple-400 font-semibold font-mono">{log.tool}</td>
                        <td className="p-3 break-all text-slate-400 max-w-[200px] font-mono" title={typeof log.input === "object" ? JSON.stringify(log.input) : log.input}>
                          <div className="truncate">
                            {typeof log.input === "object" ? JSON.stringify(log.input) : log.input}
                          </div>
                        </td>
                        <td className="p-3 break-all text-slate-500 max-w-[240px] font-mono" title={log.result ? JSON.stringify(log.result) : ""}>
                          <div className="truncate">
                            {log.result ? JSON.stringify(log.result) : ""}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
