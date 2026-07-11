"use client"

import React from "react"
import MarketingHeader from "@/components/MarketingHeader"
import MarketingFooter from "@/components/MarketingFooter"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] flex flex-col justify-between font-sans">
      <MarketingHeader />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 space-y-8 text-left leading-relaxed">
        <div className="space-y-4">
          <span className="text-[10px] font-mono text-[#ea580c] border border-[#ea580c]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            Operational Agreements
          </span>
          <h1 className="text-4xl font-black uppercase tracking-tight">Terms of Service</h1>
          <p className="text-[10px] font-mono text-[var(--text-muted)]">LAST MODIFIED: JULY 11, 2026</p>
        </div>

        <div className="space-y-6 text-xs text-[var(--text-secondary)]">
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">1. Agreement to Terms</h2>
            <p>
              By establishing user profiles or connecting to Cygnal endpoints, you agree to comply with and be bound by these Terms of Service. These terms apply to all analysts, developers, GRC officers, and service accounts using the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">2. Acceptable Use of Security Telemetry</h2>
            <p>
              Cygnal is designated for threat triage, digital forensics, and OSINT investigations. The platform must not be used to launch active scanners against unauthorized targets, run malicious malware executions, or collect intelligence for aggressive cyber operations. All actions are tracked via structural audit logs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">3. User Credentials &amp; Access Controls</h2>
            <p>
              Organizations must register users via corporate verified domains or SAML/OIDC federations. Users are responsible for configuring TOTP Multi-Factor Authentication (MFA) and maintaining the privacy of active token keys. Shared accounts are strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">4. Intellectual Property &amp; Forensic Logs</h2>
            <p>
              Cygnal represents proprietary security software. Except for open-source SDK integrations, all rights to indicators, plan triages, reporting formats, and database structures are owned by Cygnal Operations. Investigators retain ownership of forensic files, comments, and incident cases uploaded to their tenants.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">5. Platform Availability and SLA</h2>
            <p>
              We target a 99.9% uptime SLA for multi-tenant high-availability cluster deployments. However, local deployments or sandboxed instances of Cygnal do not carry service uptime guarantees. Maintenance schedules will be communicated to organization admins 48 hours in advance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">6. Limitations of Liability</h2>
            <p>
              Cygnal is provided &quot;as is&quot;. We do not guarantee that security scanning verdicts from third-party APIs are 100% accurate. We are not liable for any security breaches, data losses, or operational down-times arising from compromised user credentials or unauthorized network configuration edits.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
