"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldAlert, History, FolderOpen } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function SearchPage() {
  const { token } = useAuthStore();
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [filteredCases, setFilteredCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [logsRes, casesRes] = await Promise.all([
          fetch("/api/history", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/cases", { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const logsData = await logsRes.json();
        const casesData = await casesRes.json();
        if (logsData.success) setLogs(logsData.logs);
        if (casesData.success) setCases(casesData.cases);
      } catch {
        toast.error("Failed to load indices for search queries.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) {
      setFilteredLogs([]);
      setFilteredCases([]);
      return;
    }

    const matchedLogs = logs.filter(log => {
      const toolMatch = log.tool.toLowerCase().includes(q);
      const inputStr = typeof log.input === "object" ? JSON.stringify(log.input) : String(log.input);
      const inputMatch = inputStr.toLowerCase().includes(q);
      return toolMatch || inputMatch;
    });

    const matchedCases = cases.filter(c => {
      const titleMatch = c.title.toLowerCase().includes(q);
      const descMatch = c.description.toLowerCase().includes(q);
      const caseNumMatch = c.case_number.toLowerCase().includes(q);
      return titleMatch || descMatch || caseNumMatch;
    });

    setFilteredLogs(matchedLogs);
    setFilteredCases(matchedCases);
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6 text-left font-sans">
        
        {/* Title */}
        <div className="border-b border-white/5 pb-4 select-none">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">
            Unified Search
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Query active scans logs history, case numbers, or targets scope</p>
        </div>

        {/* Search bar form */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <Input
            type="text"
            placeholder="Type search queries (e.g. domain, tool, case number)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="flex items-center gap-1.5 px-6">
            <Search size={14} /> Search
          </Button>
        </form>

        {/* Results columns split grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Matched Cases */}
          <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 space-y-4">
            <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 flex items-center gap-1.5 font-mono uppercase tracking-wider select-none">
              <FolderOpen size={14} className="text-blue-450" /> Matched Cases ({filteredCases.length})
            </h3>

            {loading ? (
              <p className="text-slate-550 text-xs py-6 animate-pulse font-mono">Querying indices...</p>
            ) : query && filteredCases.length === 0 ? (
              <p className="text-slate-550 text-xs py-6 font-mono">No matching cases discovered.</p>
            ) : !query ? (
              <p className="text-slate-550 text-xs py-6 font-mono">Enter queries above to scan case records.</p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {filteredCases.map(c => (
                  <div key={c.id} className="p-3.5 bg-black/25 border border-white/5 rounded-lg text-xs">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-mono text-[10px] text-slate-500 font-bold">{c.case_number}</span>
                      <span className={`badge-low text-[8px]`}>{c.status}</span>
                    </div>
                    <h4 className="font-bold text-slate-200">{c.title}</h4>
                    <p className="text-slate-400 mt-1 text-[11px] truncate">{c.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Matched Scans */}
          <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 space-y-4">
            <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 flex items-center gap-1.5 font-mono uppercase tracking-wider select-none">
              <History size={14} className="text-blue-450" /> Matched Scans ({filteredLogs.length})
            </h3>

            {loading ? (
              <p className="text-slate-550 text-xs py-6 animate-pulse font-mono">Querying indices...</p>
            ) : query && filteredLogs.length === 0 ? (
              <p className="text-slate-550 text-xs py-6 font-mono">No matching scan logs discovered.</p>
            ) : !query ? (
              <p className="text-slate-550 text-xs py-6 font-mono">Enter queries above to scan historical operations.</p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {filteredLogs.map((log, idx) => {
                  const inputStr = typeof log.input === "object" ? JSON.stringify(log.input) : String(log.input);
                  return (
                    <div key={idx} className="p-3.5 bg-black/25 border border-white/5 rounded-lg text-xs font-mono">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-slate-200">{log.tool}</span>
                        <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-400 text-[10.5px] truncate" title={inputStr}>Input: {inputStr}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardShell>
  );
}
