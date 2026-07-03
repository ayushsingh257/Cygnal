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
  Cpu,
  MessageSquare,
  Search,
  FileText,
  Sliders,
  User,
  Globe
} from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [activeScansCount, setActiveScansCount] = useState(0);

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
      name: "Incident Cases",
      href: "/cases",
      icon: Briefcase,
      roles: ["admin", "analyst"]
    },
    {
      name: "Threat Intelligence",
      href: "/intel",
      icon: Globe,
      roles: ["admin", "analyst", "viewer"]
    },
    {
      name: "Multi-Agent AI",
      href: "/agents",
      icon: Cpu,
      roles: ["admin", "analyst"]
    },
    {
      name: "RAG AI Chat",
      href: "/chat",
      icon: MessageSquare,
      roles: ["admin", "analyst", "viewer"]
    },
    {
      name: "Unified Search",
      href: "/search",
      icon: Search,
      roles: ["admin", "analyst", "viewer"]
    },
    {
      name: "Reports Compiler",
      href: "/reports",
      icon: FileText,
      roles: ["admin", "analyst"]
    },
    {
      name: "System Auditing",
      href: "/admin/audit",
      icon: FileSpreadsheet,
      roles: ["admin"]
    },
    {
      name: "Admin Control",
      href: "/admin",
      icon: Settings,
      roles: ["admin"]
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Sliders,
      roles: ["admin", "analyst", "viewer"]
    },
    {
      name: "My Profile",
      href: "/profile",
      icon: User,
      roles: ["admin", "analyst", "viewer"]
    }
  ];

  const allowedLinks = navLinks.filter(link => link.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#060814] text-[#f1f5f9] flex overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`bg-[#0d1117] border-r border-white/5 transition-all duration-300 flex flex-col justify-between select-none ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/5">
            {!collapsed ? (
              <Link href="/" className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-bold tracking-[0.15em] text-white font-sans uppercase">
                  Cygnal SOC
                </span>
              </Link>
            ) : (
              <div className="w-full flex justify-center">
                <Shield className="w-5 h-5 text-blue-500" />
              </div>
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-500 hover:text-white p-1 rounded transition-colors duration-155"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {allowedLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name} 
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium tracking-wide transition-all duration-150 ${
                    isActive 
                      ? "bg-blue-500/10 text-blue-400 font-semibold" 
                      : "text-slate-450 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-blue-450" : "text-slate-500"} />
                  {!collapsed && <span className="truncate">{link.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-3 border-t border-white/5 bg-black/10 select-none">
          {!collapsed ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-2 bg-[#161b22] border border-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-550/10 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-xs text-white truncate">{user.username}</div>
                  <div className="text-[10px] text-slate-500 font-mono capitalize mt-0.5">{user.role}</div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-red-500/20 bg-red-950/5 hover:bg-red-500/15 text-red-400 rounded-lg font-mono text-[10px] transition-all duration-150 uppercase tracking-widest"
              >
                <LogOut size={11} /> Exit Portal
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-550/10 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <button 
                onClick={logout}
                title="Log out"
                className="p-2 hover:bg-red-955/15 text-red-450 rounded-lg transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* HEADER & VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-white/5 bg-[#0d1117]/80 backdrop-blur-md flex items-center justify-between px-6 z-20 select-none">
          
          {/* Health indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span className="hidden sm:inline">Sensors:</span>
              <span className="text-emerald-400 font-semibold uppercase tracking-wider">ACTIVE</span>
            </div>

            {/* Active scan indicator */}
            {activeScansCount > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400 bg-blue-950/20 border border-blue-500/10 px-2 py-0.5 rounded animate-pulse">
                <Activity size={10} className="text-blue-450" />
                <span>{activeScansCount} IN PROGRESS</span>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#161b22] border border-white/5 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400">
              <Database size={10} className="text-blue-450" />
              <span className="hidden sm:inline">cygnal.db</span>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-[#060814]">
          {children}
        </main>
      </div>

    </div>
  );
}
