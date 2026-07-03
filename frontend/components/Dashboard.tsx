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
import { Button } from "./ui/button";
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
        pointBorderColor: "#060814",
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
        backgroundColor: "#0d1117",
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
    <div className="space-y-6 text-left font-sans">
      
      {/* Top Title Bar */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4 select-none">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            SOC Operations Telemetry
          </h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Real-time auditing & compliance logs</p>
        </div>
        
        <Button 
          onClick={fetchDashboardData}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin text-cyan-400" : ""} />
          {refreshing ? "Syncing..." : "Sync Logs"}
        </Button>
      </div>

      {/* Metrics Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 flex flex-col justify-between select-none">
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">Total Scans</span>
            <Terminal size={14} className="text-cyan-400" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black font-mono text-white leading-none">{logs.length}</div>
            <div className="text-[9px] text-slate-550 mt-1.5 uppercase font-mono tracking-wider">Correlated Entries</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 flex flex-col justify-between select-none">
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">Active Tasks</span>
            <Activity size={14} className="text-cyan-400" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black font-mono text-white leading-none">{runningTasks.length}</div>
            <div className="text-[9px] text-slate-550 mt-1.5 uppercase font-mono tracking-wider">Background Ingestion</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 flex flex-col justify-between select-none">
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">Incident Cases</span>
            <ShieldAlert size={14} className="text-cyan-400" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black font-mono text-white leading-none">{caseCount}</div>
            <div className="text-[9px] text-slate-550 mt-1.5 uppercase font-mono tracking-wider">Indexed Cards</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 flex flex-col justify-between select-none">
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[10px] font-mono uppercase tracking-wider">Sensor Health</span>
            <Clock size={14} className="text-emerald-400 animate-pulse" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black font-mono text-emerald-450 leading-none">100%</div>
            <div className="text-[9px] text-slate-550 mt-1.5 uppercase font-mono tracking-wider">Operational SLA</div>
          </div>
        </div>

      </div>

      {/* Area & Line Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Module Distribution</h3>
          <div className="h-56 relative">
            {logs.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-550 font-mono">Awaiting telemetry ingestion...</div>
            ) : (
              <Bar data={barData} options={chartOptions} />
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Temporal Event Density</h3>
          <div className="h-56 relative">
            {logs.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-550 font-mono">Awaiting telemetry ingestion...</div>
            ) : (
              <Line data={lineData} options={chartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Task Queue Shimmer List */}
      {runningTasks.length > 0 && (
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Active Background Ingestion</h3>
          <div className="space-y-3.5">
            {runningTasks.map((t) => (
              <div key={t.id} className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span className="font-semibold text-cyan-400">{t.name}</span>
                  <span>{t.progress}%</span>
                </div>
                <div className="w-full bg-[#060814] rounded-full h-1 overflow-hidden">
                  <div 
                    className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mitre Attack techniques Matrix */}
      <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60">
        <MitreAttackMatrix />
      </div>

      {/* Raw JSON logs inspector panel */}
      <div className="text-center pt-2 select-none">
        <Button 
          onClick={() => setShowRaw(!showRaw)} 
          variant="outline"
        >
          {showRaw ? "Close Logs Viewport" : "Initialize Logs Viewport"}
        </Button>
      </div>

      {showRaw && (
        <div className="glass-card rounded-xl p-5 bg-[#060814]/80 border border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold border-b border-white/5 pb-2 font-mono">
            <Database size={14} /> RAW THREAT CORRELATION OBJECTS
          </div>
          <pre className="text-[10px] text-slate-450 leading-relaxed overflow-x-auto max-h-60 p-2 font-mono">
            {JSON.stringify(logs, null, 2)}
          </pre>
        </div>
      )}

    </div>
  );
}
