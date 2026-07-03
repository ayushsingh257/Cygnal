"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardShell from "@/components/DashboardShell";
import ScannersConsole from "@/components/ScannersConsole";
import CyberGlobe from "@/components/CyberGlobe";
import { Shield, Terminal, Activity, Eye, Server, Cpu } from "lucide-react";

const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

export default function Home() {
  const { user, loadUserFromStorage } = useAuthStore();
  const [showLogin, setShowLogin] = useState(true);
  const [threatLogs, setThreatLogs] = useState<string[]>([
    "SYSINIT: Secure sandbox environment established.",
    "INTEL: Threat database definitions updated successfully.",
    "MONITOR: Unified logs buffer ready."
  ]);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Simulated live threat intelligence logs
  useEffect(() => {
    if (user) return; // Only run on landing page for visual effect

    const feeds = [
      "MALWARE: Dynamic analysis finished on SHA-256: 4f1a23b9 - Verdict: SUSPICIOUS",
      "RECON: Active Port sweep registered on sensor node 02.",
      "SECURITY: Missing CSP header detected for Host: api.internal_audit.org",
      "INTEL: IOC blocklist updated: 42 malicious IPs appended.",
      "AUDIT: Successful admin login audit log recorded.",
      "WHOIS: Registry query executed for domain: secops-tracker.net",
      "IP: Bad reputation threshold crossed for source IP: 185.220.101.4"
    ];

    const interval = setInterval(() => {
      const feed = feeds[Math.floor(Math.random() * feeds.length)];
      const time = new Date().toLocaleTimeString();
      setThreatLogs((prev) => [...prev.slice(-4), `[${time}] ${feed}`]);
    }, 4000);

    return () => clearInterval(interval);
  }, [user]);

  // If user is authenticated, render inside the SOC dashboard layout shell
  if (user) {
    return (
      <DashboardShell>
        <ScannersConsole />
      </DashboardShell>
    );
  }

  // Otherwise, render the premium unauthenticated SOC command center
  return (
    <main className="min-h-screen bg-[#020205] text-[#f1f5f9] flex flex-col justify-between p-6 relative overflow-hidden cyber-grid">
      
      {/* Background glow filters */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-950/20 filter blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-950/20 filter blur-[120px] rounded-full pointer-events-none" />

      {/* TOP HEADER STATUS STRIP */}
      <div className="w-full flex items-center justify-between border-b border-white/5 pb-4 bg-black/10 backdrop-filter blur-sm z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400 glow-cyan animate-pulse" />
          <span className="font-mono text-sm font-bold tracking-wider uppercase">
            Cygnal Security Node
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
          <span className="hidden sm:inline">CON: SECURE CHANNEL</span>
          <span className="text-cyan-500 font-semibold uppercase animate-pulse">Ready</span>
        </div>
      </div>

      {/* HERO & SPLIT WORKSPACE GRID */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-10 z-10">
        
        {/* LEFT COLUMN: 3D CYBER GLOBE & INTEL FEED (Lg: 7) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-8 text-center lg:text-left">
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent uppercase font-mono">
              CYGNAL SEC OPS
            </h1>
            <p className="text-gray-400 max-w-lg text-sm md:text-base font-mono">
              Leverage open-source intelligence, passive reconnaissance, and security metadata extraction to discover silent threat signals.
            </p>
          </div>

          {/* Interactive digital globe */}
          <div className="w-full max-w-[450px]">
            <CyberGlobe />
          </div>

          {/* Live Simulated Threat Feed Terminal */}
          <div className="w-full max-w-xl glass-panel bg-black/60 p-4 border border-cyan-500/10 rounded-md font-mono text-left">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
              <Terminal size={14} className="text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Live Threat Intel stream</span>
            </div>
            <div className="space-y-1.5 min-h-[100px] text-[11px] text-gray-400">
              {threatLogs.map((log, i) => (
                <div key={i} className="truncate select-none">
                  <span className="text-cyan-600 mr-1.5">&gt;</span>
                  {log}
                </div>
              ))}
              <div className="terminal-cursor text-cyan-400 text-xs mt-1 font-bold">Awaiting new events</div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SECURE PORTAL CARD (Lg: 5) */}
        <div className="lg:col-span-5 w-full max-w-[450px] mx-auto">
          <div className="glass-panel p-6 border border-white/5 relative bg-[#06060f]/90">
            
            {/* Header Tabs */}
            <div className="flex border-b border-white/5 mb-6">
              <button
                onClick={() => setShowLogin(true)}
                className={`flex-1 pb-3 text-sm font-mono font-bold tracking-wider transition-all duration-200 border-b-2 ${
                  showLogin 
                    ? "border-cyan-400 text-cyan-400 font-bold" 
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                🔐 LOGIN
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 pb-3 text-sm font-mono font-bold tracking-wider transition-all duration-200 border-b-2 ${
                  !showLogin 
                    ? "border-purple-500 text-purple-400 font-bold" 
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                👤 REGISTER
              </button>
            </div>

            {/* Form Slot */}
            <div className="min-h-[300px]">
              {showLogin ? <LoginForm /> : <RegisterForm />}
            </div>

            {/* Security Notice */}
            <div className="mt-4 pt-4 border-t border-white/5 text-[9px] text-gray-500 font-mono text-center leading-relaxed select-none">
              TACTICAL WARNING: THIS CONSOLE ACCESS IS RESTRICTED TO AUTHORIZED ANALYSTS. SESSION CORRELATIONS ARE DOCK-INGESTED FOR AUDITS.
            </div>

          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="w-full flex justify-between items-center border-t border-white/5 pt-4 text-[10px] text-gray-600 font-mono z-10">
        <span>© 2026 CYGNAL OPERATIONS CENTER</span>
        <span>BUILD: ENTERPRISE EDITION</span>
      </footer>

    </main>
  );
}
