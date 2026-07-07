"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { Search, BarChart3, TrendingUp, PieChart, Users, Calendar, AlertCircle, RefreshCw } from "lucide-react";

interface Employee {
  username: string;
  role: string;
  department: string;
  team: string;
  created_at: string;
}

export default function AnalyticsDashboardPage() {
  const { token, user } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [loading, setLoading] = useState(false);

  // Mock telemetry datasets
  const scanMetrics = [
    { tool: "WHOIS", count: 142, color: "#B0E4CC" },
    { tool: "DNS", count: 235, color: "#408A71" },
    { tool: "Headers", count: 98, color: "#285A48" },
    { tool: "Metadata", count: 185, color: "#B0E4CC" },
    { tool: "Email", count: 64, color: "#408A71" },
    { tool: "Reputation", count: 312, color: "#B0E4CC" },
    { tool: "Malware", count: 48, color: "#285A48" },
    { tool: "Capture", count: 114, color: "#408A71" },
    { tool: "Reverse", count: 72, color: "#B0E4CC" },
    { tool: "Threat CVE", count: 168, color: "#408A71" }
  ];

  const trendData = [32, 45, 28, 58, 64, 48, 85]; // 7 days logs activity counts
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    // Seed default subordinate workers for compliance managers
    setEmployees([
      { username: "ayush_singh", role: "admin", department: "Security Administration", team: "Controller", created_at: "2026-07-07" },
      { username: "john_doe", role: "analyst", department: "Security Operations", team: "Triage", created_at: "2026-07-07" },
      { username: "jane_smith", role: "analyst", department: "Security Operations", team: "Triage", created_at: "2026-07-07" },
      { username: "robert_lee", role: "intern", department: "Incident Response", team: "Interns", created_at: "2026-07-07" }
    ]);
  }, []);

  const totalScans = scanMetrics.reduce((acc, curr) => acc + curr.count, 0);
  const maxScanCount = Math.max(...scanMetrics.map(m => m.count));

  return (
    <DashboardShell>
      <div className="space-y-6">
        
        {/* Header HUD Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
              <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                Investigator Analytics Cockpit
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Audit operational metrics, subordinate telemetry logs, and incident distribution trends.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#091413]/60 border border-[#408A71]/15 px-3 py-1.5 rounded-xl text-[10px] font-mono text-[#B0E4CC]">
            <Users className="w-3.5 h-3.5" /> Scope: Department
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap gap-4 items-center bg-[#0f2422]/5 border border-[#408A71]/10 p-4 rounded-xl text-left">
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Select Investigator</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-[#091413] border border-[#408A71]/20 rounded-lg py-1.5 px-3 text-xs text-slate-350 focus:outline-none focus:ring-1 focus:ring-[#B0E4CC] font-mono"
            >
              <option value="all">-- All Subordinates --</option>
              {employees.map((emp) => (
                <option key={emp.username} value={emp.username}>
                  {emp.username} ({emp.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            Active Ledger Database Size: <strong className="text-white">96.0 KB</strong>
          </div>
        </div>

        {/* Telemetry HUD Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-5 bg-[#0f2422]/15 border border-[#408A71]/10 text-left space-y-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Total Scans Executed</span>
            <div className="text-2xl font-bold text-white font-mono">{totalScans}</div>
          </div>
          <div className="glass-card rounded-2xl p-5 bg-[#0f2422]/15 border border-[#408A71]/10 text-left space-y-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Active Triaged Cases</span>
            <div className="text-2xl font-bold text-[#B0E4CC] font-mono">14</div>
          </div>
          <div className="glass-card rounded-2xl p-5 bg-[#0f2422]/15 border border-[#408A71]/10 text-left space-y-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Unresolved Alert Vectors</span>
            <div className="text-2xl font-bold text-red-400 font-mono">3</div>
          </div>
          <div className="glass-card rounded-2xl p-5 bg-[#0f2422]/15 border border-[#408A71]/10 text-left space-y-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Policy Compliance Score</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono">98%</div>
          </div>
        </div>

        {/* Custom Vector Charts Cockpit */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Bar Chart (Scans by Tool) */}
          <div className="lg:col-span-2 border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 space-y-6 text-left">
            <div className="flex items-center gap-2 border-b border-[#408A71]/10 pb-3">
              <BarChart3 className="w-4.5 h-4.5 text-[#B0E4CC]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                Passive Multi-Sensor Output Volume
              </h3>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-64 flex items-end justify-between gap-1 sm:gap-2.5 pt-4">
              {scanMetrics.map((m, idx) => {
                const percent = (m.count / maxScanCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="relative w-full flex justify-center items-end h-full">
                      {/* Bar fill */}
                      <div 
                        className="w-4 sm:w-6 rounded-t-md transition-all duration-500 group-hover:opacity-100 opacity-80"
                        style={{ 
                          height: `${percent}%`, 
                          background: `linear-gradient(to top, #285A48, ${m.color})` 
                        }}
                      />
                      {/* Hover Tooltip tooltip */}
                      <div className="absolute bottom-full mb-1.5 hidden group-hover:block bg-[#091413] border border-[#408A71]/35 px-2 py-0.5 rounded text-[8px] font-mono text-white z-10 shrink-0">
                        {m.count}
                      </div>
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter truncate w-full text-center">
                      {m.tool}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Daily trends Line path */}
          <div className="border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 space-y-6 text-left">
            <div className="flex items-center gap-2 border-b border-[#408A71]/10 pb-3">
              <TrendingUp className="w-4.5 h-4.5 text-[#B0E4CC]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                Daily Triage Trends
              </h3>
            </div>

            {/* Custom SVG line graph path */}
            <div className="relative h-60 w-full pt-4">
              <svg className="w-full h-48 overflow-visible" viewBox="0 0 300 150">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B0E4CC" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#408A71" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="0" y1="30" x2="300" y2="30" stroke="#408A71" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.1" />
                <line x1="0" y1="75" x2="300" y2="75" stroke="#408A71" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.1" />
                <line x1="0" y1="120" x2="300" y2="120" stroke="#408A71" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.1" />
                
                {/* Area under the line */}
                <path 
                  d="M 10 150 L 10 114 L 56 100 L 102 124 L 148 80 L 194 72 L 240 96 L 286 48 L 286 150 Z" 
                  fill="url(#areaGrad)" 
                />
                
                {/* Line Path */}
                <path 
                  d="M 10 114 L 56 100 L 102 124 L 148 80 L 194 72 L 240 96 L 286 48" 
                  fill="none" 
                  stroke="#B0E4CC" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {[
                  {x: 10, y: 114}, {x: 56, y: 100}, {x: 102, y: 124},
                  {x: 148, y: 80}, {x: 194, y: 72}, {x: 240, y: 96},
                  {x: 286, y: 48}
                ].map((pt, idx) => (
                  <circle 
                    key={idx} 
                    cx={pt.x} 
                    cy={pt.y} 
                    r="3.5" 
                    fill="#091413" 
                    stroke="#408A71" 
                    strokeWidth="1.5" 
                  />
                ))}
              </svg>
              {/* Day Labels */}
              <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase px-2 mt-2">
                {days.map((d, idx) => (
                  <span key={idx}>{d}</span>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </DashboardShell>
  );
}
