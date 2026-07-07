"use client";

import React from "react";
import DashboardShell from "@/components/DashboardShell";
import Link from "next/link";
import { ChevronRight, Terminal } from "lucide-react";

interface ScannerShellProps {
  children: React.ReactNode;
  title: string;
  description: string;
  category: string;
  slug: string;
}

export default function ScannerShell({ children, title, description, category, slug }: ScannerShellProps) {
  return (
    <DashboardShell>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] font-mono text-slate-600 uppercase tracking-widest select-none">
          <Link href="/scanners" className="hover:text-slate-400 transition-colors flex items-center gap-1">
            <Terminal size={10} /> Scanners
          </Link>
          <ChevronRight size={10} className="text-slate-700" />
          <span className="text-slate-500">{title}</span>
        </nav>

        {/* Header */}
        <div className="border-b border-white/5 pb-5 space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/15">
              {category}
            </span>
          </div>
          <h1 className="text-lg font-black text-white uppercase tracking-wide">{title}</h1>
          <p className="text-xs text-slate-500 max-w-2xl">{description}</p>
        </div>

        {/* Scanner Content */}
        {children}
      </div>
    </DashboardShell>
  );
}
