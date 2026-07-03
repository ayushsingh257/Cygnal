"use client";

import React, { useState } from "react";
import { Shield, Check, Info } from "lucide-react";

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
    low: "border-blue-900/50 text-blue-400 bg-blue-950/10 hover:bg-blue-950/20",
    medium: "border-yellow-900/50 text-yellow-400 bg-yellow-950/10 hover:bg-yellow-950/20",
    high: "border-orange-900/50 text-orange-400 bg-orange-950/10 hover:bg-orange-950/20",
    critical: "border-red-900 text-red-400 bg-red-950/20 hover:bg-red-950/30 animate-pulse"
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Shield className="text-cyan-400 w-5 h-5 glow-cyan" />
        <div>
          <h3 className="text-lg font-bold font-mono">MITRE ATT&CK Matrix Mapping</h3>
          <p className="text-[10px] text-gray-500 font-mono">SCANNERS THREAT MATRIX CORRELATION</p>
        </div>
      </div>

      {/* Grid containing Tactic Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {matrix.map((tactic) => (
          <div key={tactic.id} className="space-y-3 bg-black/30 border border-white/5 p-3 rounded-lg flex flex-col justify-start">
            <div className="text-left border-b border-white/5 pb-2">
              <span className="text-xs font-mono font-bold text-gray-300">{tactic.name}</span>
              <span className="block text-[9px] font-mono text-gray-600 uppercase">{tactic.id}</span>
            </div>

            <div className="space-y-2 flex-1">
              {tactic.techniques.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => setSelectedTech(tech)}
                  className={`w-full text-left p-2.5 rounded border text-xs font-mono transition-all duration-200 ${
                    severityClasses[tech.severity]
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[10px] opacity-75">{tech.id}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 glow-cyan animate-ping" />
                  </div>
                  <div className="truncate font-semibold text-gray-200">{tech.name}</div>
                  <div className="text-[9px] text-gray-500 truncate mt-1">Tool: {tech.mappedTool}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Technique Details overlay info box */}
      {selectedTech && (
        <div className="glass-panel p-4 bg-zinc-950/80 border border-cyan-500/20 text-left relative transition-all duration-300">
          <button 
            onClick={() => setSelectedTech(null)} 
            className="absolute top-3 right-3 text-xs font-mono text-gray-400 hover:text-white"
          >
            [CLOSE]
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <Info size={14} className="text-cyan-400" />
            <h4 className="font-mono font-bold text-cyan-400 text-sm">
              [{selectedTech.id}] {selectedTech.name}
            </h4>
            <span className={`tag-severity tag-severity-${selectedTech.severity} text-[9px] ml-2`}>
              {selectedTech.severity}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono text-gray-400">
            <div><span className="text-gray-200">TACTICAL SUMMARY:</span> {selectedTech.description}</div>
            <div><span className="text-gray-200">MAPPED SYSTEM SCANNER:</span> <span className="text-purple-400">{selectedTech.mappedTool}</span></div>
          </div>
        </div>
      )}

    </div>
  );
}
