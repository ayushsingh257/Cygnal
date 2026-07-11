"use client"

import React from "react"
import MarketingHeader from "@/components/MarketingHeader"
import MarketingFooter from "@/components/MarketingFooter"

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)] flex flex-col justify-between font-sans">
      <MarketingHeader />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 space-y-8 text-left leading-relaxed">
        <div className="space-y-4">
          <span className="text-[10px] font-mono text-[#ea580c] border border-[#ea580c]/30 px-2 py-0.5 rounded tracking-widest uppercase">
            Data Storage Disclosures
          </span>
          <h1 className="text-4xl font-black uppercase tracking-tight">Cookie &amp; Storage Policy</h1>
          <p className="text-[10px] font-mono text-[var(--text-muted)]">EFFECTIVE DATE: JULY 11, 2026</p>
        </div>

        <div className="space-y-6 text-xs text-[var(--text-secondary)]">
          <p>
            Cygnal does not employ advertising cookies, user profiling, or third-party web trackers. We utilize only essential browser cookies and local storage parameters to ensure secure authentication, session management, and interface selections.
          </p>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">1. What We Store &amp; Why</h2>
            <table className="min-w-full divide-y divide-[var(--border-subtle)] font-mono text-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-lg overflow-hidden">
              <thead className="bg-[#ea580c]/5 text-[#ea580c]">
                <tr>
                  <th className="px-4 py-2 text-left uppercase tracking-wider font-bold">Key Name</th>
                  <th className="px-4 py-2 text-left uppercase tracking-wider font-bold">Storage Type</th>
                  <th className="px-4 py-2 text-left uppercase tracking-wider font-bold">Purpose</th>
                  <th className="px-4 py-2 text-left uppercase tracking-wider font-bold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-slate-300">
                <tr>
                  <td className="px-4 py-3 font-bold">token</td>
                  <td className="px-4 py-3">Local Storage</td>
                  <td className="px-4 py-3">Holds the JWT authentication bearer token to validate API requests.</td>
                  <td className="px-4 py-3">Session/3 Days</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold">theme</td>
                  <td className="px-4 py-3">Local Storage</td>
                  <td className="px-4 py-3">Remembers your user theme preference (light or dark mode).</td>
                  <td className="px-4 py-3">Persistent</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold">user</td>
                  <td className="px-4 py-3">Local Storage</td>
                  <td className="px-4 py-3">Caches username, role, and department metrics to optimize sidebar display.</td>
                  <td className="px-4 py-3">Persistent</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold">session_id</td>
                  <td className="px-4 py-3">Cookie</td>
                  <td className="px-4 py-3">Tracks connection handshakes for WebSocket synchronization across scaled nodes.</td>
                  <td className="px-4 py-3">Session</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">2. Essential Status</h2>
            <p>
              Under global data protection regulations (including GDPR and CCPA), storage elements required to execute core platform operations and maintain security do not require prior user consent. Disabling local storage inside your browser settings will prevent you from successfully logging in or authenticating node workspaces.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">3. Third-Party Integrations</h2>
            <p>
              When you interact with scanners or indicators that issue queries to third-party threat feeds, those external servers do not receive or place cookies on your device.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}
