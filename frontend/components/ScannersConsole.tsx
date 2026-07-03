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
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
      
      {/* LEFT COLUMN: SCANNER NAVIGATION */}
      <div className="xl:col-span-1 glass-panel p-4 space-y-4 bg-[#0c0c0e]/80">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3 select-none">
          <TerminalIcon className="text-cyan-500 w-4 h-4" />
          <h3 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-left font-mono text-xs transition-all duration-150 ${
                  isSelected 
                    ? "bg-white/5 border border-white/5 text-cyan-400 font-semibold"
                    : "text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon size={14} className={isSelected ? "text-cyan-400" : "text-zinc-500"} />
                  <span className="truncate">{tool.name}</span>
                </div>
                <span className="text-[8px] uppercase px-1.5 py-0.2 bg-zinc-950 border border-white/5 rounded text-zinc-500 font-mono">
                  {tool.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: WORKSPACE */}
      <div className="xl:col-span-3 space-y-6">
        
        {/* Active Tool Header Info */}
        <div className="glass-panel p-5 text-left bg-[#0c0c0e]/85">
          <div className="flex items-center gap-3 mb-2 select-none">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-white/5 flex items-center justify-center">
              <ToolIcon size={16} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono tracking-wide text-white uppercase">{currentTool.name}</h2>
              <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">{currentTool.category} Engine</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2 font-mono leading-relaxed">
            {currentTool.desc}
          </p>
        </div>

        {/* Dynamic Tool Form / Component */}
        <div className="glass-panel p-5 text-left bg-[#0c0c0e]/60 min-h-[25vh]">
          {currentTool.component}
        </div>

        {/* Global Scan Logs History */}
        <div className="glass-panel p-5 text-left bg-[#0c0c0e]/80">
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider border-b border-white/5 pb-2.5 mb-4 flex items-center gap-2 select-none">
            <History size={14} className="text-cyan-500" /> Output Stream History
          </h3>
          <ScanHistory />
        </div>

      </div>

    </div>
  );
}
