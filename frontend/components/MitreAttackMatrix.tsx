"use client";

import React, { useState } from "react";
import { Shield, Info } from "lucide-react";

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
    low: "border-white/5 text-zinc-400 bg-white/[0.01] hover:bg-white/[0.03] hover:text-zinc-200",
    medium: "border-yellow-500/10 text-yellow-400/90 bg-yellow-950/5 hover:bg-yellow-950/10",
    high: "border-orange-500/10 text-orange-400/90 bg-orange-950/5 hover:bg-orange-950/10",
    critical: "border-red-500/10 text-red-400 bg-red-950/10 hover:bg-red-950/15"
  };

  return (
    <div className="space-y-4 font-mono select-none">
      
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <Shield className="text-cyan-500 w-4 h-4" />
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">MITRE ATT&CK Matrix Mapping</h3>
          <p className="text-[9px] text-zinc-500">SCANNERS THREAT MATRIX CORRELATION</p>
        </div>
      </div>

      {/* Columns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {matrix.map((tactic) => (
          <div key={tactic.id} className="space-y-2 bg-black/20 border border-white/5 p-3 rounded flex flex-col justify-start">
            <div className="text-left border-b border-white/5 pb-1.5 mb-1.5">
              <span className="text-[10px] font-bold text-zinc-300">{tactic.name}</span>
              <span className="block text-[8px] text-zinc-650 uppercase">{tactic.id}</span>
            </div>

            <div className="space-y-1.5 flex-1">
              {tactic.techniques.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => setSelectedTech(tech)}
                  className={`w-full text-left p-2 rounded border text-xs transition-all duration-150 ${
                    severityClasses[tech.severity]
                  }`}
                >
                  <div className="flex justify-between items-center mb-1 text-[8px]">
                    <span className="font-bold opacity-60">{tech.id}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/80" />
                  </div>
                  <div className="truncate font-semibold text-zinc-200 text-[10px]">{tech.name}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Details Box */}
      {selectedTech && (
        <div className="p-4 bg-[#0c0c0e]/95 border border-white/10 text-left relative rounded transition-all duration-200">
          <button 
            onClick={() => setSelectedTech(null)} 
            className="absolute top-3 right-3 text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            [CLOSE]
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <Info size={12} className="text-cyan-500" />
            <h4 className="font-bold text-cyan-400 text-xs uppercase">
              [{selectedTech.id}] {selectedTech.name}
            </h4>
            <span className={`tag-severity tag-severity-${selectedTech.severity} text-[8px] ml-2`}>
              {selectedTech.severity}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-zinc-400">
            <div><span className="text-zinc-500 uppercase text-[9px] mr-1.5">Summary:</span> {selectedTech.description}</div>
            <div><span className="text-zinc-500 uppercase text-[9px] mr-1.5">Associated Tools:</span> <span className="text-cyan-450">{selectedTech.mappedTool}</span></div>
          </div>
        </div>
      )}

    </div>
  );
}
