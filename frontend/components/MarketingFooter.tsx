"use client"

import React from "react"
import Link from "next/link"

export default function MarketingFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-12 bg-[var(--bg-deep)] select-none z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6 items-center justify-between sm:flex-row">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
          <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">About</Link>
          <Link href="/contact" className="hover:text-[var(--text-primary)] transition-colors">Contact</Link>
          <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Service</Link>
          <Link href="/cookie-policy" className="hover:text-[var(--text-primary)] transition-colors">Cookie Policy</Link>
          <Link href="/security" className="hover:text-[var(--text-primary)] transition-colors">Responsible Disclosure</Link>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
            Cygnal v4.0 · Secure Cryptographic Triage Systems
          </p>
          <p className="text-[9px] text-[var(--text-dimmed)] mt-1">
            © 2026 Cygnal Operations. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
