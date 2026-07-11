"use client"

import React from "react"
import MarketingHeader from "@/components/MarketingHeader"
import MarketingFooter from "@/components/MarketingFooter"
import { Shield, Cpu, Database, Users, Eye, Target } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] flex flex-col justify-between font-sans">
      <MarketingHeader />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 space-y-12">
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <span className="text-[10px] font-mono text-[#ea580c] border border-[#ea580c]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            About Cygnal
          </span>
          <h1 className="text-4xl font-black uppercase tracking-tight">Cooperative Incident Response</h1>
          <p className="text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
            Cygnal is a premium, enterprise-ready cybersecurity operations cockpit that transforms how Security Operations Centers (SOCs) run digital forensics, OSINT investigations, and incident response.
          </p>
        </div>

        {/* Pillars / Values Grid */}
        <div className="grid md:grid-cols-2 gap-8 pt-8">
          <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Target size={20} />
            </div>
            <h3 className="text-lg font-bold font-mono uppercase">Our Mission</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              To drastically reduce Mean Time to Triage (MTTT) and Mean Time to Resolution (MTTR) by consolidating disconnected security feeds into an automated, interactive workspace.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Eye size={20} />
            </div>
            <h3 className="text-lg font-bold font-mono uppercase">Our Vision</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              We envision a Zero-Trust operations cockpit where AI-augmented investigations, automated playbooks, and secure cryptographic chain of custody are accessible to security units globally.
            </p>
          </div>
        </div>

        {/* Platform Overview Details */}
        <div className="space-y-6 pt-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight font-mono">Platform Design Philosophy</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Cygnal separates itself from legacy alert aggregators. Rather than flooding analysts with raw telemetry, we implement concurrent multi-sensor triage, running parallel threat intelligence scans over 8 integrated providers. Our vector database indexes security logs to retrieve semantic matches across historical incidents.
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Every file, comment, and event logged inside a Cygnal Case is cryptographically sealed using SHA-256 integrity signatures, ensuring that all digital evidence is legally auditable and compliant with enterprise governance.
          </p>
        </div>

        {/* Who Cygnal is built for */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight font-mono">Who Cygnal is Built For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-[11px]">
            <div className="p-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] space-y-2">
              <span className="font-bold text-[#ea580c]">SOC ANALYSTS</span>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">Run DNS, WHOIS, header triages, and threat intel enrichment in one centralized workspace.</p>
            </div>
            <div className="p-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] space-y-2">
              <span className="font-bold text-blue-500">DFIR INVESTIGATORS</span>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">Track chains of custody, store signed evidence files, and export chronological logs.</p>
            </div>
            <div className="p-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] space-y-2">
              <span className="font-bold text-orange-400">GRC OFFICERS</span>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">Monitor user access with Entra ID SSO, session rotation, and auditable system trails.</p>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
