"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardShell from "@/components/DashboardShell";
import ScannersConsole from "@/components/ScannersConsole";
import { 
  Shield, 
  Terminal, 
  Cpu, 
  Database, 
  Activity, 
  GitBranch, 
  ArrowRight,
  ChevronDown,
  Layers,
  FolderLock
} from "lucide-react";

const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

export default function Home() {
  const { user, loadUserFromStorage } = useAuthStore();
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  if (user) {
    return (
      <DashboardShell>
        <ScannersConsole />
      </DashboardShell>
    );
  }

  const features = [
    {
      icon: Terminal,
      title: "Intake Automation",
      desc: "Trigger domain sweeps, port scans, and malware analyses instantly using distributed task polling queues."
    },
    {
      icon: FolderLock,
      title: "Incident Governance",
      desc: "File cases, upload digital evidence with SHA-256 integrity verifications, and map IOC paths."
    },
    {
      icon: Database,
      title: "Security Ledger Logs",
      desc: "Anchor system activity to strict historical audit trails, ensuring absolute regulatory compliance."
    },
    {
      icon: Cpu,
      title: "Threat Intel Bridges",
      desc: "Integrate custom threat databases directly to verify indicator reputations during active investigation phases."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#060814] text-slate-100 font-sans select-none flex flex-col justify-between overflow-x-hidden">
      
      {/* Background Grids */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 cyber-grid-dense opacity-[0.22]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060814] via-transparent to-[#060814]/40" />
        <div className="absolute top-[10%] left-[25%] w-[600px] h-[600px] rounded-full bg-cyan-950/10 blur-[130px] opacity-70" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/5 bg-[#060814]/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Shield className="h-4.5 w-4.5 text-cyan-400" />
            </div>
            <span className="text-xs font-black tracking-[0.25em] text-white font-mono uppercase">
              Cygnal Portal
            </span>
          </div>

          <a 
            href="#gateway"
            className="btn-cyber text-[10px] tracking-widest font-mono py-2 px-5"
          >
            Access Gateway <ArrowRight size={12} className="ml-1" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 py-12 space-y-20">
        
        {/* Hero & Authenticator Splitted Grid */}
        <section className="grid lg:grid-cols-12 gap-12 items-center pt-8">
          
          {/* Hero text */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded border border-cyan-500/25 bg-cyan-950/20 px-3.5 py-1 text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
              <Activity className="h-3 w-3 text-cyan-400 animate-pulse" />
              SOCIETY SECURITY & INVESTIGATION PLATFORM
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-mono font-extrabold tracking-tight text-white leading-[1.1]">
              INCIDENT RECON
              <span className="block text-slate-500 text-lg sm:text-xl font-light uppercase tracking-[0.25em] mt-2">
                & THREAT GOVERNANCE
              </span>
            </h1>

            <p className="max-w-md text-xs sm:text-sm text-slate-400 leading-relaxed font-sans font-medium">
              Run automated OSINT recon modules, index evidence parameters under SHA-256, and preserve access control audit trials in one secure portal.
            </p>

            <div className="flex gap-3.5 pt-2">
              <a href="#gateway" className="btn-cyber text-[10px] tracking-widest font-mono py-3.5 px-6">
                GET STARTED <ArrowRight size={12} className="ml-1" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded border border-white/5 bg-slate-950/40 hover:bg-slate-950 px-5 py-3 text-[9px] font-mono text-slate-400 uppercase tracking-widest transition-all"
              >
                CAPABILITIES <ChevronDown size={12} />
              </a>
            </div>
          </div>

          {/* Login/Signup Form Gateway block */}
          <div id="gateway" className="lg:col-span-5 w-full">
            <div className="glass-card rounded-xl p-6 border border-white/10 relative overflow-hidden bg-[#0d1117]/60">
              
              {/* Tab selector */}
              <div className="flex border-b border-white/5 mb-6 text-xs select-none">
                <button
                  onClick={() => setShowLogin(true)}
                  className={`flex-1 pb-3 font-mono uppercase tracking-widest transition-all ${
                    showLogin ? "border-b border-cyan-400 text-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowLogin(false)}
                  className={`flex-1 pb-3 font-mono uppercase tracking-widest transition-all ${
                    !showLogin ? "border-b border-cyan-400 text-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Enlist Node
                </button>
              </div>

              {showLogin ? <LoginForm /> : <RegisterForm />}
            </div>
          </div>

        </section>

        {/* Feature Highlights Section */}
        <section id="features" className="space-y-8 pt-8">
          <div className="text-center space-y-2 select-none">
            <span className="text-[10px] font-mono text-cyan-400 tracking-[0.25em] uppercase">SYSTEM CAPABILITIES</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase font-mono">
              Operations Matrix
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="glass-card rounded-xl p-5 border border-white/5 bg-[#0a0d1a]/30 space-y-3.5 hover:border-cyan-500/20 transition-all duration-200">
                  <div className="h-9 w-9 rounded-lg bg-cyan-950/20 border border-cyan-500/10 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5 text-cyan-400" />
                  </div>
                  <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">{f.title}</h3>
                  <p className="text-[11px] text-slate-550 leading-relaxed font-sans">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Statistics block */}
        <section className="glass-card rounded-xl p-6 border border-white/5 bg-[#0a0d1a]/20 grid grid-cols-2 md:grid-cols-4 gap-6 text-center select-none">
          <div>
            <span className="text-2xl font-black font-mono text-cyan-400">98.2%</span>
            <span className="block text-[8px] font-mono text-slate-650 uppercase tracking-widest mt-1">SLA Accuracy</span>
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-white">&lt; 3s</span>
            <span className="block text-[8px] font-mono text-slate-650 uppercase tracking-widest mt-1">Triage Latency</span>
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-cyan-400">10</span>
            <span className="block text-[8px] font-mono text-slate-650 uppercase tracking-widest mt-1">OSINT Decoders</span>
          </div>
          <div>
            <span className="text-2xl font-black font-mono text-white">100%</span>
            <span className="block text-[8px] font-mono text-slate-650 uppercase tracking-widest mt-1">Audit Validity</span>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-[#060814]/40 py-6 text-center select-none">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          Cygnal Incident Control Engine © {new Date().getFullYear()} — Secure Operations Command
        </span>
      </footer>

    </div>
  );
}
