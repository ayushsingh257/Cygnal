"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardShell from "@/components/DashboardShell";
import ScannersConsole from "@/components/ScannersConsole";
import CyberGlobe from "@/components/CyberGlobe";
import { Shield, Terminal, Cpu, Database, Activity, GitBranch } from "lucide-react";

const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

export default function Home() {
  const { user, loadUserFromStorage } = useAuthStore();
  const [showLogin, setShowLogin] = useState(true);
  const [threatLogs, setThreatLogs] = useState<string[]>([
    "SYSINIT: Secure sandbox environment established.",
    "INTEL: Threat database definitions synchronized.",
    "MONITOR: System sensors online."
  ]);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Simulated threat intelligence stream
  useEffect(() => {
    if (user) return;

    const feeds = [
      "MALWARE: Static matching finished on SHA-256: 4f1a23b9 - Verdict: SUSPICIOUS",
      "RECON: Active Port sweep registered on sensor node 02.",
      "SECURITY: Missing CSP header detected for Host: api.internal_audit.org",
      "INTEL: IOC blocklist updated: 42 malicious IPs appended.",
      "WHOIS: Registry query executed for domain: secops-tracker.net",
      "IP: Bad reputation threshold crossed for source IP: 185.220.101.4"
    ];

    const interval = setInterval(() => {
      const feed = feeds[Math.floor(Math.random() * feeds.length)];
      const time = new Date().toLocaleTimeString();
      setThreatLogs((prev) => [...prev.slice(-4), `[${time}] ${feed}`]);
    }, 4500);

    return () => clearInterval(interval);
  }, [user]);

  if (user) {
    return (
      <DashboardShell>
        <ScannersConsole />
      </DashboardShell>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col justify-between p-6 relative overflow-hidden cyber-grid select-none">
      
      {/* Subtle SaaS glow grids */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-950/5 filter blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-950/5 filter blur-[150px] rounded-full pointer-events-none" />

      {/* TOP HEADER */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between border-b border-white/5 pb-4 bg-black/5 backdrop-filter blur-sm z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-500" />
          <span className="font-mono text-xs font-semibold tracking-wider uppercase text-white">
            Cygnal SecOps
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
          <span>CONSOLE ACCESS PROTOCOL</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
        </div>
      </div>

      {/* HERO / SPLIT CONTAINER */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto py-8 z-10">
        
        {/* LEFT COLUMN: HERO TEXT & MAP */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          
          <div className="space-y-3">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-sans uppercase">
              Intelligent Threat <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Recon & Analytics
              </span>
            </h1>
            <p className="text-zinc-400 max-w-lg text-xs md:text-sm font-mono leading-relaxed">
              Unify digital forensics, network surface sweeps, file EXIF analysis, and IOC relationship maps under a single cooperative operations console.
            </p>
          </div>

          {/* Interactive minimalist globe */}
          <div className="w-full max-w-[360px] mx-auto lg:mx-0">
            <CyberGlobe />
          </div>

          {/* Simulated Terminal logs */}
          <div className="w-full max-w-xl bg-black/40 p-3.5 border border-white/5 rounded-md font-mono text-left">
            <div className="flex items-center gap-2 border-b border-white/5 pb-1.5 mb-2.5">
              <Terminal size={12} className="text-zinc-500" />
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Live intelligence feed</span>
            </div>
            <div className="space-y-1 text-[10px] text-zinc-400">
              {threatLogs.map((log, i) => (
                <div key={i} className="truncate">
                  <span className="text-cyan-600/70 mr-1.5">&gt;</span>
                  {log}
                </div>
              ))}
              <div className="text-zinc-500 text-[10px] mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                Awaiting telemetry...
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ACCESS FORM */}
        <div className="lg:col-span-5 w-full max-w-[380px] mx-auto">
          <div className="glass-panel p-6 border border-white/5 bg-[#0c0c0e]/80">
            
            {/* Toggles */}
            <div className="flex border-b border-white/5 mb-5 select-none">
              <button
                onClick={() => setShowLogin(true)}
                className={`flex-1 pb-2.5 text-xs font-mono font-bold tracking-wider transition-all duration-150 border-b-2 ${
                  showLogin 
                    ? "border-cyan-500 text-cyan-400" 
                    : "border-transparent text-zinc-500 hover:text-zinc-400"
                }`}
              >
                🔐 LOGIN
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 pb-2.5 text-xs font-mono font-bold tracking-wider transition-all duration-150 border-b-2 ${
                  !showLogin 
                    ? "border-cyan-500 text-cyan-400" 
                    : "border-transparent text-zinc-500 hover:text-zinc-400"
                }`}
              >
                👤 REGISTER
              </button>
            </div>

            {/* Embedded login/register card */}
            <div className="min-h-[290px]">
              {showLogin ? <LoginForm /> : <RegisterForm />}
            </div>

            {/* Terms notice */}
            <div className="mt-4 pt-3.5 border-t border-white/5 text-[8px] text-zinc-650 font-mono text-center leading-relaxed">
              WARNING: ACCESS RESTRICTED TO AUTHORIZED ANALYSTS ONLY. AUDIT LOGS INGESTED CHRONOLOGICALLY.
            </div>

          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="w-full max-w-7xl mx-auto flex justify-between items-center border-t border-white/5 pt-4 text-[9px] text-zinc-600 font-mono z-10">
        <span>© 2026 CYGNAL OPERATIONS CENTER</span>
        <span>BUILD: 2.0-SaaS</span>
      </footer>

    </main>
  );
}
