"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Activity, Terminal, Lock, CheckCircle, Database, AlertCircle, Compass, Globe, Mail, FileText, Eye, Binary, Camera, Cpu, BarChart2, HardDrive, Layers, RefreshCw, Key } from "lucide-react";
import Hero from "@/components/ui/animated-shader-hero";
import ParticleLoader from "@/components/ui/particle-loader";
import { Sparkles } from "@/components/ui/sparkles";



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
      <ParticleLoader 
        progress={(loadingStep + 1) * 20} 
        statusMessage={loadingMessages[loadingStep]} 
      />
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
          text: "Version 3.5 Connected Integrations & Agentic Loops Active",
          icons: ["✨"]
        }}
        headline={{
          line1: "Cygnal",
          line2: ""
        }}
        subtitle="Enterprise Digital Forensics, Incident Response & OSINT Investigation Platform."
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

      {/* WHAT IS CYGNAL & PROBLEMS SOLVED */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
              Overview
            </h2>
            <h3 className="text-3xl font-black text-white tracking-tight uppercase">What is Cygnal?</h3>
            <p className="text-sm text-slate-350 leading-relaxed">
              Cygnal is an enterprise-grade cooperative security operations and digital forensics investigation cockpit. We unify multi-sensor data collection, passive threat intelligence lookup engines, document properties metadata extractions, and compliance audit trails into a single collaborative workspace.
            </p>
            <p className="text-sm text-[#a3c2b4] leading-relaxed">
              Built for high-velocity incident response, Cygnal enables security teams to collaborate on investigations in real-time, seal evidentiary indicators under cryptographic hashes, and query operational logs with a local AI assistant.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-8 bg-[#0f2422]/15 border border-[#408A71]/15 space-y-6 text-left">
            <h4 className="text-xs font-bold text-[#B0E4CC] uppercase tracking-widest font-mono">Critical Problems Solved</h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">1. Tool sprawl & context switching</h5>
                <p className="text-xs text-slate-400">Consolidates DNS registries, WHOIS data, email headers, reverse images, and malware scanning utilities inside a single browser dashboard.</p>
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">2. Loss of Custody & Untracked Evidence</h5>
                <p className="text-xs text-slate-400">Secures incident files in an immutable SHA-256 custody vault and logs all actions to a persistent chronological event ledger.</p>
              </div>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">3. Time-to-Containment Delays</h5>
                <p className="text-xs text-slate-400">Speeds up analysis using a natural-language AI copilot that cross-references system events and local databases to suggest mitigations.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IS IT BUILT FOR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
            Target Audiences
          </h2>
          <p className="text-lg font-bold text-white uppercase">Engineered for Enterprise Security Units</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left border border-white/5">
            <h3 className="text-sm font-bold text-[#B0E4CC] uppercase tracking-wider font-mono">SOC Teams</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Streamline day-to-day operations, standardise incident triage, and monitor active sensor feeds from a centralised operational command dashboard.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left border border-white/5">
            <h3 className="text-sm font-bold text-[#B0E4CC] uppercase tracking-wider font-mono">DFIR Investigators</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Extract metadata, analyze email headers, track indicators of compromise (IOCs), and upload binary hashes to maintain strict chains of custody.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left border border-white/5">
            <h3 className="text-sm font-bold text-[#B0E4CC] uppercase tracking-wider font-mono">Threat Intelligence Teams</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Audit IP reputation scores, pull domain DNS records, search WHOIS ownership data, and identify advanced persistent threats (APTs).
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left border border-white/5">
            <h3 className="text-sm font-bold text-[#B0E4CC] uppercase tracking-wider font-mono">Law Enforcement</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gather digital evidence, verify document checksums, reconstruct incident timelines, and export certified custody reports for legal submission.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left border border-white/5">
            <h3 className="text-sm font-bold text-[#B0E4CC] uppercase tracking-wider font-mono">Enterprise Security Teams</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Defend internal infrastructure, manage incident workflows, assign roles, audit access logs, and generate executive summaries for compliance.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left border border-white/5">
            <h3 className="text-sm font-bold text-[#B0E4CC] uppercase tracking-wider font-mono">Security Operations Centers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Collaborate in real-time, delegate investigation cases, verify security scores, and orchestrate policy overrides for external APIs.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT CYGNAL OFFERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
            Core Offerings
          </h2>
          <p className="text-lg font-bold text-white uppercase">What Cygnal Offers</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Database, title: "Incident Case Management", desc: "Collaboratively register, track, and delegate security incidents inside collaborative workspaces." },
            { icon: Shield, title: "Digital Forensics", desc: "Extract hidden indicators, document metadata, and digital files from evidentiary files." },
            { icon: Compass, title: "OSINT Investigation", desc: "Gather passive intelligence, WHOIS registries, and geolocation records in seconds." },
            { icon: AlertCircle, title: "Threat Intelligence", desc: "Sweep IOC patterns and auto-detect CVE links to mitigate incoming cyber hazards." },
            { icon: Globe, title: "WHOIS Lookup", desc: "Acquire domain ownership details, registrar properties, and record creation timelines." },
            { icon: Layers, title: "Header Analysis", desc: "Triage HTTP security directives, CSP policies, HSTS flags, and server configurations." },
            { icon: RefreshCw, title: "DNS Intelligence", desc: "Resolve A, AAAA, MX, NS, TXT, and CNAME histories to identify network deviations." },
            { icon: Mail, title: "Email Header Analysis", desc: "Map transmission routing hops and verify SPF, DKIM, and DMARC credentials." },
            { icon: FileText, title: "Metadata Analysis", desc: "Uncover author metrics, software watermarks, and change times in office documents." },
            { icon: Eye, title: "Reverse Image Search", desc: "Triage camera device details, visual signatures, and embedded coordinates." },
            { icon: Binary, title: "Malware Scanning", desc: "Submit payload hashes to VirusTotal sandboxes and get threat metrics reports." },
            { icon: Camera, title: "Screenshot Capture", desc: "Generate headless browser snapshots to archive suspicious landing targets." },
            { icon: Cpu, title: "AI Investigation Assistant", desc: "Interrogate case logs using natural language backed by SQLite & PostgreSQL RAG queries." },
            { icon: BarChart2, title: "Automated Reporting", desc: "Compile timeline indicators and evidence tables into presentation-ready reports." },
            { icon: HardDrive, title: "Evidence Chain of Custody", desc: "Seal uploaded binaries and document attachments with cryptographic SHA-256 stamps." },
            { icon: Activity, title: "Timeline Reconstruction", desc: "Correlate actions, sensor alerts, and case updates on a time-sorted ledger." },
            { icon: Shield, title: "Real-Time Collaboration", desc: "Collaborate with other security analysts in live case chat rooms using Socket.IO." },
            { icon: Lock, title: "Case Lease Locking", desc: "Exclusive edit lease locking prevents write race-conditions between investigators." },
            { icon: RefreshCw, title: "Celery & Redis Worker", desc: "Distributed, background scan orchestrations mapped to high-throughput queues." },
            { icon: Key, title: "TOTP MFA Security", desc: "Secure node login processes with secondary time-based one-time password challenges." }
          ].map((item, idx) => (
            <div key={idx} className="glass-card rounded-xl p-5 bg-[#0f2422]/15 text-left border border-white/5 space-y-3">
              <div className="h-9 w-9 bg-[#408A71]/10 border border-[#408A71]/20 rounded-lg flex items-center justify-center text-[#B0E4CC]">
                <item.icon size={16} />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{item.title}</h4>
              <p className="text-[11px] text-slate-455 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUSTED BY / SPARKLES VALIDATION BANNER */}
      <section className="relative overflow-hidden w-full bg-[#091413] pt-20 pb-28 border-t border-white/5 select-none z-10 flex flex-col items-center">
        <div className="max-w-4xl mx-auto w-full px-6 text-center space-y-8">
          <div className="text-center space-y-3 font-mono cursor-default group">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-350 transition-all duration-300">
              <span className="bg-gradient-to-r from-[#B0E4CC] to-[#408A71] bg-clip-text text-transparent group-hover:from-white group-hover:to-[#B0E4CC] transition-all duration-350">
                Trusted by Global Intelligence Units
              </span>
            </h2>
            <p className="text-[#a3c2b4]/70 tracking-widest uppercase text-[10px] sm:text-xs group-hover:text-[#B0E4CC] transition-colors duration-350">
              deployed across critical enterprise security operations centers
            </p>
          </div>
          
          {/* Sparkles Box */}
          <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-[#408A71]/15 bg-[#0f2422]/10 flex flex-col justify-center items-center group transition-all duration-500 hover:border-[#408A71]/40 hover:bg-[#0f2422]/15 hover:shadow-[0_0_30px_rgba(64,138,113,0.12)]">
            <div className="absolute inset-0 bg-gradient-to-t from-[#091413] via-transparent to-transparent pointer-events-none z-10" />
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[120%] h-36 rounded-full bg-[radial-gradient(circle_at_center,rgba(64,138,113,0.12)_0%,transparent_75%)] blur-xl pointer-events-none group-hover:bg-[radial-gradient(circle_at_center,rgba(176,228,204,0.2)_0%,transparent_75%)] transition-all duration-500" />
            
            <Sparkles 
              density={400} 
              speed={0.6} 
              size={1.1} 
              color="#B0E4CC" 
              hover={true} 
              className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80" 
            />
            
            {/* Badges */}
            <div className="z-10 flex flex-wrap justify-center items-center gap-6 sm:gap-10 opacity-50 group-hover:opacity-90 transition-opacity duration-500 px-6">
              <div className="flex items-center gap-2 text-[9px] font-mono text-[#B0E4CC] tracking-widest uppercase">
                <Shield className="w-4 h-4 text-[#B0E4CC]" /> SOC 2 TYPE II
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-[#B0E4CC] tracking-widest uppercase">
                <Lock className="w-4 h-4 text-[#B0E4CC]" /> FIPS 140-3
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-[#B0E4CC] tracking-widest uppercase">
                <Activity className="w-4 h-4 text-[#B0E4CC]" /> ISO/IEC 27001
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-[#B0E4CC] tracking-widest uppercase">
                <CheckCircle className="w-4 h-4 text-[#B0E4CC]" /> COMMON CRITERIA
              </div>
            </div>
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
