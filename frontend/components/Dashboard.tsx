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
import "../app/dashboard/dashboard.css";

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
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/history");
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard logs", err);
      }
    }
    fetchLogs();
  }, []);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks");
        const data = await res.json();
        if (data.success) {
          setTasks(data.tasks);
        }
      } catch (err) {
        console.error("Failed to fetch active tasks queue", err);
      }
    }
    fetchTasks();
    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, []);

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

  // 🟣 Last 5 days slice
  const today = new Date();
  const last5Dates = Array.from({ length: 5 }).map((_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 4 + i); // 4,3,2,1,0
    return date.toISOString().split("T")[0];
  });

  const colors = [
    "#FF69B4", "#8A2BE2", "#00BFFF", "#FFD700",
    "#00FF7F", "#FF4500", "#9932CC", "#00CED1",
    "#FF6347", "#40E0D0", "#BA55D3", "#7FFF00",
    "#FF8C00", "#20B2AA", "#DA70D6", "#1E90FF"
  ];

  const timelineDatasets = Object.keys(timelineMap).map((tool, index) => ({
    label: tool,
    data: allDates.map((date) => timelineMap[tool][date] || 0),
    borderColor: colors[index % colors.length],
    backgroundColor: colors[index % colors.length],
    fill: false,
    tension: 0.3,
  }));

  const last5Datasets = Object.keys(timelineMap).map((tool, index) => ({
    label: tool,
    data: last5Dates.map((date) => timelineMap[tool][date] || 0),
    borderColor: colors[index % colors.length],
    backgroundColor: colors[index % colors.length],
    fill: false,
    tension: 0.3,
  }));

  const barChartData = {
    labels: Object.keys(toolUsage),
    datasets: [
      {
        label: "Tool Usage Count",
        data: Object.values(toolUsage),
        backgroundColor: "rgba(138,43,226,0.7)",
        borderColor: "rgba(255,105,180,1)",
        borderWidth: 1,
      },
    ],
  };

  const timelineChartData = {
    labels: allDates,
    datasets: timelineDatasets,
  };

  const last5ChartData = {
    labels: last5Dates,
    datasets: last5Datasets,
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "white" },
      },
    },
    scales: {
      x: {
        ticks: { color: "white", maxRotation: 45, minRotation: 45 },
        title: { display: true, text: "Date", color: "white" },
      },
      y: {
        ticks: { color: "white" },
        title: { display: true, text: "Tool Usage Count", color: "white" },
      },
    },
  };

  return (
    <div className="dashboard-container mt-20 text-white max-w-7xl mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-8 gradient-title">
        Live SOC Dashboard
      </h2>

      {/* Live Active Scan Queue */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-lg mb-8 shadow-xl">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          ⚡ Live Scan Queue & Running Jobs
        </h3>
        {tasks.length === 0 ? (
          <p className="text-gray-400 text-sm font-mono">No active scan jobs in queue.</p>
        ) : (
          <div className="space-y-4">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="bg-zinc-800/80 p-4 rounded border border-zinc-700/80">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-purple-400">{task.name}</span>
                    <span className="text-xs text-gray-500 ml-2 font-mono">ID: {task.id.slice(0, 8)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    task.status === "complete" ? "bg-green-950 text-green-400 border border-green-700" :
                    task.status === "error" ? "bg-red-950 text-red-400 border border-red-700" :
                    task.status === "running" ? "bg-blue-950 text-blue-400 border border-blue-700 animate-pulse" :
                    "bg-yellow-950 text-yellow-400 border border-yellow-700"
                  }`}>
                    {task.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 font-mono w-8 text-right">
                    {task.progress}%
                  </span>
                </div>
                {task.error && (
                  <p className="text-red-400 text-xs mt-2 font-mono break-all">
                    Error: {task.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="charts-grid">
        {/* Bar Chart */}
        <div className="chart-box">
          <h3 className="text-xl font-semibold mb-4">Tool Usage Frequency</h3>
          <Bar data={barChartData} options={chartOptions} />
        </div>

        {/* All-Time Line Chart */}
        <div className="chart-box">
          <h3 className="text-xl font-semibold mb-4">Tool Usage Timeline</h3>
          <Line data={timelineChartData} options={chartOptions} />
        </div>

        {/* Last 5 Days Line Chart */}
        <div className="chart-box">
          <h3 className="text-xl font-semibold mb-4">Tool Usage: Last 5 Days</h3>
          <Line data={last5ChartData} options={chartOptions} />
        </div>
      </div>

      {/* Toggle raw log viewer */}
      <div className="text-center mt-10">
        <button onClick={() => setShowRaw(!showRaw)} className="btn-cygnal-link">
          {showRaw ? "Hide Raw Logs" : "Show Raw Logs"}
        </button>
      </div>

      {showRaw && (
        <div className="raw-log-view mt-4">
          <pre>{JSON.stringify(logs, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
