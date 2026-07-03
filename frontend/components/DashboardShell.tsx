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
  ChevronLeft, 
  ChevronRight,
  Database
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

  // Poll active background scans count
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

  // Redirection guard
  useEffect(() => {
    const storedUser = localStorage.getItem("cygnal_user");
    if (!storedUser) {
      router.push("/auth?mode=login");
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-mono">
        <div className="text-zinc-500 flex items-center gap-2 text-xs animate-pulse">
          <Terminal className="animate-spin w-4 h-4 text-cyan-500" /> INITIALIZING SECURE PROTOCOLS...
        </div>
      </div>
    );
  }

  const defconColors: Record<string, string> = {
    "5": "border-zinc-800 text-green-400 bg-green-950/10",
    "4": "border-zinc-800 text-blue-400 bg-blue-950/10",
    "3": "border-zinc-800 text-yellow-400 bg-yellow-950/10",
    "2": "border-zinc-800 text-orange-400 bg-orange-950/10",
    "1": "border-zinc-850 text-red-500 bg-red-950/20 animate-pulse"
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
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`bg-[#0c0c0e] border-r border-white/5 transition-all duration-200 flex flex-col justify-between select-none ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div>
          {/* Logo / Brand Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/5">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-500" />
                <span className="text-sm font-semibold tracking-wider font-mono text-white uppercase">
                  Cygnal
                </span>
              </Link>
            )}
            {collapsed && (
              <div className="w-full flex justify-center">
                <Shield className="w-5 h-5 text-cyan-500" />
              </div>
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-2.5 space-y-0.5">
            {allowedLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-xs transition-all duration-150 ${
                    isActive 
                      ? "bg-white/5 border border-white/5 text-cyan-400 font-medium" 
                      : "text-zinc-400 border border-transparent hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon size={14} className={isActive ? "text-cyan-400" : "text-zinc-500"} />
                  {!collapsed && <span className="truncate">{link.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-2.5 border-t border-white/5 bg-black/10">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-zinc-900/40 border border-white/5 rounded-md">
                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold font-mono text-cyan-400">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-[10px] text-zinc-300 truncate leading-none mb-1">{user.username}</div>
                  <div className="text-[9px] text-zinc-500 font-mono capitalize leading-none">{user.role}</div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-red-500/20 bg-red-950/5 hover:bg-red-950/15 text-red-400 rounded-md font-mono text-[10px] transition"
              >
                <LogOut size={12} /> Exit Portal
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold font-mono text-cyan-400">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <button 
                onClick={logout}
                title="Log out"
                className="p-2 hover:bg-white/5 text-red-400 rounded transition"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* HEADER & VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-14 border-b border-white/5 bg-[#09090b]/80 backdrop-filter blur-md flex items-center justify-between px-6 z-20 select-none">
          
          {/* Health indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline">Sensors:</span>
              <span className="text-emerald-400 font-medium">ACTIVE</span>
            </div>

            {/* Active scan indicator */}
            {activeScansCount > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-500/10 px-2 py-0.5 rounded">
                <Activity size={10} className="animate-pulse text-cyan-400" />
                <span>{activeScansCount} RUNNING</span>
              </div>
            )}
          </div>

          {/* Quick Info & DEFCON dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <select 
                value={defconLevel} 
                onChange={(e) => setDefconLevel(e.target.value)}
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 border rounded cursor-pointer outline-none transition-all duration-150 ${
                  defconColors[defconLevel]
                }`}
              >
                <option value="5" className="bg-[#09090b] text-green-400">DEFCON 5</option>
                <option value="4" className="bg-[#09090b] text-blue-400">DEFCON 4</option>
                <option value="3" className="bg-[#09090b] text-yellow-400">DEFCON 3</option>
                <option value="2" className="bg-[#09090b] text-orange-400">DEFCON 2</option>
                <option value="1" className="bg-[#09090b] text-red-500">DEFCON 1</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1 bg-zinc-900/40 border border-white/5 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400">
              <Database size={10} className="text-cyan-500" />
              <span className="hidden sm:inline">cygnal.db</span>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 cyber-grid">
          {children}
        </main>
      </div>

    </div>
  );
}
