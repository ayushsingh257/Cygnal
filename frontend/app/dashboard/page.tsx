"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import {
  ShieldCheck,
  Briefcase,
  Terminal,
  Activity,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Wifi,
  Globe,
  FileText,
  Zap,
  BarChart3,
} from "lucide-react";

interface StatCard {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}

export default function DashboardPage() {
  const { user, loadUserFromStorage } = useAuthStore();
  const [currentTime, setCurrentTime] = useState("");
  const [animatedStats, setAnimatedStats] = useState(false);

  useEffect(() => {
    loadUserFromStorage();
    setAnimatedStats(true);
    const tick = () => setCurrentTime(new Date().toUTCString().replace("GMT", "UTC"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  // Mock stat cards — in Era 5 these will be live API calls
  const stats: StatCard[] = [
    {
      label: "Active Investigations",
      value: 3,
      sub: "+1 since yesterday",
      icon: <Briefcase size={18} />,
      accent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Scans Executed Today",
      value: 17,
      sub: "across 5 sensor modules",
      icon: <Terminal size={18} />,
      accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "Evidence Files Signed",
      value: 9,
      sub: "SHA-256 custody seals",
      icon: <ShieldCheck size={18} />,
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Threat Indicators",
      value: 24,
      sub: "IOCs correlated",
      icon: <AlertTriangle size={18} />,
      accent: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  // Mock recent activity
  const recentActivity = [
    { icon: <Terminal size={12} />, text: "WHOIS lookup completed for domain suspicious-c2.ru", time: "2m ago", severity: "high" },
    { icon: <Briefcase size={12} />, text: "Case CYG-2026-0003 updated by analyst", time: "14m ago", severity: "medium" },
    { icon: <ShieldCheck size={12} />, text: "Evidence suspect_log.txt signed — SHA-256 sealed", time: "31m ago", severity: "low" },
    { icon: <AlertTriangle size={12} />, text: "DNS sweep flagged 3 suspicious nameservers", time: "1h ago", severity: "high" },
    { icon: <CheckCircle size={12} />, text: "Report IR-2026-07 exported as PDF", time: "2h ago", severity: "low" },
  ];

  // Quick action shortcuts
  const quickActions = [
    { label: "New WHOIS Lookup", href: "/scanners/whois", icon: <Globe size={14} />, color: "text-blue-400" },
    { label: "Header Scanner", href: "/scanners/headers", icon: <Wifi size={14} />, color: "text-indigo-400" },
    { label: "File New Case", href: "/cases", icon: <Briefcase size={14} />, color: "text-emerald-400" },
    { label: "Generate Report", href: "/reports", icon: <FileText size={14} />, color: "text-amber-400" },
  ];

  return (
    <DashboardShell>
      <div className="space-y-8 animate-fade-in">

        {/* ─── Page Header ─── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <p className="label-mono">{currentTime}</p>
            <h1 className="text-xl font-black text-white uppercase tracking-wide">
              {greeting()}, {user?.username?.split(" ")[0] || "Investigator"}
            </h1>
            <p className="text-xs text-slate-500">
              {user?.department || "Security Operations"} · {user?.team || "Triage"} ·{" "}
              <span className="text-blue-400 font-semibold uppercase">{user?.role}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-500/15 px-3 py-2 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
              All Systems Operational
            </span>
          </div>
        </div>

        {/* ─── Stat Cards Grid ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`stat-card animate-fade-in animate-delay-${(i + 1) * 100}`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <p className="label-mono">{s.label}</p>
                  <p className="text-3xl font-black text-white tracking-tight">{s.value}</p>
                  <p className="text-[11px] text-slate-500">{s.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${s.accent}`}>
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Main Grid: Activity + Quick Actions + Status ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Activity Feed (2 cols) */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-blue-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Investigation Activity Feed</h2>
              </div>
              <span className="label-mono">Live</span>
            </div>

            <div className="space-y-1">
              {recentActivity.map((act, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors animate-fade-in animate-delay-${(i + 1) * 100}`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    act.severity === "high"
                      ? "bg-red-950/30 text-red-400 border border-red-500/20"
                      : act.severity === "medium"
                      ? "bg-amber-950/30 text-amber-400 border border-amber-500/20"
                      : "bg-slate-900 text-slate-500 border border-white/5"
                  }`}>
                    {act.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate-300 leading-snug">{act.text}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 font-mono">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Zap size={13} className="text-blue-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Quick Launch</h2>
              </div>
              <div className="space-y-2">
                {quickActions.map((qa) => (
                  <Link
                    key={qa.label}
                    href={qa.href}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group"
                  >
                    <span className={`${qa.color}`}>{qa.icon}</span>
                    <span className="text-[12px] text-slate-400 group-hover:text-white transition-colors">{qa.label}</span>
                    <ArrowRight size={11} className="ml-auto text-slate-700 group-hover:text-slate-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Security Health Score */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <TrendingUp size={13} className="text-emerald-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Security Health</h2>
              </div>
              <div className="flex flex-col items-center gap-3 py-2">
                {/* Score ring */}
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                    <circle
                      cx="40" cy="40" r="32" fill="none"
                      stroke="#10b981" strokeWidth="7"
                      strokeDasharray={`${2 * Math.PI * 32 * 0.87} ${2 * Math.PI * 32}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-emerald-400">87</span>
                    <span className="text-[9px] text-slate-500 font-mono">SCORE</span>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-emerald-400">Good Standing</p>
                  <p className="text-[11px] text-slate-500">Last assessed: today</p>
                </div>
              </div>

              {/* Sub-scores */}
              <div className="space-y-2 pt-1">
                {[
                  { label: "Evidence Integrity", pct: 100, color: "bg-emerald-500" },
                  { label: "Scan Coverage", pct: 76, color: "bg-blue-500" },
                  { label: "Case Resolution", pct: 62, color: "bg-amber-500" },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">{item.label}</span>
                      <span className="text-[10px] font-mono text-slate-400">{item.pct}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                        style={{ width: animatedStats ? `${item.pct}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ─── Sensor Module Status Grid ─── */}
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={14} className="text-blue-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Scanner Module Status</h2>
            </div>
            <Link href="/scanners" className="text-[10px] text-blue-400 hover:text-blue-300 font-mono uppercase tracking-wider flex items-center gap-1">
              View All <ArrowRight size={10} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { name: "WHOIS Lookup", status: "online", count: 4 },
              { name: "Header Scanner", status: "online", count: 7 },
              { name: "Metadata Analysis", status: "online", count: 3 },
              { name: "DNS Intelligence", status: "online", count: 6 },
              { name: "Email Headers", status: "online", count: 2 },
              { name: "IP Reputation", status: "online", count: 5 },
              { name: "Malware Scanner", status: "limited", count: 1 },
              { name: "Screenshot Tool", status: "online", count: 8 },
              { name: "Rev. Image Search", status: "online", count: 3 },
              { name: "Threat Intel", status: "online", count: 9 },
            ].map((mod) => (
              <div
                key={mod.name}
                className="flex flex-col gap-2 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-blue-500/15 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className={`w-1.5 h-1.5 rounded-full ${mod.status === "online" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-[9px] font-mono text-slate-600">{mod.count} runs</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-300 leading-tight">{mod.name}</p>
                <p className={`text-[9px] font-mono uppercase tracking-wider ${mod.status === "online" ? "text-emerald-500/70" : "text-amber-500/70"}`}>
                  {mod.status}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
