"use client";

import React, { useState } from "react";
import { Shield, Info, X } from "lucide-react";

interface Technique {
  id: string;
  name: string;
  mappedTool: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface Tactic {
  name: string;
  id: string;
  techniques: Technique[];
}

export default function MitreAttackMatrix() {
  const [selectedTech, setSelectedTech] = useState<Technique | null>(null);

  const matrix: Tactic[] = [
    {
      name: "Reconnaissance",
      id: "TA0043",
      techniques: [
        {
          id: "T1595",
          name: "Active Scanning",
          mappedTool: "Port Scanner / Header Scanner",
          description: "Scanning public networks to find open ports, misconfigured HTTP headers, and system versions.",
          severity: "medium"
        },
        {
          id: "T1596",
          name: "Open Technical DBs",
          mappedTool: "Passive DNS / WHOIS Lookup",
          description: "Querying domain registries, WHOIS registers, and historical passive DNS records.",
          severity: "low"
        },
        {
          id: "T1589",
          name: "Gather Victim Identity",
          mappedTool: "Email Scanner",
          description: "Harvesting public email addresses and profiles to target for social engineering or credential leaks.",
          severity: "medium"
        }
      ]
    },
    {
      name: "Resource Development",
      id: "TA0042",
      techniques: [
        {
          id: "T1583",
          name: "Acquire Infrastructure",
          mappedTool: "IP Reputation Checker",
          description: "Registering domains or renting IP space that has bad reputation metrics on threat feeds.",
          severity: "low"
        }
      ]
    },
    {
      name: "Initial Access",
      id: "TA0001",
      techniques: [
        {
          id: "T1190",
          name: "Exploit Public Web App",
          mappedTool: "Header Scanner",
          description: "Taking advantage of missing headers (like CSP, X-Frame-Options) to execute script injections or clickjacking.",
          severity: "high"
        },
        {
          id: "T1566",
          name: "Phishing: Spearphishing",
          mappedTool: "Email Scanner",
          description: "Targeting specific users via emails gathered during public OSINT harvesting sweeps.",
          severity: "high"
        }
      ]
    },
    {
      name: "Discovery",
      id: "TA0007",
      techniques: [
        {
          id: "T1046",
          name: "Network Service Discovery",
          mappedTool: "Port Scanner",
          description: "Probing target host ports to identify running services, software titles, and protocol suites.",
          severity: "medium"
        },
        {
          id: "T1082",
          name: "System Info Discovery",
          mappedTool: "Metadata Recon Tool",
          description: "Extracting host directories, author profiles, and OS specifications from document EXIF headers.",
          severity: "low"
        }
      ]
    },
    {
      name: "Execution",
      id: "TA0002",
      techniques: [
        {
          id: "T1204",
          name: "User Execution",
          mappedTool: "Malware Sandbox",
          description: "Tricking users into uploading and executing malicious payloads, verified via static/dynamic analysis.",
          severity: "critical"
        }
      ]
    }
  ];

  const severityClasses: Record<string, string> = {
    low: "border-white/5 text-slate-400 bg-white/[0.01] hover:bg-white/[0.03]",
    medium: "border-yellow-500/20 text-yellow-400 bg-yellow-950/5 hover:bg-yellow-950/10",
    high: "border-orange-500/20 text-orange-400 bg-orange-950/5 hover:bg-orange-950/10",
    critical: "border-red-500/20 text-red-400 bg-red-950/5 hover:bg-red-950/10"
  };

  const badgeSeverityColors: Record<string, string> = {
    low: "badge-low",
    medium: "badge-medium",
    high: "badge-high",
    critical: "badge-critical"
  };

  return (
    <div className="space-y-4 font-sans select-none text-left">
      
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Shield className="text-cyan-400 w-4.5 h-4.5" />
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">MITRE ATT&CK Mapping</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Threat Matrix Correlation</p>
        </div>
      </div>

      {/* Tactic Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {matrix.map((tactic) => (
          <div key={tactic.id} className="space-y-3 bg-[#0d1117]/35 border border-white/5 p-4 rounded-xl flex flex-col justify-start">
            <div className="text-left border-b border-white/5 pb-2">
              <span className="text-[11px] font-bold text-slate-350">{tactic.name}</span>
              <span className="block text-[9px] text-slate-500 font-mono mt-0.5">{tactic.id}</span>
            </div>

            <div className="space-y-2 flex-1">
              {tactic.techniques.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => setSelectedTech(tech)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all duration-150 ${
                    severityClasses[tech.severity]
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 text-[9px] font-mono">
                    <span className="font-semibold text-slate-500">{tech.id}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-450" />
                  </div>
                  <div className="truncate font-semibold text-slate-200 text-[10px]">{tech.name}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Overlay Card */}
      {selectedTech && (
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/85 border border-white/10 text-left relative transition-all duration-200">
          <button 
            onClick={() => setSelectedTech(null)} 
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
          
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-cyan-400" />
            <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wide">
              [{selectedTech.id}] {selectedTech.name}
            </h4>
            <span className={`${badgeSeverityColors[selectedTech.severity]}`}>
              {selectedTech.severity}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-400">
            <div>
              <span className="text-slate-550 uppercase text-[9px] mr-2 font-mono tracking-wider block sm:inline">Summary:</span> 
              {selectedTech.description}
            </div>
            <div>
              <span className="text-slate-550 uppercase text-[9px] mr-2 font-mono tracking-wider block sm:inline">Mapped Modules:</span> 
              <span className="text-cyan-450 font-mono">{selectedTech.mappedTool}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
