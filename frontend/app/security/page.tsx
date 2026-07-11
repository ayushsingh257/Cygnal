"use client"

import React from "react"
import MarketingHeader from "@/components/MarketingHeader"
import MarketingFooter from "@/components/MarketingFooter"
import { Shield, Key, AlertTriangle, Clock, Award } from "lucide-react"

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] flex flex-col justify-between font-sans">
      <MarketingHeader />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 space-y-8 text-left leading-relaxed">
        {/* Page Header */}
        <div className="space-y-4">
          <span className="text-[10px] font-mono text-[#ea580c] border border-[#ea580c]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            Security Node
          </span>
          <h1 className="text-4xl font-black uppercase tracking-tight">Responsible Disclosure &amp; GRC</h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            At Cygnal, we build enterprise-grade security operations cockpits. We believe in collaborative threat disclosures and operate a transparent security program to secure our platform nodes.
          </p>
        </div>

        {/* Core Sections */}
        <div className="space-y-6 text-xs text-[var(--text-secondary)]">
          <section className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
            <div className="flex items-center gap-2 text-white font-mono text-sm uppercase tracking-wider font-bold">
              <Shield className="text-[#ea580c]" size={16} />
              Platform Security Auditing
            </div>
            <p className="leading-relaxed">
              Cygnal undergoes regular third-party penetration testing and GRC audits. Our platform design operates under strict Zero-Trust session lifecycles, TOTP Multi-Factor Authentication (MFA), role-based access control policies (RBAC), and multi-tenant database isolation bounds to secure client silos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={16} /> Reporting Vulnerabilities
            </h2>
            <p>
              If you identify a security vulnerability inside a Cygnal node, API gateway, or developer plugin, dispatch details immediately via secure transmission. Do not disclose the issue publicly until we have triaged and hotfixed the vulnerability.
            </p>
            <p>
              Please send reports to <strong className="text-white">security@cygnal.secure</strong>. Provide a detailed proof of concept, steps to reproduce, and target version details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white flex items-center gap-2">
              <Key className="text-blue-500" size={16} /> Secure PGP Key Block
            </h2>
            <p>
              For sensitive reports, encrypt your payload using the official Cygnal Security PGP Key:
            </p>
            <pre className="p-4 bg-zinc-950 border border-[var(--border-subtle)] rounded-xl font-mono text-[9px] text-zinc-400 overflow-x-auto select-text leading-normal">
{`-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP v4.2.1

mQINBFTz+wIBEADiP3UqFk4K9W+nZa8e4R9g...
... [SECURE CYGNAL SECURITY NODE PUBLIC KEY] ...
=7e9r
-----END PGP PUBLIC KEY BLOCK-----`}
            </pre>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white flex items-center gap-2">
              <Clock className="text-orange-400" size={16} /> SLA Response Timeline
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Initial Triage:</strong> Within 24 hours of receipt.</li>
              <li><strong>Verdict &amp; Classification:</strong> Within 48 hours of triage.</li>
              <li><strong>Hotfix Deployment:</strong> Scoped by severity. Critical issues targeted within 72 hours.</li>
              <li><strong>Public Advisory:</strong> Coordinated after hotfix deployment is validated across all enterprise tenants.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white flex items-center gap-2">
              <Award className="text-emerald-500" size={16} /> Recognition and Safe Harbor
            </h2>
            <p>
              We operate under a safe harbor policy. If you perform vulnerability research in good faith without causing data loss, service degradation, or unauthorized modifications to production systems, we will not pursue legal actions.
            </p>
            <p>
              Valid reports are eligible for recognition in the Cygnal Security Hall of Fame, and custom community contributor badges.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
