"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { 
  ShieldAlert, 
  Globe, 
  Camera, 
  FileSearch, 
  Image, 
  Mail, 
  Skull, 
  MapPin, 
  Activity, 
  Search,
  History,
  Terminal as TerminalIcon
} from "lucide-react";

import HeaderScanner from "./HeaderScanner";
import WhoisLookup from "./WhoisLookup";
import ScreenshotTool from "./ScreenshotTool";

const IPReputationTool = dynamic(() => import("./IPReputationTool"), { ssr: false });
const MetadataTool = dynamic(() => import("./MetadataTool"), { ssr: false });
const ReverseImageSearch = dynamic(() => import("./ReverseImageSearch"), { ssr: false });
const EmailScanner = dynamic(() => import("./EmailScanner"), { ssr: false });
const MalwareScanner = dynamic(() => import("./MalwareScanner"), { ssr: false });
const PassiveDNSLookup = dynamic(() => import("./PassiveDNSLookup"), { ssr: false });
const PortScanner = dynamic(() => import("./PortScanner"), { ssr: false });
const ScanHistory = dynamic(() => import("./ScanHistory"), { ssr: false });

export default function ScannersConsole() {
  const [activeTab, setActiveTab] = useState(0);

  const tools = [
    { 
      id: 0, 
      name: "Header Scanner", 
      icon: ShieldAlert, 
      category: "Network",
      component: <HeaderScanner />,
      desc: "Analyze HTTP response headers for missing or misconfigured security controls."
    },
    { 
      id: 1, 
      name: "WHOIS Lookup", 
      icon: Globe, 
      category: "Recon",
      component: <WhoisLookup />,
      desc: "Query domain registrant information, creation/expiry timestamps, and name servers."
    },
    { 
      id: 2, 
      name: "Website Screenshot", 
      icon: Camera, 
      category: "Recon",
      component: <ScreenshotTool />,
      desc: "Capture visual screenshots of web applications without direct user-agent leaks."
    },
    { 
      id: 3, 
      name: "Metadata Recon", 
      icon: FileSearch, 
      category: "Forensics",
      component: <MetadataTool />,
      desc: "Extract EXIF tags, author metadata, and creation properties from documents and images."
    },
    { 
      id: 4, 
      name: "Reverse Image", 
      icon: Image, 
      category: "Forensics",
      component: <ReverseImageSearch />,
      desc: "Perform AI-driven reverse image matching against threat databases using CLIP."
    },
    { 
      id: 5, 
      name: "Email Scanner", 
      icon: Mail, 
      category: "OSINT",
      component: <EmailScanner />,
      desc: "Harvest public email records from domains to assess employee credential exposure."
    },
    { 
      id: 6, 
      name: "Malware Sandbox", 
      icon: Skull, 
      category: "Threat Intel",
      component: <MalwareScanner />,
      desc: "Perform static signature matches and hybrid malware analysis of suspicious binaries."
    },
    { 
      id: 7, 
      name: "IP Reputation", 
      icon: MapPin, 
      category: "Threat Intel",
      component: <IPReputationTool />,
      desc: "Check active IP addresses against global blocklists and reputation feeds."
    },
    { 
      id: 8, 
      name: "Passive DNS", 
      icon: Activity, 
      category: "Recon",
      component: <PassiveDNSLookup />,
      desc: "Query historical DNS record mapping history for hostnames."
    },
    { 
      id: 9, 
      name: "Port Scanner", 
      icon: Search, 
      category: "Network",
      component: <PortScanner />,
      desc: "Scan target hosts for open ports, running services, and protocol versions."
    }
  ];

  const currentTool = tools.find(t => t.id === activeTab) || tools[0];
  const ToolIcon = currentTool.icon;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start text-left font-sans">
      
      {/* LEFT COLUMN: NAVIGATION LIST */}
      <div className="xl:col-span-1 glass-card rounded-xl p-4 bg-[#0d1117]/60 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3 select-none">
          <TerminalIcon className="text-cyan-400 w-4 h-4" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Console Modules
          </h3>
        </div>

        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = activeTab === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTab(tool.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium tracking-wide transition-all duration-150 ${
                  isSelected 
                    ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
                    : "text-slate-400 border border-transparent hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon size={15} className={isSelected ? "text-cyan-400" : "text-slate-500"} />
                  <span className="truncate">{tool.name}</span>
                </div>
                <span className="text-[8px] uppercase tracking-wider px-2 py-0.5 bg-black/40 border border-white/5 rounded font-mono text-slate-500">
                  {tool.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: WORKSPACE CONTAINER */}
      <div className="xl:col-span-3 space-y-6">
        
        {/* Active Tool Header */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/80">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3 select-none">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/20 border border-cyan-500/15 flex items-center justify-center">
              <ToolIcon size={16} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{currentTool.name}</h2>
              <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">{currentTool.category} Engine</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 font-sans leading-relaxed">
            {currentTool.desc}
          </p>
        </div>

        {/* Dynamic Scan Interface */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/50 min-h-[30vh]">
          {currentTool.component}
        </div>

        {/* Global Historical Scan logs list */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/85">
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider border-b border-white/5 pb-2.5 mb-4 flex items-center gap-2 select-none">
            <History size={14} className="text-cyan-400" /> Output Stream History
          </h3>
          <ScanHistory />
        </div>

      </div>

    </div>
  );
}
