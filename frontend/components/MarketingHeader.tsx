"use client"

import React from "react"
import Link from "next/link"
import { Shield } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]/80 backdrop-blur-md transition-all select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-[#ea580c]" />
            <span className="text-xs font-bold tracking-[0.25em] text-[var(--text-primary)] uppercase font-sans">
              Cygnal
            </span>
            <span className="hidden sm:inline text-[9px] font-mono text-[#ea580c] border border-[#ea580c]/30 px-1.5 py-0.5 rounded tracking-widest">
              v4.0
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6 text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
            <Link href="/about" className="hover:text-[var(--text-primary)] transition-colors">About</Link>
            <Link href="/contact" className="hover:text-[var(--text-primary)] transition-colors">Contact</Link>
            <Link href="/security" className="hover:text-[var(--text-primary)] transition-colors">Disclosure</Link>
          </div>
          <ThemeToggle />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[11px] font-semibold tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-cyber-primary py-2 px-4.5 text-[11px] font-semibold tracking-wider bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg"
            >
              Enlist Node
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
