"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Hero from "@/components/ui/animated-shader-hero";
import { Shield, ArrowRight, Activity, Terminal, Lock, CheckCircle, Database, AlertCircle, Compass } from "lucide-react";


export default function MarketingLandingPage() {
  const router = useRouter();
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
      <div className="min-h-screen bg-[#091413] text-slate-100 flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden">
        {/* Decorative ambient gradient */}
        <div className="absolute w-[400px] h-[400px] bg-[#408A71]/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <div className="space-y-6 text-center z-10 max-w-sm">
          {/* Animated Glowing Icon */}
          <div className="relative flex items-center justify-center mx-auto w-16 h-16 rounded-2xl bg-[#285A48]/20 border border-[#408A71]/15 shadow-[0_0_30px_rgba(64,138,113,0.1)]">
            <Shield className="w-8 h-8 text-[#B0E4CC] animate-pulse" />
            <div className="absolute inset-0 rounded-2xl border border-dashed border-[#B0E4CC]/20 animate-spin" style={{ animationDuration: '8s' }} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xs font-bold tracking-[0.3em] uppercase text-white font-mono">
              Cygnal
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              Operational Handshake Active
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#091413]/60 h-1 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div 
              className="bg-[#408A71] h-full rounded-full transition-all duration-700" 
              style={{ width: `${(loadingStep + 1) * 20}%` }}
            />
          </div>

          {/* Log steps */}
          <div className="h-10 flex items-center justify-center">
            <span className="text-[10px] font-mono text-[#B0E4CC]/80 tracking-wide animate-pulse">
              {loadingMessages[loadingStep]}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const handlePrimaryClick = () => {
    router.push("/register");
  };

  const handleSecondaryClick = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#091413] text-slate-100 flex flex-col justify-between font-sans relative selection:bg-[#408A71]/30 selection:text-[#B0E4CC]">
      
      {/* Background radial overlays */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-[#285A48]/10 via-[#091413]/5 to-transparent pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#408A71]/[0.02] rounded-full blur-[150px] pointer-events-none" />

      {/* STICKY HEADER NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#091413]/70 backdrop-blur-md transition-all select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-[#408A71]" />
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
      <Hero
        trustBadge={{
          text: "Version 1.0 Cockpit Active",
          icons: ["✨"]
        }}
        headline={{
          line1: "Cooperative Forensics",
          line2: "Audit Custody Seals"
        }}
        subtitle="Aggregating passive multi-sensor network diagnostics, document properties metadata extractions, and timeline incident cases inside a unified workspace."
        buttons={{
          primary: {
            text: "Launch Cygnal Workspace",
            onClick: handlePrimaryClick
          },
          secondary: {
            text: "Sign In to Workspace",
            onClick: handleSecondaryClick
          }
        }}
      />

      {/* CAPABILITIES / FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
            Platform Capabilities
          </h2>
          <p className="text-lg font-bold text-white uppercase">Aggregated Forensics & Custody Matrix</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left">
            <div className="h-10 w-10 bg-[#408A71]/10 border border-[#408A71]/20 rounded-xl flex items-center justify-center text-[#B0E4CC]">
              <Terminal size={18} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">10 Security Multi-Sensors</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify header directives, map DNS change histories, sweep port channels, and submit payload metrics to malware sandboxes.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left">
            <div className="h-10 w-10 bg-[#285A48]/10 border border-[#285A48]/20 rounded-xl flex items-center justify-center text-[#B0E4CC]">
              <Database size={18} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Incident Custody Seals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every document attachment and timeline update triggers cryptographic hashes log records to maintain chains of custody.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left">
            <div className="h-10 w-10 bg-[#408A71]/10 border border-[#408A71]/20 rounded-xl flex items-center justify-center text-[#B0E4CC]">
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
          <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
            Role Orchestrations
          </h2>
          <p className="text-lg font-bold text-white uppercase">Tailored Workspace Experiences</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-xl p-5 bg-[#0f2422]/20 text-left space-y-2">
            <span className="text-[9px] font-bold text-[#B0E4CC] uppercase tracking-widest font-mono block">SOC Managers</span>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">Delegate incident workloads, configure team permissions, and monitor telemetry lines.</p>
          </div>
          <div className="glass-card rounded-xl p-5 bg-[#0f2422]/20 text-left space-y-2">
            <span className="text-[9px] font-bold text-[#B0E4CC] uppercase tracking-widest font-mono block">Threat Intel Leads</span>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">Monitor IP reputation feeds, aggregate WHOIS registries, and audit external domains.</p>
          </div>
          <div className="glass-card rounded-xl p-5 bg-[#0f2422]/20 text-left space-y-2">
            <span className="text-[9px] font-bold text-[#B0E4CC] uppercase tracking-widest font-mono block">DFIR Investigators</span>
            <p className="text-[11.5px] text-slate-400 leading-relaxed">Upload evidence files, review custody logs, and compile presentation-ready reports.</p>
          </div>
          <div className="glass-card rounded-xl p-5 bg-[#0f2422]/20 text-left space-y-2">
            <span className="text-[9px] font-bold text-[#408A71] uppercase tracking-widest font-mono block">Compliance Auditors</span>
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
