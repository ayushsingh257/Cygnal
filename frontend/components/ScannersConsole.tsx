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
  Terminal as TerminalIcon,
  Play
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

  // Group tools by categories for elegant side grouping
  const categories = Array.from(new Set(tools.map(t => t.category)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left font-sans select-none">
      
      {/* LEFT COLUMN: NAVIGATION LIST (Lg: 3) */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Modules directory container */}
        <div className="glass-card rounded-xl p-4.5 bg-[#0b0f19]/60">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
            <TerminalIcon className="text-blue-500 w-4 h-4" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Tool Directories
            </h3>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat} className="space-y-1">
                <span className="block text-[9px] font-mono text-slate-550 uppercase tracking-widest px-2 mb-1.5">{cat}</span>
                {tools
                  .filter((t) => t.category === cat)
                  .map((tool) => {
                    const Icon = tool.icon;
                    const isSelected = activeTab === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTab(tool.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 ${
                          isSelected 
                            ? "bg-blue-500/10 text-blue-400 font-semibold"
                            : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon size={14} className={isSelected ? "text-blue-455" : "text-slate-500"} />
                          <span className="truncate">{tool.name}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: ACTIVE WORKSPACE CONSOLE (Lg: 9) */}
      <div className="lg:col-span-9 space-y-6">
        
        {/* Workspace Console Header & Active Form */}
        <div className="glass-card rounded-xl p-6 bg-[#0b0f19]/65">
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-white/5 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-blue-400 font-bold uppercase tracking-wider">Active Workspace</span>
                <span className="badge-medium text-[8px]">
                  {currentTool.category}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-1.5 uppercase font-mono tracking-wide">{currentTool.name}</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-sans">{currentTool.desc}</p>
            </div>
          </div>

          <div className="space-y-4">
            {currentTool.component}
          </div>
        </div>

        {/* Scan History list wrapper */}
        <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/60">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-4">
            <History size={14} className="text-blue-500" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Operations History ({currentTool.name})
            </h3>
          </div>
          
          <ScanHistory toolFilter={currentTool.name} />
        </div>

      </div>

    </div>
  );
}
