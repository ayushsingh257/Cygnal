"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Shield, 
  Terminal, 
  LayoutDashboard, 
  Briefcase, 
  Activity, 
  FileSpreadsheet, 
  Settings, 
  LogOut, 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Cpu
} from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const { user, token, logout, loadUserFromStorage } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [activeScansCount, setActiveScansCount] = useState(0);
  const [defconLevel, setDefconLevel] = useState("3"); // DEFCON 3: Elevated

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Poll for active background scans
  useEffect(() => {
    if (!token) return;

    async function checkScans() {
      try {
        const res = await fetch("/api/tasks", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks)) {
          const running = data.tasks.filter((t: any) => t.status === "running" || t.status === "pending");
          setActiveScansCount(running.length);
        }
      } catch (err) {
        console.error("Failed to query tasks in shell header", err);
      }
    }

    checkScans();
    const interval = setInterval(checkScans, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle auto redirection if not logged in
  useEffect(() => {
    const storedUser = localStorage.getItem("cygnal_user");
    if (!storedUser) {
      router.push("/auth?mode=login");
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center font-mono">
        <div className="text-cyan-400 flex items-center gap-3 text-lg animate-pulse">
          <Terminal className="animate-spin" /> INITIALIZING SECURE TERMINAL STATE...
        </div>
      </div>
    );
  }

  const defconColors: Record<string, string> = {
    "5": "border-green-500 text-green-400 bg-green-950/20",
    "4": "border-blue-500 text-blue-400 bg-blue-950/20",
    "3": "border-yellow-500 text-yellow-400 bg-yellow-950/20",
    "2": "border-orange-500 text-orange-400 bg-orange-950/20",
    "1": "border-red-500 text-red-400 bg-red-950/20 animate-pulse"
  };

  const defconLabels: Record<string, string> = {
    "5": "DEFCON 5: NORMAL",
    "4": "DEFCON 4: GUARDED",
    "3": "DEFCON 3: ELEVATED",
    "2": "DEFCON 2: HIGH",
    "1": "DEFCON 1: CRITICAL"
  };

  const navLinks = [
    {
      name: "Security Console",
      href: "/",
      icon: Terminal,
      roles: ["admin", "analyst", "viewer"]
    },
    {
      name: "SOC Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin"]
    },
    {
      name: "Incident Case Files",
      href: "/cases",
      icon: Briefcase,
      roles: ["admin", "analyst"]
    },
    {
      name: "System Auditing",
      href: "/admin/audit",
      icon: FileSpreadsheet,
      roles: ["admin"]
    },
    {
      name: "Administrative Portal",
      href: "/admin",
      icon: Settings,
      roles: ["admin"]
    }
  ];

  const allowedLinks = navLinks.filter(link => link.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#020205] text-[#f1f5f9] flex overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`glass-panel rounded-none border-y-0 border-l-0 bg-[#05050b]/80 border-r border-white/5 transition-all duration-300 flex flex-col justify-between ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div>
          {/* Logo / Title Area */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black/30">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-400 glow-cyan" />
                <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent uppercase tracking-wider font-mono">
                  Cygnal
                </span>
              </Link>
            )}
            {collapsed && (
              <div className="w-full flex justify-center">
                <Shield className="w-6 h-6 text-cyan-400 glow-cyan" />
              </div>
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-400 hover:text-cyan-400 hover:bg-white/5 p-1 rounded-md transition"
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {allowedLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-mono text-sm transition-all duration-200 ${
                    isActive 
                      ? "bg-purple-950/30 border border-purple-500/50 text-cyan-400 shadow-md shadow-purple-950/20" 
                      : "text-gray-400 border border-transparent hover:text-gray-200 hover:bg-white/5 hover:border-white/5"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-cyan-400 glow-cyan" : "text-gray-400"} />
                  {!collapsed && <span className="truncate">{link.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & controls footer */}
        <div className="p-3 border-t border-white/5 bg-black/20">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-zinc-950/60 border border-white/5 rounded-md">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold font-mono">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-xs text-gray-200 truncate">{user.username}</div>
                  <div className="text-[10px] text-gray-500 font-mono capitalize">{user.role}</div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2 border border-red-500/30 bg-red-950/10 hover:bg-red-950/30 text-red-400 rounded-md font-mono text-xs transition"
              >
                <LogOut size={14} /> Log out Session
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold font-mono">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <button 
                onClick={logout}
                title="Log out"
                className="p-2 hover:bg-white/5 border border-transparent hover:border-red-500/20 text-red-400 rounded-md transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* TOP HEADER & WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Info Strip */}
        <header className="h-16 border-b border-white/5 bg-[#05050b]/80 backdrop-filter blur-md flex items-center justify-between px-6 z-20">
          
          {/* Header Left: Health Monitors */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-md shadow-green-500/50" />
              <span className="hidden sm:inline">MDR INTERACTIVE SENSORS: </span>
              <span className="text-green-400 font-bold">ONLINE</span>
            </div>

            {/* Live active scan tracking spinner */}
            {activeScansCount > 0 && (
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-500/40 px-2 py-1 rounded">
                <Activity size={12} className="animate-pulse" />
                <span>{activeScansCount} SECURE SCANS ACTIVE</span>
              </div>
            )}
          </div>

          {/* Header Right: Controls */}
          <div className="flex items-center gap-4">
            
            {/* DEFCON Level tactical selector */}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[10px] font-mono text-gray-500 uppercase">Alert Level:</span>
              <select 
                value={defconLevel} 
                onChange={(e) => setDefconLevel(e.target.value)}
                className={`text-xs font-mono font-semibold px-2.5 py-1 border rounded cursor-pointer outline-none transition-all duration-200 ${
                  defconColors[defconLevel]
                }`}
              >
                <option value="5" className="bg-[#020205] text-green-400">DEFCON 5 (Normal)</option>
                <option value="4" className="bg-[#020205] text-blue-400">DEFCON 4 (Guarded)</option>
                <option value="3" className="bg-[#020205] text-yellow-400">DEFCON 3 (Elevated)</option>
                <option value="2" className="bg-[#020205] text-orange-400">DEFCON 2 (High)</option>
                <option value="1" className="bg-[#020205] text-red-400">DEFCON 1 (Critical)</option>
              </select>
            </div>
            
            {/* Database indicator */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-white/5 px-2 py-1 rounded text-xs font-mono text-gray-400" title="Unified SQLite Status">
              <Database size={12} className="text-cyan-500" />
              <span className="hidden sm:inline text-[10px]">cygnal.db</span>
            </div>
          </div>
        </header>

        {/* Content Workspace Slot */}
        <main className="flex-1 overflow-y-auto px-6 py-6 cyber-grid">
          {children}
        </main>
      </div>

    </div>
  );
}
