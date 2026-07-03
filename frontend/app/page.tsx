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
  ChevronRight,
  Layers,
  FolderLock,
  Search,
  MessageSquare,
  FileText,
  Workflow,
  Globe
} from "lucide-react";

const LoginForm = dynamic(() => import("@/components/LoginForm"), { ssr: false });
const RegisterForm = dynamic(() => import("@/components/RegisterForm"), { ssr: false });

export default function Home() {
  const { user, loadUserFromStorage } = useAuthStore();
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingFinished, setLoadingFinished] = useState(false);
  const [activeTab, setActiveTab] = useState("scans");

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Visual Entrance Handshake Sequence
  useEffect(() => {
    if (user) {
      setLoadingFinished(true);
      return;
    }
    const interval = setInterval(() => {
      setLoadingPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setLoadingFinished(true), 400);
          return 100;
        }
        return prev + 4;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [user]);

  if (user) {
    return (
      <DashboardShell>
        <ScannersConsole />
      </DashboardShell>
    );
  }

  const platformTabs = {
    scans: {
      title: "Asynchronous OSINT Scanners",
      desc: "Execute 10 active security tools covering port checks, WHOIS indices, and domain lookups.",
      preview: (
        <div className="p-4 bg-slate-950/70 border border-white/5 rounded-lg font-mono text-[10px] text-slate-400 space-y-2">
          <div className="text-blue-450 font-bold border-b border-white/5 pb-1 select-none">CYGNAL_CONSOLE_PROBE: /api/lookups</div>
          <div className="flex gap-2">
            <span className="text-slate-550">example.com</span>
            <span className="text-emerald-450">[RESOLVED]</span>
            <span className="text-slate-600">IP: 93.184.216.34</span>
          </div>
          <div className="text-slate-500">Port 80 (HTTP) -> OPEN | Port 443 (HTTPS) -> OPEN</div>
        </div>
      )
    },
    cases: {
      title: "Incident Incident Ledger",
      desc: "Compile indicators of compromise, set priority severities, and assign analysts to cases.",
      preview: (
        <div className="p-4 bg-slate-950/70 border border-white/5 rounded-lg text-xs space-y-3">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-550 border-b border-white/5 pb-1.5 select-none">
            <span>CASE #0412</span>
            <span className="badge-critical text-[8px]">Critical</span>
          </div>
          <h4 className="font-bold text-white uppercase font-sans tracking-wide">Server Ingress Compromise</h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">Investigating suspicious subdomains mapping patterns.</p>
        </div>
      )
    },
    evidence: {
      title: "Forensic Evidence Vault",
      desc: "Store documents and logs payload parameters with instant SHA-256 validation seals checks.",
      preview: (
        <div className="p-4 bg-slate-950/70 border border-white/5 rounded-lg font-mono text-[10px] text-slate-400 space-y-2">
          <div className="text-blue-450 font-bold border-b border-white/5 pb-1 select-none">VAULT_LEDGER_SEAL: /api/cases/evidence</div>
          <div>File: <span className="text-white">payload_audit.pcap</span> (1.4 MB)</div>
          <div>Hash: <span className="text-cyan-400">a6c8e312b9d04fc4...</span></div>
          <div className="text-emerald-400">[VERIFIED SEALED]</div>
        </div>
      )
    }
  };

  if (!loadingFinished) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="w-full max-w-[320px] space-y-4 text-center">
          <div className="flex justify-center mb-2">
            <Shield className="w-10 h-10 text-blue-500 animate-pulse" />
          </div>
          <h2 className="text-xs font-bold tracking-[0.25em] text-white uppercase">Initializing Cygnal</h2>
          <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-100"
              style={{ width: `${loadingPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-550 uppercase tracking-widest">{loadingPercent}% Securing Handshake</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100 font-sans flex flex-col justify-between overflow-x-hidden">
      
      {/* Background Grids */}
      <div className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-[#030712]/40" />
        <div className="absolute top-[15%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-955/5 blur-[140px] opacity-60" />
      </div>

      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-nav select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-bold tracking-[0.2em] text-white uppercase font-sans">
              Cygnal SOC
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition">Capabilities</a>
            <a href="#workflows" className="hover:text-white transition">Workflows</a>
            <a href="#integrations" className="hover:text-white transition">Integrations</a>
          </nav>

          <a 
            href="#gateway"
            className="btn-cyber-primary text-xs font-medium py-2 px-4.5"
          >
            Access Gateway <ArrowRight size={13} className="ml-1" />
          </a>
        </div>
      </header>

      {/* Hero & Login Splitted Grid */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 pt-32 pb-16 space-y-28 select-none">
        
        <section className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero details */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/10 bg-blue-950/10 px-3.5 py-1 text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
              Automated SecOps & Reconnaissance
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Reconnaissance
              <span className="block text-slate-500 text-2xl sm:text-3xl font-light uppercase tracking-[0.25em] mt-3">
                & Incident Ingest
              </span>
            </h1>

            <p className="max-w-md text-sm text-slate-450 leading-relaxed font-sans">
              Coordinate subdomain sweeps, verify digital payloads under SHA-256 seals, and map operational incident timelines inside compliance trail loggers.
            </p>

            <div className="flex gap-4 pt-2">
              <a href="#gateway" className="btn-cyber-primary py-3 px-6 tracking-wide text-xs">
                INITIALIZE PORTAL <ArrowRight size={13} className="ml-1.5" />
              </a>
              <a
                href="#features"
                className="btn-cyber py-3 px-6 tracking-wide text-xs"
              >
                PLATFORM DEMO <ChevronRight size={13} className="ml-1" />
              </a>
            </div>
          </div>

          {/* Login/Signup forms tab */}
          <div id="gateway" className="lg:col-span-5 w-full">
            <div className="glass-card rounded-xl p-6 bg-[#0b0f19]/70 border border-white/5 shadow-2xl relative overflow-hidden">
              <LoginForm />
            </div>
          </div>

        </section>

        {/* Dynamic Carousel / Platform Tabs */}
        <section id="features" className="space-y-8 select-none">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-bold text-blue-455 tracking-[0.2em] uppercase">PLATFORM MODULES</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
              Orchestrated Workspaces
            </h2>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left selector */}
            <div className="lg:col-span-5 space-y-3.5 flex flex-col justify-center">
              {Object.entries(platformTabs).map(([key, tab]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    activeTab === key
                      ? "bg-blue-500/10 border-blue-500/30 text-white"
                      : "bg-[#0b0f19]/30 border-white/5 text-slate-400 hover:bg-[#0b0f19]/60"
                  }`}
                >
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider">{tab.title}</h3>
                  <p className="text-xs text-slate-550 mt-1.5 leading-relaxed">{tab.desc}</p>
                </button>
              ))}
            </div>

            {/* Right preview */}
            <div className="lg:col-span-7 flex items-center justify-center p-6 bg-[#0b0f19]/25 border border-white/5 rounded-xl min-h-[220px]">
              <div className="w-full max-w-md">
                {platformTabs[activeTab as keyof typeof platformTabs].preview}
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Timeline Section */}
        <section id="workflows" className="space-y-10">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-bold text-blue-455 tracking-[0.2em] uppercase">TRIAGE PROCESS</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
              Forensic Lifespans
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                name: "OSINT Sweeps",
                desc: "Scan targets for subdomain routes, active TCP ports, and WHOIS registries."
              },
              {
                step: "02",
                name: "Incident Logs",
                desc: "File secure case cards, assign assigned analysts, and append audit notes."
              },
              {
                step: "03",
                name: "Cryptographic Seals",
                desc: "Register evidence log documents, verify SHA-256 hashes, and log trails."
              }
            ].map((s, idx) => (
              <div key={idx} className="glass-card rounded-xl p-6 bg-[#0b0f19]/35 border border-white/5 space-y-3">
                <div className="text-xs font-mono font-bold text-blue-455 uppercase tracking-widest">Pipeline Step {s.step}</div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{s.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations matrix */}
        <section id="integrations" className="glass-card rounded-xl p-8 bg-[#0b0f19]/30 border border-white/5 grid md:grid-cols-2 gap-8 items-center text-left">
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-blue-455 tracking-[0.2em] uppercase">INTEGRATIONS</span>
            <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wide">SOC integrations Matrix</h3>
            <p className="text-xs text-slate-450 leading-relaxed">
              Cygnal operates a pluggable architecture connector interface to link active scans alerts and telemetry indicators to common platforms like Slack, Sentinel, AWS, and Jira.
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono select-none">
              <span className="bg-black/35 border border-white/5 text-slate-400 px-2.5 py-1 rounded">Sentinel</span>
              <span className="bg-black/35 border border-white/5 text-slate-400 px-2.5 py-1 rounded">AWS S3</span>
              <span className="bg-black/35 border border-white/5 text-slate-400 px-2.5 py-1 rounded">Jira Software</span>
              <span className="bg-black/35 border border-white/5 text-slate-400 px-2.5 py-1 rounded">Slack Webhooks</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center select-none font-mono">
            <div className="p-4 bg-black/25 rounded-lg border border-white/5">
              <span className="text-2xl font-black text-blue-455">&lt; 3s</span>
              <span className="block text-[8px] text-slate-500 uppercase tracking-widest mt-1">Worker Triage</span>
            </div>
            <div className="p-4 bg-black/25 rounded-lg border border-white/5">
              <span className="text-2xl font-black text-white">100%</span>
              <span className="block text-[8px] text-slate-500 uppercase tracking-widest mt-1">Audit Ledger</span>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-[#030712]/40 py-6 text-center select-none">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          Cygnal Incident Governance © {new Date().getFullYear()} — Secure Operations Control
        </span>
      </footer>

    </div>
  );
}
