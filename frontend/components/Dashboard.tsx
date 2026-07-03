"use client";

import React, { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  PointElement,
  LineElement,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { useAuthStore } from "@/store/useAuthStore";
import MitreAttackMatrix from "./MitreAttackMatrix";
import DashboardShell from "./DashboardShell";
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  Terminal, 
  Database, 
  RefreshCw
} from "lucide-react";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  PointElement,
  LineElement,
  Legend,
  TimeScale
);

interface BackgroundTask {
  id: string;
  name: string;
  status: string;
  progress: number;
  result: any;
  error: string | null;
  timestamp: string;
}

export default function Dashboard() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [caseCount, setCaseCount] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchDashboardData() {
    if (!token) return;
    setRefreshing(true);
    try {
      // Fetch Logs
      const logsRes = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const logsData = await logsRes.json();
      if (logsData.success) {
        setLogs(logsData.logs);
      }

      // Fetch Tasks
      const tasksRes = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const tasksData = await tasksRes.json();
      if (tasksData.success) {
        setTasks(tasksData.tasks);
      }

      // Fetch Cases
      const casesRes = await fetch("/api/cases", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const casesData = await casesRes.json();
      if (casesData.success) {
        setCaseCount(casesData.cases?.length || 0);
      }
    } catch (err) {
      console.error("Dashboard ingestion failure", err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 8000);
    return () => clearInterval(interval);
  }, [token]);

  // Aggregate stats
  const toolCounts = logs.reduce((acc: Record<string, number>, log) => {
    acc[log.tool] = (acc[log.tool] || 0) + 1;
    return acc;
  }, {});

  const barData = {
    labels: Object.keys(toolCounts),
    datasets: [
      {
        label: "Scan Operations",
        data: Object.values(toolCounts),
        backgroundColor: "rgba(6, 182, 212, 0.45)",
        borderColor: "#06b6d4",
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  // Group logs by day
  const logsByDay = logs.reduce((acc: Record<string, number>, log) => {
    const day = log.timestamp.split("T")[0];
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const sortedDays = Object.keys(logsByDay).sort();
  const lineData = {
    labels: sortedDays,
    datasets: [
      {
        label: "Temporal Event Density",
        data: sortedDays.map(d => logsByDay[d]),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.05)",
        fill: true,
        tension: 0.35,
        borderWidth: 1.5,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "#09090b",
        pointBorderWidth: 1.5,
        pointRadius: 3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0c0c0e",
        titleColor: "#ffffff",
        bodyColor: "#a1a1aa",
        titleFont: { family: "monospace", size: 11 },
        bodyFont: { family: "monospace", size: 10 },
        borderColor: "rgba(255, 255, 255, 0.05)",
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.02)" },
        ticks: { 
          color: "#71717a", 
          font: { family: "monospace", size: 9 },
        },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.02)" },
        ticks: { 
          color: "#71717a",
          font: { family: "monospace", size: 9 }
        },
      },
    },
  };

  const runningTasks = tasks.filter(t => t.status === "running" || t.status === "pending");

  return (
    <DashboardShell>
      <div className="space-y-6 text-left font-mono">
        
        {/* TOP TITLE PANEL */}
        <div className="flex justify-between items-center border-b border-white/5 pb-3.5 select-none">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              SOC Operations Telemetry
            </h2>
            <p className="text-[9px] text-zinc-500">REALTIME AUDITING & COMPLIANCE DATA</p>
          </div>
          
          <button 
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="btn-cyber-secondary px-3 py-1.5 flex items-center gap-1.5 text-[10px]"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin text-cyan-400" : ""} />
            {refreshing ? "SYNCING..." : "REFRESH LOGS"}
          </button>
        </div>

        {/* METRIC GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="glass-panel p-4 bg-[#0c0c0e]/80 flex flex-col justify-between select-none">
            <div className="flex justify-between items-start">
              <span className="text-[9px] text-zinc-500 uppercase font-semibold">Total Scans Logged</span>
              <Terminal size={14} className="text-cyan-500" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-white leading-none">{logs.length}</div>
              <div className="text-[8px] text-zinc-500 mt-1 uppercase">Correlated Events</div>
            </div>
          </div>

          <div className="glass-panel p-4 bg-[#0c0c0e]/80 flex flex-col justify-between select-none">
            <div className="flex justify-between items-start">
              <span className="text-[9px] text-zinc-500 uppercase font-semibold">Active Run Tasks</span>
              <Activity size={14} className="text-cyan-500" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-white leading-none">{runningTasks.length}</div>
              <div className="text-[8px] text-zinc-500 mt-1 uppercase">Ingestion Queue</div>
            </div>
          </div>

          <div className="glass-panel p-4 bg-[#0c0c0e]/80 flex flex-col justify-between select-none">
            <div className="flex justify-between items-start">
              <span className="text-[9px] text-zinc-500 uppercase font-semibold">Forensic Incident Cases</span>
              <ShieldAlert size={14} className="text-cyan-500" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-white leading-none">{caseCount}</div>
              <div className="text-[8px] text-zinc-500 mt-1 uppercase">Active Cases</div>
            </div>
          </div>

          <div className="glass-panel p-4 bg-[#0c0c0e]/80 flex flex-col justify-between select-none">
            <div className="flex justify-between items-start">
              <span className="text-[9px] text-zinc-500 uppercase font-semibold">Sensor Health</span>
              <Clock size={14} className="text-emerald-400 animate-pulse" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold text-emerald-400 leading-none">100%</div>
              <div className="text-[8px] text-zinc-500 mt-1 uppercase">SLA Standard</div>
            </div>
          </div>

        </div>

        {/* CHARTS CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-5 bg-[#0c0c0e]/80 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Operational Distribution</h3>
            <div className="h-56 relative">
              {logs.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">Awaiting data...</div>
              ) : (
                <Bar data={barData} options={chartOptions} />
              )}
            </div>
          </div>

          <div className="glass-panel p-5 bg-[#0c0c0e]/80 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Temporal Density Curve</h3>
            <div className="h-56 relative">
              {logs.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">Awaiting data...</div>
              ) : (
                <Line data={lineData} options={chartOptions} />
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE TASKS QUEUE */}
        {runningTasks.length > 0 && (
          <div className="glass-panel p-5 bg-[#0c0c0e]/80 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Background Processes</h3>
            <div className="space-y-3">
              {runningTasks.map((t) => (
                <div key={t.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-350">
                    <span className="font-bold text-cyan-400">{t.name}</span>
                    <span>{t.progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                    <div 
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MITRE ATT&CK MATRIX */}
        <div className="glass-panel p-5 bg-[#0c0c0e]/80">
          <MitreAttackMatrix />
        </div>

        {/* RAW TELEMETRY BLOCK */}
        <div className="text-center pt-2 select-none">
          <button 
            onClick={() => setShowRaw(!showRaw)} 
            className="btn-cyber-secondary px-4 py-2 text-xs uppercase font-bold"
          >
            {showRaw ? "Close Logs Viewport" : "Initialize Logs Viewport"}
          </button>
        </div>

        {showRaw && (
          <div className="glass-panel p-5 bg-black/45 border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-xs text-cyan-500 font-bold border-b border-white/5 pb-2">
              <Database size={14} /> RAW THREAT CORRELATION OBJECTS
            </div>
            <pre className="text-[10px] text-zinc-400 leading-relaxed overflow-x-auto max-h-60 p-2">
              {JSON.stringify(logs, null, 2)}
            </pre>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
