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
          </div>
        </div>
      </section>

      {/* ─── PLATFORM CAPABILITIES (3 core pillars) ─────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
            Platform Capabilities
          </h2>
          <p className="text-lg font-bold text-white uppercase">Aggregated Forensics &amp; Intelligence Matrix</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left">
            <div className="h-10 w-10 bg-[#408A71]/10 border border-[#408A71]/20 rounded-xl flex items-center justify-center text-[#B0E4CC]">
              <Terminal size={18} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Security Multi-Sensors</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verify HTTP header directives, map DNS change histories, sweep ports, submit payload hashes to multi-provider malware sandboxes, and capture headless screenshots.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left">
            <div className="h-10 w-10 bg-[#285A48]/10 border border-[#285A48]/20 rounded-xl flex items-center justify-center text-[#B0E4CC]">
              <Fingerprint size={18} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Enterprise Identity</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Microsoft Entra ID OIDC, SAML 2.0 federation, Zero Trust session management, refresh token rotation, configurable directory group mapping, and service accounts.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left">
            <div className="h-10 w-10 bg-[#408A71]/10 border border-[#408A71]/20 rounded-xl flex items-center justify-center text-[#B0E4CC]">
              <Radar size={18} />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Threat Intelligence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              8-provider parallel IOC enrichment (VirusTotal, Shodan, AbuseIPDB, OTX, ThreatFox, URLHaus, Censys, MISP) with weighted confidence scoring and STIX/TAXII parsing.
            </p>
          </div>
        </div>
      </section>

      {/* ─── PHASE 1: ENTERPRISE IDENTITY ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
              v4.0 Phase 1
            </span>
            <h2 className="text-lg font-bold text-white uppercase">Enterprise Identity &amp; Authentication</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Production-grade federated identity supporting Fortune 500 SOC deployments. Provider-agnostic architecture means adding Okta or Ping Identity requires only a new adapter class.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShieldCheck size={14} className="text-[#408A71]" />
            <span className="text-[10px] font-mono text-[#B0E4CC] tracking-widest uppercase">OWASP ASVS · OAuth 2.1</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {phase1Features.map((feat, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-5 bg-[#0f2422]/25 space-y-3 text-left border border-white/5 hover:border-[#408A71]/25 transition-colors duration-300"
            >
              <div className="h-9 w-9 bg-[#408A71]/10 border border-[#408A71]/20 rounded-lg flex items-center justify-center text-[#B0E4CC]">
                <feat.icon size={16} />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{feat.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PHASE 2: THREAT INTELLIGENCE ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[9px] font-mono text-[#408A71] border border-[#408A71]/30 px-2 py-0.5 rounded tracking-widest uppercase">
              v4.0 Phase 2
            </span>
            <h2 className="text-lg font-bold text-white uppercase">Threat Intelligence Platform</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Parallel fan-out enrichment across 8 providers. Each provider implements a common adapter interface — adding a new source requires only one class. Results are cached, aggregated, and scored.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Zap size={14} className="text-[#408A71]" />
            <span className="text-[10px] font-mono text-[#B0E4CC] tracking-widest uppercase">STIX 2.x · TAXII 2.1</span>
          </div>
        </div>

        {/* Provider grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {phase2Features.map((feat, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-5 bg-[#0f2422]/25 space-y-3 text-left border border-white/5 hover:border-[#408A71]/25 transition-colors duration-300"
            >
              <div className="h-9 w-9 bg-[#285A48]/10 border border-[#285A48]/20 rounded-lg flex items-center justify-center text-[#B0E4CC]">
                <feat.icon size={16} />
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{feat.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Confidence scoring callout */}
        <div className="glass-panel rounded-2xl p-6 border border-[#408A71]/15 grid sm:grid-cols-3 gap-6 text-center">
          {[
            { label: "Providers", value: "8", sub: "Active Connectors" },
            { label: "Free-Tier", value: "2", sub: "No API Key Required" },
            { label: "Cache TTL", value: "6h", sub: "Result Deduplication" },
          ].map((stat, i) => (
            <div key={i} className="space-y-1">
              <p className="text-2xl font-black text-[#B0E4CC] font-mono">{stat.value}</p>
              <p className="text-[9px] font-bold text-[#408A71] uppercase tracking-widest font-mono">{stat.label}</p>
              <p className="text-[10px] text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ROLE ORCHESTRATIONS ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
            Role Orchestrations
          </h2>
          <p className="text-lg font-bold text-white uppercase">Tailored Workspace Experiences</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { role: "SOC Managers", desc: "Delegate incident workloads, configure team permissions, manage Entra group mappings, and monitor telemetry lines." },
            { role: "Threat Intel Leads", desc: "Run multi-provider IOC enrichment, ingest STIX bundles, query TAXII feeds, and audit confidence scores." },
            { role: "DFIR Investigators", desc: "Upload evidence files, review custody logs, run metadata extraction, and compile presentation-ready reports." },
            { role: "Compliance Auditors", desc: "Verify forensic timeline custody signatures, audit structured auth logs, and export compliance reports." },
          ].map((r, i) => (
            <div key={i} className="glass-card rounded-xl p-5 bg-[#0f2422]/20 text-left space-y-2">
              <span className="text-[9px] font-bold text-[#B0E4CC] uppercase tracking-widest font-mono block">{r.role}</span>
              <p className="text-[11.5px] text-slate-400 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WHAT IS CYGNAL ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
              Overview
            </h2>
            <h3 className="text-3xl font-black text-white tracking-tight uppercase">What is Cygnal?</h3>
            <p className="text-sm text-slate-350 leading-relaxed">
              Cygnal is an enterprise-grade cooperative security operations and digital forensics investigation cockpit. v4.0 adds federated identity, a parallel 8-provider threat intelligence engine, STIX/TAXII support, and Zero Trust session management — all deployable in existing Fortune 500 SOC environments.
            </p>
            <p className="text-sm text-[#a3c2b4] leading-relaxed">
              Built for high-velocity incident response, Cygnal enables security teams to collaborate on investigations in real-time, enrich IOCs across 8 providers simultaneously, seal evidentiary indicators under cryptographic hashes, and query operational logs with a local AI assistant.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-8 bg-[#0f2422]/15 border border-[#408A71]/15 space-y-6 text-left">
            <h4 className="text-xs font-bold text-[#B0E4CC] uppercase tracking-widest font-mono">Critical Problems Solved</h4>
            <div className="space-y-5">
              {[
                {
                  n: "1",
                  title: "Tool sprawl & context switching",
                  desc: "Consolidates DNS, WHOIS, email headers, malware scanning, and threat intelligence into a single browser dashboard.",
                },
                {
                  n: "2",
                  title: "Fragmented identity & access control",
                  desc: "Unified OIDC/SAML identity with configurable directory group mapping replaces ad-hoc role management.",
                },
                {
                  n: "3",
                  title: "Blind-spot IOC enrichment",
                  desc: "Single-provider reputation checks miss context. Parallel 8-provider enrichment with weighted confidence scoring eliminates false negatives.",
                },
                {
                  n: "4",
                  title: "Time-to-Containment Delays",
                  desc: "AI copilot cross-references system events and local databases to surface mitigations in natural language.",
                },
              ].map((p) => (
                <div key={p.n} className="space-y-1">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{p.n}. {p.title}</h5>
                  <p className="text-xs text-slate-400">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TARGET AUDIENCES ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
            Target Audiences
          </h2>
          <p className="text-lg font-bold text-white uppercase">Engineered for Enterprise Security Units</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "SOC Teams", desc: "Standardise incident triage, monitor active threat feeds, and manage federated access from a centralised operational command dashboard." },
            { title: "DFIR Investigators", desc: "Extract metadata, analyse email headers, track IOCs across 8 providers, and maintain strict chains of custody." },
            { title: "Threat Intelligence Teams", desc: "Enrich indicators in parallel, ingest STIX bundles, query TAXII collections, and score threats by provider-weighted confidence." },
            { title: "Law Enforcement", desc: "Gather digital evidence, verify document checksums, reconstruct incident timelines, and export certified custody reports for legal submission." },
            { title: "Enterprise Security Teams", desc: "Manage federated identities via Entra ID, configure directory group mappings, and enforce least-privilege service accounts." },
            { title: "Security Operations Centers", desc: "Collaborate in real-time, orchestrate multi-provider IOC enrichment, and audit every auth event with structured correlation IDs." },
          ].map((a, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 bg-[#0f2422]/25 space-y-4 text-left border border-white/5">
              <h3 className="text-sm font-bold text-[#B0E4CC] uppercase tracking-wider font-mono">{a.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FULL CAPABILITIES GRID ─────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 select-none relative z-10 border-t border-white/5">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold text-[#408A71] uppercase tracking-widest font-mono">
            Core Offerings
          </h2>
          <p className="text-lg font-bold text-white uppercase">Complete Platform Feature Set</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {coreOfferings.map((item, idx) => (
            <div key={idx} className="glass-card rounded-xl p-5 bg-[#0f2422]/15 text-left border border-white/5 space-y-3 hover:border-[#408A71]/20 transition-colors duration-300">
              <div className="h-9 w-9 bg-[#408A71]/10 border border-[#408A71]/20 rounded-lg flex items-center justify-center text-[#B0E4CC]">
                <item.icon size={16} />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{item.title}</h4>
              <p className="text-[11px] text-slate-455 leading-relaxed">{item.desc}</p>
            </div>
          ))}
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
            Cygnal v4.0 · Phase 1 &amp; Phase 2 Complete · SSL Handshake Active
          </span>
          <span className="text-[10px] text-slate-500">
            © 2026 Cygnal Operations. All rights reserved.
          </span>
        </div>
      </footer>

    </div>
  );
}
