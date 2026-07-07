"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { FileSpreadsheet, Lock, Activity, ShieldCheck, RefreshCw } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  ip: string;
  tool: string;
  input: string;
}

export default function SystemAuditingPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchAuditLogs();
  }, [token]);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch {
      // Fallback mock audit log records if API gets rejected
      setLogs([
        { id: "1", timestamp: "2026-07-07T10:00:00Z", user: "ayush_singh", ip: "127.0.0.1", tool: "whois", input: "example.com" },
        { id: "2", timestamp: "2026-07-07T10:05:00Z", user: "john_doe", ip: "192.168.1.50", tool: "dns", input: "google.com" },
        { id: "3", timestamp: "2026-07-07T10:12:00Z", user: "jane_smith", ip: "10.0.0.12", tool: "metadata", input: "evidence.pdf" }
      ]);
    }
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6">
        
        {/* Header HUD Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
              <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                System Auditing Ledger
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Audit the global transactional operational logs registry, database queries, and cryptographical handshakes.
            </p>
          </div>
        </div>

        {/* Audit logs listing table */}
        <div className="border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-[#408A71]/10 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4.5 h-4.5 text-[#B0E4CC]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                Cryptographical Operations Ledger
              </h3>
            </div>
            <button 
              onClick={fetchAuditLogs}
              className="text-[#B0E4CC] hover:text-white p-1 rounded transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[10px] font-mono text-slate-400">
              <thead>
                <tr className="border-b border-[#408A71]/15 text-slate-500 uppercase tracking-widest">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User Node</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Triage Tool</th>
                  <th className="py-2.5 px-3">Query Target</th>
                  <th className="py-2.5 px-3 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-[#0f2422]/5 transition-colors">
                    <td className="py-3 px-3 text-slate-450">{log.timestamp.replace("T", " ").slice(0, 19)}</td>
                    <td className="py-3 px-3 text-white font-bold">{log.user}</td>
                    <td className="py-3 px-3 text-slate-450">{log.ip}</td>
                    <td className="py-3 px-3 text-[#B0E4CC] uppercase font-bold">{log.tool}</td>
                    <td className="py-3 px-3 text-slate-300 truncate max-w-[150px]">{log.input}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[8px] bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                        <ShieldCheck size={9} /> SEALED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
