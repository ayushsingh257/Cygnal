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
  FileText, 
  AlertTriangle,
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
      if (casesData.success && Array.isArray(casesData.cases)) {
        setCaseCount(casesData.cases.length);
      }

    } catch (err) {
      console.error("Failed to load dashboard data streams", err);
    } finally {
      setRefreshing(false);
    }
  }

  // Load once
  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Poll tasks regularly
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(async () => {
      try {
        const tasksRes = await fetch("/api/tasks", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const tasksData = await tasksRes.json();
        if (tasksData.success) {
          setTasks(tasksData.tasks);
        }
      } catch (err) {
        console.error("Failed to poll scan tasks queue", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [token]);

  // Calculations for tool usage metrics
  const toolUsage: Record<string, number> = {};
  const timelineMap: Record<string, Record<string, number>> = {};

  logs.forEach((log) => {
    const tool = log.tool || "Unknown";
    const timestamp = new Date(log.timestamp).toISOString().split("T")[0]; // YYYY-MM-DD
    toolUsage[tool] = (toolUsage[tool] || 0) + 1;

    if (!timelineMap[tool]) {
      timelineMap[tool] = {};
    }
    timelineMap[tool][timestamp] = (timelineMap[tool][timestamp] || 0) + 1;
  });

  const allDates = Array.from(
    new Set(
      logs.map((log) => new Date(log.timestamp).toISOString().split("T")[0])
    )
  ).sort();

  // Highlight colors mapping (Cygnal Cyber Palette)
  const neonColors = [
    "#00f2fe", // cyan
    "#7209b7", // purple
    "#f72585", // neon pink
    "#1e90ff", // blue
    "#00e676", // green
    "#ffb300", // yellow
    "#ff1744"  // red
  ];

  const timelineDatasets = Object.keys(timelineMap).map((tool, index) => ({
    label: tool,
    data: allDates.map((date) => timelineMap[tool][date] || 0),
    borderColor: neonColors[index % neonColors.length],
    backgroundColor: `${neonColors[index % neonColors.length]}1A`, // opacity 10%
    borderWidth: 2,
    pointBackgroundColor: neonColors[index % neonColors.length],
    pointHoverRadius: 6,
    fill: true,
    tension: 0.35,
  }));

  const barChartData = {
    labels: Object.keys(toolUsage),
    datasets: [
      {
        label: "Scan Frequency",
        data: Object.values(toolUsage),
        backgroundColor: "rgba(114, 9, 183, 0.45)",
        borderColor: "#00f2fe",
        borderWidth: 1.5,
        hoverBackgroundColor: "rgba(0, 242, 254, 0.4)",
        hoverBorderColor: "#00f2fe"
      },
    ],
  };

  const timelineChartData = {
    labels: allDates,
    datasets: timelineDatasets,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { 
          color: "#94a3b8",
          font: { family: "monospace", size: 10 }
        },
      },
      tooltip: {
        backgroundColor: "rgba(2, 2, 5, 0.95)",
        titleFont: { family: "monospace" },
        bodyFont: { family: "monospace" },
        borderColor: "rgba(0, 242, 254, 0.2)",
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.02)" },
        ticks: { 
          color: "#94a3b8", 
          font: { family: "monospace", size: 10 },
          maxRotation: 45, 
          minRotation: 45 
        },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.02)" },
        ticks: { 
          color: "#94a3b8",
          font: { family: "monospace", size: 10 }
        },
      },
    },
  };

  const runningTasks = tasks.filter(t => t.status === "running" || t.status === "pending");

  return (
    <DashboardShell>
      <div className="space-y-8 text-left">
      
      {/* SOC PAGE TITLE PANEL */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent uppercase font-mono tracking-wider">
            SOC Operations Dashboard
          </h2>
          <p className="text-xs text-gray-500 font-mono">SYSTEM WIDE AUDITS & CORRELATION ENGINE</p>
        </div>
        
        <button 
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="btn-cyber-secondary px-3 py-1.5 flex items-center gap-1.5 font-mono text-xs"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "SYNCHRONIZING..." : "REFRESH TELEMETRY"}
        </button>
      </div>

      {/* TACTICAL METRIC GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-panel p-4 flex flex-col justify-between bg-zinc-950/20 border-white/5 select-none">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-gray-500 uppercase">RECON SCANS LOGGED</span>
            <Terminal size={14} className="text-cyan-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-cyan-400 glow-cyan font-mono">{logs.length}</div>
            <div className="text-[9px] text-gray-600 font-mono mt-1">TOTAL PARSED EVENT TELEMETRY</div>
          </div>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between bg-zinc-950/20 border-white/5 select-none">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-gray-500 uppercase">ACTIVE QUEUED JOBS</span>
            <Activity size={14} className="text-purple-400 animate-pulse" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-purple-400 glow-purple font-mono">{runningTasks.length}</div>
            <div className="text-[9px] text-gray-600 font-mono mt-1">RUNNING IN BACKGROUND QUEUE</div>
          </div>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between bg-zinc-950/20 border-white/5 select-none">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-gray-500 uppercase">ACTIVE INCIDENT CASES</span>
            <FileText size={14} className="text-yellow-500" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-yellow-500 font-mono">{caseCount}</div>
            <div className="text-[9px] text-gray-600 font-mono mt-1">OPEN DFIR INVESTIGATION LOGS</div>
          </div>
        </div>

        <div className="glass-panel p-4 flex flex-col justify-between bg-zinc-950/20 border-white/5 select-none">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-gray-500 uppercase">THREAT LEVEL STATE</span>
            <AlertTriangle size={14} className="text-red-500" />
          </div>
          <div className="mt-4">
            <div className="text-lg font-bold text-red-500 font-mono tracking-wider animate-pulse">INFOCON 3</div>
            <div className="text-[9px] text-gray-600 font-mono mt-1.5 uppercase">Threat levels elevated</div>
          </div>
        </div>

      </div>

      {/* SPLIT LAYOUT: LIVE QUEUE & MITRE MATRIX */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Active Scan Queue widget (Xl: 4) */}
        <div className="xl:col-span-4 glass-panel p-5 bg-zinc-950/20 text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <Clock size={16} className="text-cyan-400 animate-pulse" />
              <h3 className="text-sm font-semibold font-mono text-cyan-400 uppercase tracking-wider">
                ⚡ Active Operations Queue
              </h3>
            </div>

            {tasks.length === 0 ? (
              <p className="text-gray-500 font-mono text-xs py-8 text-center">No active scan jobs in queue.</p>
            ) : (
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                {tasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="bg-black/40 p-3 rounded border border-white/5 text-xs font-mono">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-200 truncate max-w-[150px]">{task.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        task.status === "complete" ? "bg-green-950/40 text-green-400 border border-green-800" :
                        task.status === "error" ? "bg-red-950/40 text-red-400 border border-red-800" :
                        task.status === "running" ? "bg-blue-950/40 text-blue-400 border border-blue-800 animate-pulse" :
                        "bg-yellow-950/40 text-yellow-400 border border-yellow-800"
                      }`}>
                        {task.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 w-8 text-right font-mono">
                        {task.progress}%
                      </span>
                    </div>

                    {task.error && (
                      <p className="text-red-400 text-[10px] mt-1.5 truncate">
                        Err: {task.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MITRE ATT&CK Matrix (Xl: 8) */}
        <div className="xl:col-span-8 glass-panel p-5 bg-zinc-950/20">
          <MitreAttackMatrix />
        </div>

      </div>

      {/* CHARTS GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tool usage bar chart */}
        <div className="glass-panel p-5 bg-zinc-950/20">
          <h3 className="text-sm font-semibold font-mono text-cyan-400 border-b border-white/5 pb-2 mb-4">
            🔍 Tool Scan Frequency
          </h3>
          <div className="h-[250px]">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        {/* Tool usage timeline */}
        <div className="glass-panel p-5 bg-zinc-950/20">
          <h3 className="text-sm font-semibold font-mono text-cyan-400 border-b border-white/5 pb-2 mb-4">
            📈 Temporal Incident Scan Distribution
          </h3>
          <div className="h-[250px]">
            <Line data={timelineChartData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* RAW TELEMETRY LOADER */}
      <div className="text-center">
        <button 
          onClick={() => setShowRaw(!showRaw)} 
          className="btn-cyber-secondary px-4 py-2 font-mono text-xs"
        >
          {showRaw ? "TERMINATE RAW AUDIT STREAM" : "INITIALIZE RAW AUDIT STREAM"}
        </button>
      </div>

      {showRaw && (
        <div className="glass-panel p-4 bg-zinc-950 border border-white/5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3 font-mono text-xs text-cyan-500">
            <Database size={12} /> RAW THREAT CORRELATION OBJECTS
          </div>
          <pre className="text-[10px] text-cyan-600/80 font-mono leading-relaxed overflow-x-auto max-h-60 p-2">
            {JSON.stringify(logs, null, 2)}
          </pre>
        </div>
      )}

      </div>
    </DashboardShell>
  );
}
