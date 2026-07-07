"use client";

import React, { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Search, Globe, Wifi, FileSearch, DatabaseZap, Mail, Radar,
  Bug, Camera, Eye, ShieldAlert, ArrowRight, Terminal
} from "lucide-react";

const SCANNER_META: Record<string, { icon: React.ReactNode; color: string; accent: string }> = {
  whois:         { icon: <Globe size={20} />,       color: "text-blue-400",   accent: "bg-blue-500/10 border-blue-500/20" },
  headers:       { icon: <Wifi size={20} />,         color: "text-indigo-400", accent: "bg-indigo-500/10 border-indigo-500/20" },
  metadata:      { icon: <FileSearch size={20} />,   color: "text-cyan-400",   accent: "bg-cyan-500/10 border-cyan-500/20" },
  dns:           { icon: <DatabaseZap size={20} />,  color: "text-purple-400", accent: "bg-purple-500/10 border-purple-500/20" },
  "email-headers": { icon: <Mail size={20} />,       color: "text-amber-400",  accent: "bg-amber-500/10 border-amber-500/20" },
  "ip-reputation": { icon: <Radar size={20} />,      color: "text-emerald-400", accent: "bg-emerald-500/10 border-emerald-500/20" },
  malware:       { icon: <Bug size={20} />,           color: "text-red-400",    accent: "bg-red-500/10 border-red-500/20" },
  screenshot:    { icon: <Camera size={20} />,        color: "text-sky-400",    accent: "bg-sky-500/10 border-sky-500/20" },
  "reverse-image": { icon: <Eye size={20} />,         color: "text-pink-400",   accent: "bg-pink-500/10 border-pink-500/20" },
  "threat-intel":  { icon: <ShieldAlert size={20} />, color: "text-orange-400", accent: "bg-orange-500/10 border-orange-500/20" },
};

interface Scanner {
  slug: string;
  name: string;
  description: string;
  input: string;
  category: string;
}

const CATEGORIES = ["All", "Reconnaissance", "Web Security", "Email Security", "Threat Intelligence", "Document Forensics", "Digital Forensics", "Malware Analysis"];

export default function ScannersDirectoryPage() {
  const { token, loadUserFromStorage } = useAuthStore();
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadUserFromStorage();
    fetchScanners();
  }, []);

  const fetchScanners = async () => {
    try {
      const res = await fetch("/api/scanners", {
        headers: { Authorization: `Bearer ${token || ""}` }
      });
      const d = await res.json();
      if (d.success) setScanners(d.scanners);
    } catch { /* use fallback below */ }
  };

  const displayed = scanners.filter(s => {
    const matchCat = filter === "All" || s.category === filter;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <DashboardShell>
      <div className="space-y-8 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-blue-400" />
              <h1 className="text-lg font-black text-white uppercase tracking-wide">Investigation Scanners</h1>
            </div>
            <p className="text-xs text-slate-500">10 enterprise investigation modules — each producing structured results, IOC extraction, and case timeline integration</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-950/15 border border-blue-500/15 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">{scanners.length || 10} modules online</span>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Search investigation modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="cyber-input pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                  filter === cat
                    ? "bg-blue-500 text-white"
                    : "btn-cyber text-slate-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Scanner Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {(displayed.length > 0 ? displayed : FALLBACK_SCANNERS.filter(s => {
            const matchCat = filter === "All" || s.category === filter;
            const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
            return matchCat && matchSearch;
          })).map((scanner, i) => {
            const meta = SCANNER_META[scanner.slug] || SCANNER_META["whois"];
            return (
              <Link
                key={scanner.slug}
                href={`/scanners/${scanner.slug}`}
                className={`glass-card rounded-2xl p-5 flex flex-col gap-4 hover:scale-[1.01] transition-all duration-200 animate-fade-in animate-delay-${Math.min((i + 1) * 100, 500)} group`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${meta.accent} ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-slate-600 bg-white/5 px-2 py-0.5 rounded">
                    {scanner.input === "file" ? "file upload" : scanner.input === "textarea" ? "text area" : "text input"}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide group-hover:text-blue-300 transition-colors">
                    {scanner.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{scanner.description}</p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                  <span className={`text-[9px] font-mono uppercase tracking-widest ${meta.color}`}>
                    {scanner.category}
                  </span>
                  <ArrowRight size={12} className="text-slate-700 group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </DashboardShell>
  );
}

const FALLBACK_SCANNERS: Scanner[] = [
  { slug: "whois",          name: "WHOIS Lookup",          description: "Domain/IP ownership, registrar, creation dates, nameservers", input: "text",     category: "Reconnaissance" },
  { slug: "headers",        name: "HTTP Header Scanner",   description: "Security headers audit, CSP/HSTS analysis, info disclosure",  input: "text",     category: "Web Security" },
  { slug: "metadata",       name: "Metadata Extractor",    description: "EXIF, PDF/Office document properties, author identity, GPS",  input: "file",     category: "Document Forensics" },
  { slug: "dns",            name: "DNS Intelligence",      description: "A/MX/NS/TXT/CNAME records, SPF, DMARC, historical analysis",  input: "text",     category: "Reconnaissance" },
  { slug: "email-headers",  name: "Email Header Analyzer", description: "Routing hops, SPF/DKIM/DMARC auth, IP extraction, spoofing", input: "textarea", category: "Email Security" },
  { slug: "ip-reputation",  name: "IP Reputation",         description: "Geolocation, ASN, ISP, threat feeds, TOR exit detection",    input: "text",     category: "Threat Intelligence" },
  { slug: "malware",        name: "Malware Scanner",       description: "Hash reputation, entropy analysis, magic byte detection",     input: "file",     category: "Malware Analysis" },
  { slug: "screenshot",     name: "Page Archiver",         description: "Technology detection, external links, page metadata archival", input: "text",    category: "Web Security" },
  { slug: "reverse-image",  name: "Image Forensics",       description: "EXIF analysis, GPS extraction, device fingerprint, steg",    input: "file",     category: "Digital Forensics" },
  { slug: "threat-intel",   name: "Threat Intelligence",   description: "IOC lookup, CVE enrichment, timeline cross-reference",       input: "text",     category: "Threat Intelligence" },
];
