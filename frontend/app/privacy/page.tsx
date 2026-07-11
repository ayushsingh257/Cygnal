"use client"

import React from "react"
import MarketingHeader from "@/components/MarketingHeader"
import MarketingFooter from "@/components/MarketingFooter"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] flex flex-col justify-between font-sans">
      <MarketingHeader />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 space-y-8 text-left leading-relaxed">
        <div className="space-y-4">
          <span className="text-[10px] font-mono text-[#ea580c] border border-[#ea580c]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            Platform Compliance
          </span>
          <h1 className="text-4xl font-black uppercase tracking-tight">Privacy Policy</h1>
          <p className="text-[10px] font-mono text-[var(--text-muted)]">EFFECTIVE DATE: JULY 11, 2026</p>
        </div>

        <div className="space-y-6 text-xs text-[var(--text-secondary)]">
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">1. Information We Collect</h2>
            <p>
              Cygnal operates as a secure collaborative DFIR workspace. When deploying or registering user accounts, we collect essential authentication metadata, including corporate email addresses, usernames, and organization domain mappings. 
            </p>
            <p>
              We process threat indicator values (such as IP addresses, domains, file hashes, and email addresses) that you upload to the platform for incident enrichment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">2. Data Security &amp; Cryptography</h2>
            <p>
              Security is the foundation of our engineering architecture. All digital evidence and logs submitted within cases are cryptographically signed using SHA-256 block hashes on our database ledgers. 
            </p>
            <p>
              User access is protected by Industry Standard OIDC/SAML OAuth integrations and Multi-Factor Authentication (MFA) TOTP challenge pools to guarantee absolute isolation of client forensic silos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">3. Cookies &amp; Local Storage</h2>
            <p>
              We use strictly essential local storage entries to maintain secure JWT session states, token renewal lists, and system display selections (such as light or dark theme preferences). No third-party marketing cookies or tracking beacons are used.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">4. Data Retention</h2>
            <p>
              Forensic data, scan outputs, and agent activity history are maintained within the designated multi-tenant sqlite/postgres databases according to the retention configurations defined by your organization&apos;s admin. Upon user account removal or organization de-onboarding, data is purged from index layers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">5. Third-Party API Connectors</h2>
            <p>
              Cygnal communicates with threat intelligence sensors (including VirusTotal, Shodan, AbuseIPDB, Censys, AlienVault, ThreatFox, and URLHaus) to enrich IOC data. These API requests only transmit the specific indicator values (IP, hash, URL) and do not leak investigator identities or organizational contexts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">6. Compliance and Certifications</h2>
            <p>
              We design and audit our platform to meet SOC 2 Type II, ISO/IEC 27001, and FIPS 140-3 cryptography standards. We support compliance audits by generating detailed chronological logs of all security events with correlation IDs.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
