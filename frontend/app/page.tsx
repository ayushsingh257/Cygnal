"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield, ArrowRight, Activity, Terminal, Lock, CheckCircle,
  Database, AlertCircle, Compass, Globe, Mail, FileText, Eye,
  Binary, Camera, Cpu, BarChart2, HardDrive, Layers, RefreshCw,
  Key, Fingerprint, Network, Radar, Search, Zap, Server,
  ShieldCheck, Users, GitBranch, FlaskConical, BookOpen
} from "lucide-react";
import Hero from "@/components/ui/animated-shader-hero";
import ParticleLoader from "@/components/ui/particle-loader";
import { Sparkles } from "@/components/ui/sparkles";
import { GooeyText } from "@/components/ui/gooey-text-morphing";
import { FinancialScoreCards } from "@/components/ui/financial-score-cards";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import { Radar as RadarEffect, IconContainer } from "@/components/ui/radar-effect";

export default function MarketingLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "Establishing SSL cryptographic handshake...",
    "Loading Enterprise Identity subsystem (v4.0)...",
    "Initialising Threat Intelligence connectors...",
    "Verifying ledger audit signatures...",
    "Platform online — Cygnal v4.0 ready.",
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) =>
        prev < loadingMessages.length - 1 ? prev + 1 : prev
      );
    }, 900);
    const timer = setTimeout(() => setLoading(false), 5000);
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

  const handlePrimaryClick = () => router.push("/register");
  const handleSecondaryClick = () => router.push("/login");

  const orbitalTimelineData = [
    {
      id: 1,
      title: "OIDC Federation",
      date: "Phase 1",
      content: "Authenticate user sessions via Microsoft Entra ID OIDC or SAML 2.0. Group attributes map automatically to platform roles.",
      category: "Identity",
      icon: ShieldCheck,
      relatedIds: [2],
      status: "completed" as const,
      energy: 90,
    },
    {
      id: 2,
      title: "IOC Extractor",
      date: "Phase 2",
      content: "Concurrent extraction of IP addresses, domain names, hashes, and emails using regular expressions on inbound raw events.",
      category: "Extraction",
      icon: Search,
      relatedIds: [1, 3],
      status: "completed" as const,
      energy: 100,
    },
    {
      id: 3,
      title: "Parallel Enrichment",
      date: "Phase 2",
      content: "Aggregated threat scores from 8 parallel intelligence providers (AbuseIPDB, VT, Shodan) with weighted confidence.",
      category: "Enrichment",
      icon: Radar,
      relatedIds: [2, 4],
      status: "completed" as const,
      energy: 95,
    },
    {
      id: 4,
      title: "Semantic memory",
      date: "Phase 3",
      content: "Pure-python 128-dimensional TF-IDF vector database matching current indicators against historical security logs.",
      category: "RAG Search",
      icon: Database,
      relatedIds: [3, 5],
      status: "completed" as const,
      energy: 85,
    },
    {
      id: 5,
      title: "Multi-Agent HUD",
      date: "Phase 3",
      content: "Multi-agent planning layout showcasing autonomous agent status checking, DNS checks, compiler triages, and log exports.",
      category: "Orchestration",
      icon: Cpu,
      relatedIds: [4],
      status: "completed" as const,
      energy: 90,
    },
  ];

  /* ─── data ─────────────────────────────────────────────────────────── */

  const phase1Features = [
    {
      icon: Fingerprint,
      title: "Microsoft Entra ID SSO",
      desc: "Federated OIDC login via Microsoft Entra ID. Provider-agnostic adapter supports Okta, Keycloak, Google Workspace, and Ping Identity.",
    },
    {
      icon: ShieldCheck,
      title: "SAML 2.0 Federation",
      desc: "Enterprise SAML 2.0 assertion parsing for legacy SSO compatibility alongside modern OIDC flows.",
    },
    {
      icon: RefreshCw,
      title: "Zero Trust Session Management",
      desc: "Per-request JWT validation with session revocation, refresh token rotation, and centralized revocation lists.",
    },
    {
      icon: Users,
      title: "Directory Group Mapping",
      desc: "Configurable registry maps external AD/Entra groups to Cygnal roles. No hardcoded provider logic.",
    },
    {
      icon: Server,
      title: "Service Accounts",
      desc: "Least-privilege machine credentials with bcrypt-hashed secrets, scoped permissions, and expiry enforcement.",
    },
    {
      icon: BookOpen,
      title: "Structured Audit Logging",
      desc: "Every auth event — login, logout, refresh, revocation, failed SSO — logged with correlation IDs and structured JSON.",
    },
  ];

  const phase2Features = [
    {
      icon: Radar,
      title: "VirusTotal",
      desc: "IP, domain, URL, and file hash enrichment via VirusTotal v3. Malicious vote aggregation with weighted confidence scoring.",
    },
    {
      icon: Network,
      title: "Shodan",
      desc: "Host info, open port enumeration, CVE detection, and ISP/ASN attribution from live Shodan records.",
    },
    {
      icon: AlertCircle,
      title: "AbuseIPDB",
      desc: "IP abuse confidence score with report category-to-tag mapping. 90-day rolling lookups.",
    },
    {
      icon: Globe,
      title: "AlienVault OTX",
      desc: "Pulse-based threat intelligence across IP, domain, URL, and file hashes. Campaign and malware family tagging.",
    },
    {
      icon: Zap,
      title: "ThreatFox & URLHaus",
      desc: "Abuse.ch free-tier IOC search and URL blacklist lookups. Always-on with no API key required.",
    },
    {
      icon: Search,
      title: "Censys",
      desc: "Host surface discovery with label-based C2 and scanner detection. Architecture-ready; degrades gracefully without credentials.",
    },
    {
      icon: Database,
      title: "MISP Integration",
      desc: "REST attribute search across MISP instances. TLP taxonomy and threat label parsing for verdict inference.",
    },
    {
      icon: GitBranch,
      title: "STIX/TAXII",
      desc: "Full STIX 2.x bundle parser and TAXII 2.1 collection client. Extracts IP, domain, URL, MD5, SHA-1, and SHA-256 patterns.",
    },
    {
      icon: FlaskConical,
      title: "Parallel Enrichment Engine",
      desc: "Fan-out concurrent queries across all providers. Weighted confidence aggregation and 6-hour result caching.",
    },
  ];

  const coreOfferings = [
    { icon: Database, title: "Incident Case Management", desc: "Collaboratively register, track, and delegate security incidents inside collaborative workspaces." },
    { icon: Shield, title: "Digital Forensics", desc: "Extract hidden indicators, document metadata, and digital files from evidentiary files." },
    { icon: Compass, title: "OSINT Investigation", desc: "Gather passive intelligence, WHOIS registries, and geolocation records in seconds." },
    { icon: AlertCircle, title: "Threat Intelligence", desc: "8-provider parallel IOC enrichment with confidence scoring and verdict aggregation." },
    { icon: Globe, title: "WHOIS Lookup", desc: "Acquire domain ownership details, registrar properties, and record creation timelines." },
    { icon: Layers, title: "HTTP Header Analysis", desc: "Triage CSP policies, HSTS flags, X-Frame-Options, and server fingerprints." },
    { icon: RefreshCw, title: "DNS Intelligence", desc: "Resolve A, AAAA, MX, NS, TXT, and CNAME histories to identify network deviations." },
    { icon: Mail, title: "Email Header Analysis", desc: "Map transmission routing hops and verify SPF, DKIM, and DMARC credentials." },
    { icon: FileText, title: "Metadata Analysis", desc: "Uncover author metrics, software watermarks, and change timestamps in office documents." },
    { icon: Eye, title: "Reverse Image Search", desc: "Triage camera device details, visual signatures, and embedded GPS coordinates." },
    { icon: Binary, title: "Malware Scanning", desc: "Submit payload hashes across 8 threat intelligence providers for cross-platform verdict." },
    { icon: Camera, title: "Screenshot Capture", desc: "Generate headless browser snapshots to archive suspicious landing targets." },
    { icon: Cpu, title: "AI Investigation Assistant", desc: "Interrogate case logs using natural language backed by RAG queries." },
    { icon: BarChart2, title: "Automated Reporting", desc: "Compile timeline indicators and evidence tables into presentation-ready reports." },
    { icon: HardDrive, title: "Evidence Chain of Custody", desc: "Seal uploaded binaries and document attachments with cryptographic SHA-256 stamps." },
    { icon: Activity, title: "Timeline Reconstruction", desc: "Correlate actions, sensor alerts, and case updates on a time-sorted ledger." },
    { icon: Shield, title: "Real-Time Collaboration", desc: "Collaborate with security analysts in live case chat rooms using Socket.IO." },
    { icon: Lock, title: "Case Lease Locking", desc: "Exclusive edit lease locking prevents write race-conditions between investigators." },
    { icon: Fingerprint, title: "Enterprise SSO", desc: "Microsoft Entra ID OIDC, SAML 2.0, and provider-agnostic identity adapter." },
    { icon: Key, title: "TOTP MFA Security", desc: "Secondary time-based one-time password challenges for every login node." },
  ];

  /* ─── render ────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#091413] text-slate-100 flex flex-col justify-between font-sans relative selection:bg-[#408A71]/30 selection:text-[#B0E4CC]">

      {/* Background radial overlays */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-[#285A48]/10 via-[#091413]/5 to-transparent pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#408A71]/[0.02] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[60%] right-[5%] w-[400px] h-[400px] bg-[#285A48]/[0.015] rounded-full blur-[120px] pointer-events-none" />

      {/* ─── STICKY NAVBAR ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#091413]/70 backdrop-blur-md transition-all select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-[#408A71]" />
            <span className="text-xs font-bold tracking-[0.25em] text-white uppercase font-sans">
              Cygnal
            </span>
            <span className="hidden sm:inline text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-1.5 py-0.5 rounded tracking-widest">
              v4.0
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

      {/* ─── HERO ───────────────────────────────────────────────────────── */}
      <Hero
        trustBadge={{
          text: "v4.0 — Enterprise Identity & Threat Intelligence Platform",
          icons: ["✨"],
        }}
        headline={{
          line1: "Cygnal",
          line2: "",
        }}
        subtitle="Enterprise Security Operations, Digital Forensics & Threat Intelligence Platform v4.0"
        buttons={{
          primary: { text: "Launch Cygnal Workspace", onClick: handlePrimaryClick },
          secondary: { text: "Sign In to Workspace", onClick: handleSecondaryClick },
        }}
      />

      {/* ─── V4.0 RELEASE BANNER ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 select-none relative z-10">
        <div className="glass-panel rounded-2xl px-6 py-5 border border-[#408A71]/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-9 w-9 shrink-0 bg-[#408A71]/10 border border-[#408A71]/25 rounded-xl flex items-center justify-center text-[#B0E4CC]">
            <Zap size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#408A71] uppercase tracking-widest font-mono mb-0.5">
              What&apos;s New in v4.0
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cygnal v4.0 introduces <span className="text-[#B0E4CC] font-semibold">Enterprise Identity &amp; Authentication</span> (Phase 1) and a{" "}
              <span className="text-[#B0E4CC] font-semibold">8-Provider Threat Intelligence Platform</span> (Phase 2) — built for Fortune 500 SOC environments.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[9px] font-mono text-[#B0E4CC] bg-[#408A71]/10 border border-[#408A71]/20 px-2 py-1 rounded tracking-widest uppercase">Phase 1 ✓</span>
            <span className="text-[9px] font-mono text-[#B0E4CC] bg-[#408A71]/10 border border-[#408A71]/20 px-2 py-1 rounded tracking-widest uppercase">Phase 2 ✓</span>
            <span className="text-[9px] font-mono text-[#B0E4CC] bg-[#408A71]/10 border border-[#408A71]/20 px-2 py-1 rounded tracking-widest uppercase">Phase 3 ✓</span>
          </div>
        </div>
      </section>

      {/* ─── GOOEY TEXT FOCUSED INTRO ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center relative z-10 select-none">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#408A71] mb-2">Automated Incident Triage</p>
        <GooeyText
          texts={["RECON & OSINT", "MALWARE SWEEP", "IDENTITY AUDIT", "EVIDENCE CUSTODY", "AI COPILOT"]}
          morphTime={1.2}
          cooldownTime={0.4}
          className="font-bold font-mono text-green-400"
        />
      </section>

      {/* ─── SECTION 1: WHY CYGNAL EXISTS (THE PAIN) ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 select-none border-t border-white/5">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
              The Security Challenge
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">Unifying the Incident Workspace</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Traditional threat investigations require analysts to constantly cycle between fragmented tools: manual VirusTotal lookups, Shodan queries, WHOIS parsers, document metadata extractors, email header triages, and copy-pasting notes into static reports.
            </p>
            <p className="text-sm text-[#a3c2b4] leading-relaxed">
              <strong>Cygnal unifies all of these capabilities</strong> into one collaborative, audit-compliant security operations cockpit, backing your investigators with automated intelligence enrichment and cryptographic custody guarantees.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Before (Traditional Chaos) */}
            <div className="glass-panel rounded-2xl p-6 border border-red-500/10 bg-red-950/5 text-left space-y-4">
              <div className="flex items-center gap-2 text-red-400 font-mono text-xs uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                Traditional Tool Sprawl
              </div>
              <ul className="space-y-2 text-[11px] text-slate-400">
                <li className="flex items-center gap-2">❌ 10+ browser tabs open per alert</li>
                <li className="flex items-center gap-2">❌ Disconnected copy-pasting of IOCs</li>
                <li className="flex items-center gap-2">❌ Unsigned evidence files in local folders</li>
                <li className="flex items-center gap-2">❌ Slow manual reporting cycles</li>
                <li className="flex items-center gap-2">❌ No historical case correlation</li>
              </ul>
            </div>

            {/* After (Cygnal Harmony) */}
            <div className="glass-panel rounded-2xl p-6 border border-[#408A71]/20 bg-[#0f2422]/10 text-left space-y-4">
              <div className="flex items-center gap-2 text-green-400 font-mono text-xs uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Cygnal Workspace Harmony
              </div>
              <ul className="space-y-2 text-[11px] text-slate-350">
                <li className="flex items-center gap-2">✅ One unified browser dashboard</li>
                <li className="flex items-center gap-2">✅ Parallel 8-provider threat enrichment</li>
                <li className="flex items-center gap-2">✅ Signed SHA-256 evidence chain</li>
                <li className="flex items-center gap-2">✅ AI Copilot automated report engine</li>
                <li className="flex items-center gap-2">✅ SQLite vector memory search</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: INVESTIGATION WORKFLOW ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 select-none border-t border-white/5">
        <div className="text-center space-y-2 mb-8">
          <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            Interactive Node Map
          </span>
          <h2 className="text-2xl font-bold text-white uppercase font-sans">The Automated Investigation Loop</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Click on nodes within the orbital tracker to view active stage metrics, connected pipelines, and execution data.
          </p>
        </div>

        <RadialOrbitalTimeline timelineData={orbitalTimelineData} />
      </section>

      {/* ─── SECTION 3: PLATFORM ARCHITECTURE ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 select-none border-t border-white/5">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
              Architecture Blueprint
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">High-Performance Pipeline</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Cygnal is engineered as a decoupled application. The Next.js frontend connects via REST and Socket.IO real-time pipelines to our Flask API server.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-350">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
                Dual DB Dialect (SQLite Local / PostgreSQL Prod)
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-350">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
                Pure-Python 128-dimensional TF-IDF Vectorizer
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-350">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
                Token revocation registries &amp; sliding rate limits
              </div>
            </div>
          </div>

          {/* Dynamic Node Diagram */}
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-[#408A71]/15 bg-[#0f2422]/5">
            <p className="text-[10px] font-bold text-[#B0E4CC] font-mono uppercase tracking-widest mb-6 text-left">🌐 System Data Flow Blueprint</p>
            <div className="flex flex-col gap-3 font-mono text-[10px]">
              {[
                { label: "Browser (TypeScript + Next.js)", color: "border-[#408A71]/30 text-white" },
                { label: "↳ API Layer (Flask + Gevent-WebSocket)", color: "border-[#408A71]/40 text-[#B0E4CC] bg-[#408A71]/5" },
                { label: "  ↳ Threat Intelligence Gateway (STIX/TAXII)", color: "border-[#408A71]/20 text-slate-300" },
                { label: "  ↳ AI Copilot Engine (Intent Classifier)", color: "border-[#408A71]/20 text-slate-300" },
                { label: "  ↳ SQLite / Postgres Vector search index", color: "border-[#408A71]/20 text-slate-300" },
                { label: "  ↳ Cryptographic Evidence Vault", color: "border-[#408A71]/20 text-slate-300" },
              ].map((node, i) => (
                <div key={i} className={`border rounded-lg p-3 text-left transition-all hover:scale-[1.01] hover:border-[#408A71] ${node.color}`}>
                  {node.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: COMPARISON TABLE ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 select-none border-t border-white/5">
        <div className="text-center space-y-2 mb-12">
          <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            Head-to-Head Comparison
          </span>
          <h2 className="text-2xl font-bold text-white uppercase font-sans">Why Cygnal is Different</h2>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0a1a18]/45">
          <table className="min-w-full divide-y divide-white/5 font-mono text-[11px] text-left">
            <thead className="bg-[#0f2422]/20 text-[#B0E4CC]">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider">Operational Area</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider">Traditional Tools</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-green-400">Cygnal Enterprise v4.0</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {[
                { area: "Threat Intel", old: "Single-source Lookup", new: "8 Parallel Providers (VT, Shodan, AbuseIPDB, etc.)" },
                { area: "Workspace Isolation", old: "Ad-hoc CLI utilities", new: "Unified Collaborative Investigation Workspace" },
                { area: "Copilot RAG Memory", old: "Basic prompting", new: "128-dim TF-IDF Vector Search + Context Injection" },
                { area: "Audit Ledger", old: "Plain text local files", new: "Cryptographic SHA-256 Custody Hash Ledger" },
                { area: "SSO Identity", old: "Static API keys / Ad-hoc access", new: "Entra ID OIDC + SAML 2.0 Directory Mapping" },
                { area: "Task Dispatch", old: "Manual scanning scripts", new: "Multi-Agent Planning HUD with Validation Checkers" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-[#0f2422]/5">
                  <td className="px-6 py-4 font-bold text-white uppercase">{row.area}</td>
                  <td className="px-6 py-4 text-slate-455">{row.old}</td>
                  <td className="px-6 py-4 text-green-300 font-bold">{row.new}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── SECTION 5: PREMIUM METRICS SHOWCASE ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 select-none border-t border-white/5">
        <div className="text-center space-y-2 mb-8">
          <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            Operational Posture Auditing
          </span>
          <h2 className="text-2xl font-bold text-white uppercase font-sans">Active Security Posture Audits</h2>
        </div>
        <FinancialScoreCards />
      </section>

      {/* ─── SECTION 6: WHO CYGNAL IS BUILT FOR ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 select-none border-t border-white/5">
        <div className="text-center space-y-2 mb-12">
          <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            User Personas
          </span>
          <h2 className="text-2xl font-bold text-white uppercase font-sans">Engineered For Specialized Security Teams</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { role: "SOC Teams", desc: "Triage alerts dynamically, monitor live webhook ingestions, and configure user directory group authorization mappings." },
            { role: "DFIR Investigators", desc: "Compute SHA-256 hashes of attached files, audit custody log files, and construct detailed chronological case narrators." },
            { role: "Threat Hunters", desc: "Ingest threat indicators from STIX packages, coordinate TAXII feeds, and run bulk lookups on VirusTotal & AbuseIPDB." },
            { role: "GRC Auditors", desc: "Review cryptographically-sealed evidence ledgers, verify lock leases, and export authenticated reports for legal review." },
          ].map((r, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 bg-[#0f2422]/20 border border-[#408A71]/10 text-left space-y-3 hover:border-[#408A71]/30 transition-all">
              <span className="text-[10px] font-bold text-[#B0E4CC] uppercase tracking-widest font-mono block">{r.role}</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SECTION 7: AI COPILOT TERMINAL SHOWCASE ───────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 select-none border-t border-white/5">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6 text-left">
            <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
              v4.0 AI Assistant
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">Cognitive Copilot Workspace</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Query cases, timeline events, and network records using natural language. The backend RAG pipeline matches query vectors to database memories, building structured Markdown reports dynamically.
            </p>
            <p className="text-sm text-[#a3c2b4] leading-relaxed">
              <strong>Multi-Agent Orchestrator</strong> validates DNS configs, Shodan credential environment variables, and zero-trust API leases to prevent blind investigations.
            </p>
          </div>

          <div className="lg:col-span-7 grid md:grid-cols-12 gap-6 items-center">
            {/* Terminal Panel */}
            <div className="md:col-span-7 glass-panel rounded-2xl p-6 border border-[#408A71]/15 bg-[#091413] text-left">
              {/* Mock Copilot Chat interface */}
              <div className="flex items-center justify-between pb-4 border-b border-[#408A71]/20 mb-4">
                <div className="flex items-center gap-2 text-[9px] font-mono text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  COPILOT PROTOCOL ACTIVE
                </div>
                <div className="text-[9px] font-mono text-slate-500">SESSION ID: E2E-PH3</div>
              </div>
              <div className="space-y-4 h-48 overflow-y-auto scrollbar-none font-mono text-[10px]">
                <div>
                  <p className="text-slate-500">[17:03:10] Investigator:</p>
                  <p className="text-white">Query relevant history for case malicious command and control callbacks.</p>
                </div>
                <div className="p-3.5 rounded-xl border border-[#408A71]/15 bg-[#0f2422]/10 space-y-2">
                  <p className="text-[#B0E4CC] font-bold">🧠 Relevant Semantic Memories (Cosine Similarity: 88%)</p>
                  <p className="text-slate-400">Memory Ref #case-1029: Suspicious DNS C2 Beaconing to C2 server domain.</p>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-300 border border-green-500/20 rounded">
                    <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                    Calculated Confidence: 92%
                  </div>
                </div>
              </div>
            </div>

            {/* Radar Panel */}
            <div className="md:col-span-5 relative flex h-64 w-full flex-col items-center justify-center space-y-4 overflow-hidden rounded-2xl border border-[#408A71]/10 bg-[#0f2422]/5">
              {/* Floating indicators */}
              <div className="absolute inset-0 flex items-center justify-center">
                <RadarEffect className="scale-[0.8]" />
              </div>
              
              {/* Floating sweep targets */}
              <div className="absolute top-4 left-4">
                <IconContainer text="VT Hash" delay={0.2} icon={<Search className="h-4 w-4 text-[#B0E4CC]" />} />
              </div>
              <div className="absolute top-4 right-4">
                <IconContainer text="WHOIS DNS" delay={0.4} icon={<Globe className="h-4 w-4 text-[#B0E4CC]" />} />
              </div>
              <div className="absolute bottom-4 left-4">
                <IconContainer text="OIDC User" delay={0.6} icon={<Fingerprint className="h-4 w-4 text-[#B0E4CC]" />} />
              </div>
              <div className="absolute bottom-4 right-4">
                <IconContainer text="Case Memory" delay={0.8} icon={<Database className="h-4 w-4 text-[#B0E4CC]" />} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: PLATFORM STATISTICS ─────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 select-none border-t border-white/5">
        <div className="glass-panel rounded-2xl p-8 border border-[#408A71]/15 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {[
            { label: "Security Capabilities", value: "35+", sub: "Enrichment Sensors" },
            { label: "Threat Providers", value: "8", sub: "Active Connectors" },
            { label: "Automated Tests", value: "160+", sub: "All Passing Successfully" },
            { label: "Enterprise Phases", value: "3", sub: "Roadmap Complete" },
          ].map((stat, i) => (
            <div key={i} className="space-y-1">
              <p className="text-3xl font-black text-[#B0E4CC] font-mono">{stat.value}</p>
              <p className="text-[10px] font-bold text-[#408A71] uppercase tracking-widest font-mono">{stat.label}</p>
              <p className="text-[10px] text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FUTURE PROOFING ROADMAP ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10 select-none border-t border-white/5">
        <div className="text-center space-y-2 mb-12">
          <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            Development Blueprint
          </span>
          <h2 className="text-2xl font-bold text-white uppercase font-sans">Future Enterprise Roadmap</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 font-mono text-[11px] text-left">
          <div className="glass-card rounded-xl p-5 border border-[#408A71]/15 bg-[#0f2422]/10 space-y-2">
            <span className="text-[9px] font-bold text-[#B0E4CC] uppercase tracking-widest block">Phase 4 (Up Next)</span>
            <h4 className="text-white uppercase font-bold">Collaborative Webhooks Ingestion</h4>
            <p className="text-slate-400 leading-relaxed">Integrated alert rulesets, automated trigger pools, and Socket.IO notifications for SOC-wide incident triages.</p>
          </div>
          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-2">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Phase 5</span>
            <h4 className="text-slate-350 uppercase font-bold">Plugin Developer SDK</h4>
            <p className="text-slate-500 leading-relaxed">Extensible module registry allowing teams to deploy proprietary OSINT crawlers and custom local scanners.</p>
          </div>
          <div className="glass-card rounded-xl p-5 border border-white/5 space-y-2">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest block">Version 5.0</span>
            <h4 className="text-slate-350 uppercase font-bold">Autonomic Orchestration Loop</h4>
            <p className="text-slate-500 leading-relaxed">Multi-agent autonomic task networks executing target resolutions and mitigation deployments automatically.</p>
          </div>
        </div>
      </section>

      {/* ─── TRUST / SPARKLES BANNER ────────────────────────────────────── */}
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
                <CheckCircle className="w-4 h-4 text-[#B0E4CC]" /> OWASP ASVS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 select-none z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
            Cygnal v4.0 · Phase 1, 2 &amp; 3 Complete · SSL Handshake Active
          </span>
          <span className="text-[10px] text-slate-500">
            © 2026 Cygnal Operations. All rights reserved.
          </span>
        </div>
      </footer>

    </div>
  );
}
