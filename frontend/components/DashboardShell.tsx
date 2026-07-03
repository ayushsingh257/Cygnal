"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Shield, 
  Terminal, 
  BarChart3, 
  Briefcase, 
  Settings, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Database,
  Activity,
  Heart
} from "lucide-react";
import { toast } from "react-hot-toast";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [activeScansCount, setActiveScansCount] = useState(0);
  const [defconLevel, setDefconLevel] = useState("3");

  const defconColors: Record<string, string> = {
    "5": "border-emerald-500/30 text-emerald-400 bg-emerald-950/10",
    "4": "border-blue-500/30 text-blue-400 bg-blue-950/10",
    "3": "border-yellow-500/30 text-yellow-400 bg-yellow-950/10",
    "2": "border-orange-500/30 text-orange-400 bg-orange-950/10",
    "1": "border-red-500/30 text-red-500 bg-red-950/10 hud-pulse-red"
  };

  // Poll background scan queue
  useEffect(() => {
    if (!token) return;

    const checkActiveScans = async () => {
      try {
        const res = await fetch("/api/tasks", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks)) {
          const active = data.tasks.filter((t: any) => t.status === "processing" || t.status === "pending");
          setActiveScansCount(active.length);
        }
      } catch {
        // Silent catch
      }
    };

    checkActiveScans();
    const interval = setInterval(checkActiveScans, 4000);
    return () => clearInterval(interval);
  }, [token]);

  if (!user) {
    return null;
  }

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
      icon: BarChart3,
      roles: ["admin", "analyst", "viewer"]
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
    <div className="min-h-screen bg-[#060814] text-[#f1f5f9] flex overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`bg-[#0a0d1a] border-r border-white/5 transition-all duration-350 flex flex-col justify-between select-none ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/5">
            {!collapsed ? (
              <Link href="/" className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-extrabold tracking-[0.2em] font-mono text-white uppercase">
                  CYGNAL
                </span>
              </Link>
            ) : (
              <div className="w-full flex justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-500 hover:text-white p-1 rounded transition-colors duration-150"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {allowedLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium tracking-wide transition-all duration-200 ${
                    isActive 
                      ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400" 
                      : "text-slate-400 border border-transparent hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-cyan-400" : "text-slate-450"} />
                  {!collapsed && <span className="truncate">{link.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-3 border-t border-white/5 bg-black/20">
          {!collapsed ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-2 bg-[#0d1117] border border-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-center text-xs font-bold font-mono text-cyan-400">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-xs text-white truncate">{user.username}</div>
                  <div className="text-[10px] text-slate-500 font-mono capitalize mt-0.5">{user.role}</div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-red-500/20 bg-red-950/5 hover:bg-red-500/10 text-red-400 rounded-lg font-mono text-[10px] transition-all duration-150 uppercase tracking-widest"
              >
                <LogOut size={11} /> Exit Portal
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-center text-xs font-bold font-mono text-cyan-400">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <button 
                onClick={logout}
                title="Log out"
                className="p-2 hover:bg-red-950/15 text-red-400 rounded-lg transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* HEADER & VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-white/5 bg-[#0a0d1a]/85 backdrop-blur-md flex items-center justify-between px-6 z-20 select-none">
          
          {/* Health indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="status-dot-green" />
              <span className="hidden sm:inline">Sensors:</span>
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">ACTIVE</span>
            </div>

            {/* Active scan indicator */}
            {activeScansCount > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-500/10 px-2 py-0.5 rounded animate-pulse">
                <Activity size={10} className="text-cyan-400" />
                <span>{activeScansCount} IN PROGRESS</span>
              </div>
            )}
          </div>

          {/* Quick Info & DEFCON dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <select 
                value={defconLevel} 
                onChange={(e) => setDefconLevel(e.target.value)}
                className={`text-[10px] font-mono font-semibold px-2.5 py-1 border rounded-md cursor-pointer outline-none transition-all duration-150 ${
                  defconColors[defconLevel]
                }`}
              >
                <option value="5" className="bg-[#0a0d1a] text-green-400">DEFCON 5</option>
                <option value="4" className="bg-[#0a0d1a] text-blue-400">DEFCON 4</option>
                <option value="3" className="bg-[#0a0d1a] text-yellow-400">DEFCON 3</option>
                <option value="2" className="bg-[#0a0d1a] text-orange-400">DEFCON 2</option>
                <option value="1" className="bg-[#0a0d1a] text-red-500 font-bold">DEFCON 1</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1.5 bg-[#0d1117] border border-white/5 px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-400">
              <Database size={10} className="text-cyan-400" />
              <span className="hidden sm:inline">cygnal.db</span>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-[#060814] cyber-grid-bg">
          {children}
        </main>
      </div>

    </div>
  );
}
