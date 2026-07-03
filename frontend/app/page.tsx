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
  ArrowRight,
  ChevronDown,
  Layers,
  FolderLock,
  Search,
  MessageSquare,
  FileText
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

  const capabilities = [
    {
      icon: Terminal,
      title: "Active Ingestion Tools",
      desc: "Coordinate subdomain sweeps, open ports probes, WHOIS records lookup, and HTTP headers inspection."
    },
    {
      icon: FolderLock,
      title: "Case Records Storage",
      desc: "Track incident categories, assign severities, append forensic audit notes, and log timeline activity."
    },
    {
      icon: Database,
      title: "SHA-256 Vaulting",
      desc: "Preserve document and payload evidence with instant cryptographic verification hashes checks."
    },
    {
      icon: Cpu,
      title: "Threat Intel Bridges",
      desc: "Query active indicator reputations and intelligence feeds from custom backend integration connectors."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#060814] text-slate-100 font-sans select-none flex flex-col justify-between overflow-x-hidden">
      
      {/* Background Grids */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 cyber-grid-dense opacity-[0.2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060814] via-transparent to-[#060814]/40" />
        <div className="absolute top-[10%] left-[25%] w-[600px] h-[600px] rounded-full bg-blue-950/10 blur-[130px] opacity-70" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full border-b border-white/5 bg-[#060814]/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Shield className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <span className="text-xs font-bold tracking-[0.2em] text-white uppercase">
              Cygnal Enterprise
            </span>
          </div>

          <a 
            href="#gateway"
            className="btn-cyber-primary text-xs font-medium py-2 px-4.5"
          >
            Access Gateway <ArrowRight size={13} className="ml-1" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 py-16 space-y-28">
        
        {/* Hero & Login Splitted Container Grid */}
        <section className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero text content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-950/15 px-4 py-1 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5 text-blue-400" />
              Next-Gen SecOps Orchestration Engine
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Automated Recon
              <span className="block text-slate-500 text-2xl sm:text-3xl font-light uppercase tracking-[0.2em] mt-3">
                & Incident Governance
              </span>
            </h1>

            <p className="max-w-md text-sm text-slate-400 leading-relaxed">
              Consolidate domain security probes, structure active incident case files, and track digital forensic evidence parameters under absolute audit logs compliance.
            </p>

            <div className="flex gap-4 pt-2">
              <a href="#gateway" className="btn-cyber-primary py-3 px-6 tracking-wide text-xs">
                INITIALIZE PORTAL <ArrowRight size={13} className="ml-1.5" />
              </a>
              <a
                href="#features"
                className="btn-cyber py-3 px-6 tracking-wide text-xs bg-slate-950/20 border-white/5 text-slate-400"
              >
                CAPABILITIES <ChevronDown size={13} className="ml-1" />
              </a>
            </div>
          </div>

          {/* Login/Signup Tab block */}
          <div id="gateway" className="lg:col-span-5 w-full">
            <div className="glass-card rounded-xl p-6 bg-[#0d1117]/65 border border-white/5 shadow-2xl relative overflow-hidden">
              
              {/* Tab selector */}
              <div className="flex border-b border-white/5 mb-6 text-xs select-none">
                <button
                  onClick={() => setShowLogin(true)}
                  className={`flex-1 pb-3 font-semibold uppercase tracking-wider transition-all ${
                    showLogin ? "border-b border-blue-500 text-blue-400" : "text-slate-500 hover:text-slate-350"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowLogin(false)}
                  className={`flex-1 pb-3 font-semibold uppercase tracking-wider transition-all ${
                    !showLogin ? "border-b border-blue-500 text-blue-400" : "text-slate-500 hover:text-slate-350"
                  }`}
                >
                  Enlist Node
                </button>
              </div>

              {showLogin ? <LoginForm /> : <RegisterForm />}
            </div>
          </div>

        </section>

        {/* Feature Highlights Grid */}
        <section id="features" className="space-y-10">
          <div className="text-center space-y-2 select-none">
            <span className="text-[10px] font-bold text-blue-450 tracking-[0.2em] uppercase">SYSTEM CAPABILITIES</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
              Operations Matrix
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {capabilities.map((c, idx) => {
              const Icon = c.icon;
              return (
                <div key={idx} className="glass-card rounded-xl p-6 bg-[#0d1117]/40 space-y-4 hover:border-blue-500/20 transition-all duration-200">
                  <div className="h-9 w-9 rounded-lg bg-blue-955/15 border border-blue-500/10 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{c.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Platform Overview & Timeline Section */}
        <section className="space-y-10">
          <div className="text-center space-y-2 select-none">
            <span className="text-[10px] font-bold text-blue-450 tracking-[0.2em] uppercase">PLATFORM OVERVIEW</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                name: "OSINT Ingestion",
                desc: "Submit URLs, IPs, or domains to initiate network scans, WHOIS gathers, and port probes."
              },
              {
                step: "02",
                name: "Case Preservations",
                desc: "File digital cases, upload logs and payload evidence, and generate SHA-256 chain signatures."
              },
              {
                step: "03",
                name: "Audited Intelligence",
                desc: "Validate Indicators of Compromise (IOC) via bridges and review access logs for strict compliance."
              }
            ].map((s, idx) => (
              <div key={idx} className="glass-card rounded-xl p-6 bg-[#0d1117]/20 border border-white/5 space-y-3">
                <div className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">Triage Step {s.step}</div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{s.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platform Architecture & Specs */}
        <section className="glass-card rounded-xl p-8 bg-[#0d1117]/40 border border-white/5 grid md:grid-cols-2 gap-8 items-center text-left">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-blue-450 tracking-[0.2em] uppercase">SYSTEM ARCHITECTURE</span>
            <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wide">SOC-Grade Technical Design</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cygnal runs on a decoupled server model. OSINT scans are dispatched asynchronously using background execution workers, polling state parameters, and reporting results back to SQLite tables. Custom Threat intelligence APIs connect dynamically.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono">
              <span className="bg-black/35 border border-white/5 text-slate-400 px-2.5 py-1 rounded">Next.js 15</span>
              <span className="bg-black/35 border border-white/5 text-slate-400 px-2.5 py-1 rounded">Flask (Python)</span>
              <span className="bg-black/35 border border-white/5 text-slate-400 px-2.5 py-1 rounded">SQLite 3</span>
              <span className="bg-black/35 border border-white/5 text-slate-400 px-2.5 py-1 rounded">Tailwind CSS</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-black/25 rounded-lg border border-white/5">
              <span className="text-2xl font-black font-mono text-blue-450">&lt; 3s</span>
              <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">Ingress Latency</span>
            </div>
            <div className="p-4 bg-black/25 rounded-lg border border-white/5">
              <span className="text-2xl font-black font-mono text-white">99.9%</span>
              <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">SLA Accuracy</span>
            </div>
            <div className="p-4 bg-black/25 rounded-lg border border-white/5">
              <span className="text-2xl font-black font-mono text-white">100%</span>
              <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">Ledger Audits</span>
            </div>
            <div className="p-4 bg-black/25 rounded-lg border border-white/5">
              <span className="text-2xl font-black font-mono text-blue-450">SHA256</span>
              <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">Evidence Hash</span>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-[#060814]/40 py-6 text-center select-none">
        <span className="text-[9px] font-mono text-slate-650 uppercase tracking-widest">
          Cygnal Enterprise Incident Governance © {new Date().getFullYear()} — Secure Operations Command
        </span>
      </footer>

    </div>
  );
}
