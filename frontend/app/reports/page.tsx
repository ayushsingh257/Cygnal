"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, Shield } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function ReportsPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setLogs(data.logs);
      } catch {
        toast.error("Failed to fetch logs for report summary.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error("No log data available to export.");
      return;
    }
    const headers = ["Timestamp", "Tool", "Input", "Success"];
    const csvRows = [headers.join(",")];
    logs.forEach(log => {
      const inputStr = typeof log.input === "object" ? JSON.stringify(log.input) : String(log.input);
      const row = [
        new Date(log.timestamp).toISOString(),
        `"${log.tool.replace(/"/g, '""')}"`,
        `"${inputStr.replace(/"/g, '""')}"`,
        log.success ? "YES" : "NO"
      ];
      csvRows.push(row.join(","));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Cygnal_SOC_Report_${Date.now()}.csv`);
    a.click();
    toast.success("CSV report exported successfully.");
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6 text-left font-sans">
        
        {/* Title */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 select-none">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Reports Compiler
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Generate, audit, and export security scans summaries</p>
          </div>
          
          <Button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5"
            disabled={loading || logs.length === 0}
          >
            <Download size={13} /> Export CSV
          </Button>
        </div>

        {/* Report summary overview cards */}
        <div className="grid md:grid-cols-3 gap-4 select-none">
          <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60">
            <span className="text-xs font-medium text-slate-550 block font-mono uppercase tracking-wider">Reports Compiled</span>
            <span className="text-3xl font-bold text-white block mt-3 font-mono">1</span>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono uppercase">Primary ledger summary</span>
          </div>
          <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60">
            <span className="text-xs font-medium text-slate-550 block font-mono uppercase tracking-wider">Total Scans Scope</span>
            <span className="text-3xl font-bold text-white block mt-3 font-mono">{logs.length}</span>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono uppercase">Indexed correlation items</span>
          </div>
          <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60">
            <span className="text-xs font-medium text-slate-550 block font-mono uppercase tracking-wider">SLA Status</span>
            <span className="text-3xl font-bold text-emerald-450 block mt-3 font-mono">100%</span>
            <span className="text-[10px] text-slate-500 block mt-1 font-mono uppercase">Compliance index</span>
          </div>
        </div>

        {/* Scan Log History Table */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60">
          <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 font-mono uppercase tracking-wider select-none">
            <FileText size={14} className="text-blue-450" /> Summarized Operations Logs
          </h3>

          {loading ? (
            <p className="text-slate-550 text-xs py-10 text-center animate-pulse font-mono">Compiling ledger tables...</p>
          ) : logs.length === 0 ? (
            <p className="text-slate-550 text-xs py-10 text-center font-mono">No scanning entries logged.</p>
          ) : (
            <div className="overflow-x-auto max-h-[50vh] pr-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-slate-550 font-mono">
                    <th className="p-3 text-left">Timestamp</th>
                    <th className="p-3 text-left">Scanner Module</th>
                    <th className="p-3 text-left">Input Address</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {logs.map((log, idx) => {
                    const inputStr = typeof log.input === "object" ? JSON.stringify(log.input) : String(log.input);
                    return (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-all text-slate-300">
                        <td className="p-3 whitespace-nowrap text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="p-3 text-white font-semibold">{log.tool}</td>
                        <td className="p-3 break-all text-slate-400 max-w-[300px] truncate" title={inputStr}>{inputStr}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            log.success ? "bg-emerald-950/20 text-emerald-450 border border-emerald-800/25" : "bg-red-950/20 text-red-400 border border-red-800/25"
                          }`}>
                            {log.success ? "PASS" : "FAIL"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
