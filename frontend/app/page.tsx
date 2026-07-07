"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, ArrowRight, Activity, Terminal, Lock, CheckCircle, Database, AlertCircle, Compass } from "lucide-react";

export default function MarketingLandingPage() {
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "Establishing SSL cryptographic handshake...",
    "Querying local relational database structures...",
    "Verifying ledger audit signatures...",
    "Synchronizing multi-sensor scanner modules...",
    "Platform online. Establishing session tunnel..."
  ];

  useEffect(() => {
    // Increment loading message steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingMessages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 900);

    // Complete loader after 5 seconds
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      clearInterval(stepInterval);
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden">
        {/* Decorative ambient gradient */}
        <div className="absolute w-[400px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <div className="space-y-6 text-center z-10 max-w-sm">
          {/* Animated Glowing Icon */}
          <div className="relative flex items-center justify-center mx-auto w-16 h-16 rounded-2xl bg-blue-950/20 border border-blue-500/15 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
            <Shield className="w-8 h-8 text-blue-500 animate-pulse" />
            <div className="absolute inset-0 rounded-2xl border border-dashed border-blue-400/20 animate-spin" style={{ animationDuration: '8s' }} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-white font-mono">
              Cygnal Sentinel
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              Operational Handshake Active
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-900/60 h-1 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-700" 
              style={{ width: `${(loadingStep + 1) * 20}%` }}
            />
          </div>

          {/* Log steps */}
          <div className="h-10 flex items-center justify-center">
            <span className="text-[10px] font-mono text-blue-400/80 tracking-wide animate-pulse">
              {loadingMessages[loadingStep]}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between font-sans relative selection:bg-blue-500/30 selection:text-blue-300">
      
      {/* Background radial overlays */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-blue-950/10 via-indigo-950/5 to-transparent pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-[150px] pointer-events-none" />

      {/* STICKY HEADER NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#030712]/70 backdrop-blur-md transition-all select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-bold tracking-[0.25em] text-white uppercase font-sans">
              Cygnal
            </span>
          </div>
          
          <nav className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-[11px] font-semibold tracking-wider text-slate-400 hover:text-white uppercase px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="btn-cyber-primary py-2 px-4.5 text-[11px] font-semibold tracking-wider"
            >
              Enlist Node
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center select-none space-y-8 z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950/20 border border-blue-500/10 rounded-full text-[10px] font-mono text-blue-400 tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
          Version 1.0 Cockpit Active
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase max-w-4xl mx-auto leading-[1.1] font-sans">
          Cooperative Threat Forensics <br />
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Sealed under Audit Custody
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Aggregating passive multi-sensor network diagnostics, document properties metadata extractions, and timeline incident cases inside a unified workspace.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
          <Link 
            href="/register" 
            className="btn-cyber-primary px-8 py-4 text-xs font-bold tracking-widest flex items-center gap-2 group w-full sm:w-auto justify-center"
          >
            Launch Sentinel Node <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link 
            href="/login" 
            className="btn-cyber px-8 py-4 text-xs font-semibold tracking-widest uppercase w-full sm:w-auto text-center"
          >
            Sign In to Workspace
          </Link>
        </div>
      </section>

      {/* CAPABILITIES / FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-blue-550 uppercase tracking-widest font-mono">
            Platform Capabilities
          </h2>
          <p className="text-lg font-bold text-white uppercase">Aggregated Forensics & Custody Matrix</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 bg-[#0b0f19]/45 space-y-4 text-left">
            <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Terminal size={18} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">10 Security Multi-Sensors</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify header directives, map DNS change histories, sweep port channels, and submit payload metrics to malware sandboxes.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 bg-[#0b0f19]/45 space-y-4 text-left">
            <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
              <Database size={18} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Incident Custody Seals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every document attachment and timeline update triggers cryptographic hashes log records to maintain chains of custody.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 bg-[#0b0f19]/45 space-y-4 text-left">
            <div className="h-10 w-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
              <Activity size={18} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">RAG AI Centric Copilot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Interrogate your local databases using standard English. Retrieve matching DNS lookups and correlate timeline indicators.
            </p>
          </div>
        </div>
      </section>

      {/* TEAM ROLE ALIGNMENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-blue-550 uppercase tracking-widest font-mono">
            Role Orchestrations
          </h2>
          <p className="text-lg font-bold text-white uppercase">Tailored Workspace Experiences</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/35 text-left space-y-2">
            <span className="text-[9px] font-bold text-blue-450 uppercase tracking-widest font-mono block">SOC Managers</span>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">Delegate incident workloads, configure team permissions, and monitor telemetry lines.</p>
          </div>
          <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/35 text-left space-y-2">
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono block">Threat Intel Leads</span>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">Monitor IP reputation feeds, aggregate WHOIS registries, and audit external domains.</p>
          </div>
          <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/35 text-left space-y-2">
            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest font-mono block">DFIR Investigators</span>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">Upload evidence files, review custody logs, and compile presentation-ready reports.</p>
          </div>
          <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/35 text-left space-y-2">
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest font-mono block">Compliance Auditors</span>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">Verify forensic timeline custody signatures and audit security scores.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 select-none z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
            SSL Cryptographic Handshake Active
          </span>
          <span className="text-[10px] text-slate-500">
            © 2026 Cygnal Operations. All rights reserved.
          </span>
        </div>
      </footer>

    </div>
  );
}
