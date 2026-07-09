"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { io } from "socket.io-client";
import { 
  Shield, 
  BarChart3, 
  Terminal, 
  Briefcase, 
  MessageSquare, 
  Cpu, 
  FileText, 
  Search, 
  FileSpreadsheet, 
  Settings, 
  User, 
  Sliders, 
  Power, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Database,
  Bell,
  Check,
  AlertCircle
} from "lucide-react";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token, loadUserFromStorage } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [activeScansCount, setActiveScansCount] = useState(0);

  // Phase 4: Collaboration Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    if (!token) return;

    // Fetch initial notifications list
    fetch("/api/notifications", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotifications(data.notifications);
        }
      })
      .catch(err => console.error("Error fetching notifications:", err));

    // Setup Socket.IO connection
    const connectionUrl = window.location.origin === "http://localhost:3000" ? "http://127.0.0.1:5000" : window.location.origin;
    const socket = io(connectionUrl, {
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      socket.emit("join_user", { token });
    });

    socket.on("new_notification", (notification: any) => {
      setNotifications(prev => [notification, ...prev]);

      // Trigger temporary toast popup
      const toastId = Math.random().toString();
      setToasts(prev => [...prev, { ...notification, toastId }]);

      // Auto-remove toast after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.toastId !== toastId));
      }, 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSingleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ids: [id] })
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token && !useAuthStore.getState().token) {
      router.push("/login");
    }
  }, [token]);

  if (!user) {
    return null;
  }

  const sections = [
    {
      title: "Workspace Cockpit",
      links: [
        { name: "Operations Hub", href: "/dashboard", icon: BarChart3, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst", "intern"] },
        { name: "Scanners Directory", href: "/scanners", icon: Terminal, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst", "intern"] },
        { name: "Incident Cases", href: "/cases", icon: Briefcase, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst"] },
        { name: "AI Investigation Copilot", href: "/copilot", icon: Cpu, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst", "intern"] },
        { name: "RAG AI Assistant", href: "/chat", icon: MessageSquare, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst", "intern"] },
        { name: "Multi-Agent AI", href: "/agents", icon: Cpu, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst"] },
      ]
    },
    {
      title: "Management & Telemetry",
      links: [
        { name: "Reports Compiler", href: "/reports", icon: FileText, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst"] },
        { name: "Employee Analytics", href: "/analytics", icon: Search, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead"] },
        { name: "System Auditing", href: "/admin/audit", icon: FileSpreadsheet, roles: ["admin"] },
        { name: "Admin Control", href: "/admin", icon: Settings, roles: ["admin"] }
      ]
    },
    {
      title: "Personal Node",
      links: [
        { name: "Investigator Profile", href: "/profile", icon: User, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst", "intern"] },
        { name: "Configurations", href: "/settings", icon: Sliders, roles: ["admin", "director", "soc_manager", "red_lead", "blue_lead", "analyst", "intern"] }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-[#f1f5f9] flex overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`bg-[#0b0f19]/90 border-r border-white/5 transition-all duration-300 flex flex-col justify-between select-none relative z-30 ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/5">
            {!collapsed ? (
              <Link href="/" className="flex items-center gap-2.5">
                <Shield className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                <span className="text-[11px] font-black tracking-[0.25em] text-white uppercase font-sans">
                  Cygnal
                </span>
              </Link>
            ) : (
              <div className="w-full flex justify-center">
                <Shield className="w-4.5 h-4.5 text-blue-500" />
              </div>
            )}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-500 hover:text-white p-1 rounded transition-colors"
            >
              {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>

          {/* Navigation Menu */}
          <div className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-160px)] scrollbar-none">
            {sections.map((sec, secIdx) => {
              const visibleLinks = sec.links.filter(link => link.roles.includes(user.role));
              if (visibleLinks.length === 0) return null;

              return (
                <div key={secIdx} className="space-y-1">
                  {!collapsed && (
                    <h4 className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      {sec.title}
                    </h4>
                  )}
                  <nav className="space-y-0.5">
                    {visibleLinks.map((link) => {
                      const Icon = link.icon;
                      const isActive = pathname === link.href || (link.href === "/scanners" && pathname?.startsWith("/scanners"));
                      return (
                        <Link 
                          key={link.name} 
                          href={link.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium tracking-wide transition-all duration-150 ${
                            isActive 
                              ? "bg-blue-500/10 text-blue-400 font-semibold border-l-2 border-blue-500 rounded-l-none" 
                              : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                          }`}
                        >
                          <Icon size={14} className={isActive ? "text-blue-400" : "text-slate-500"} />
                          {!collapsed && <span className="truncate">{link.name}</span>}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Card Profile Footer */}
        <div className="p-3 border-t border-white/5 bg-black/10">
          {!collapsed ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 p-2 bg-[#111827]/40 border border-white/5 rounded-xl overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-blue-550/10 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 select-none">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden leading-tight text-left">
                  <div className="font-semibold text-xs text-white truncate">{user.username}</div>
                  <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider truncate mt-0.5">
                    {user.role.replace("_", " ")}
                  </div>
                  {user.team && (
                    <div className="text-[8px] text-blue-400 font-mono tracking-wider truncate mt-0.5">
                      {user.team.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-red-500/20 bg-red-950/5 hover:bg-red-500/15 text-red-450 rounded-lg font-mono text-[9px] transition-all duration-150 uppercase tracking-widest"
              >
                <Power size={11} /> Exit Session
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-550/10 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <button 
                onClick={logout}
                title="Exit Session"
                className="p-2 hover:bg-red-950/15 text-red-400 rounded-lg transition"
              >
                <Power size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* HEADER & VIEWPORT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-white/5 bg-[#0b0f19]/80 backdrop-blur-md flex items-center justify-between px-6 z-20 select-none shrink-0">
          
          {/* Health indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span className="hidden sm:inline">Sensors Status:</span>
              <span className="text-emerald-400 font-bold uppercase tracking-widest">OK</span>
            </div>

            {/* Active scan indicator */}
            {activeScansCount > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400 bg-blue-950/20 border border-blue-500/10 px-2 py-0.5 rounded animate-pulse">
                <Activity size={10} className="text-blue-400" />
                <span>{activeScansCount} EXECUTIONS RUNNING</span>
              </div>
            )}
          </div>

          {/* Database link status and Bell Notifications */}
          <div className="flex items-center gap-3 relative">
            <div className="flex items-center gap-1.5 bg-[#111827]/40 border border-white/5 px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-550">
              <Database size={10} className="text-blue-400" />
              <span className="hidden sm:inline">Relational Ledger:</span>
              <span className="text-slate-400">cygnal.db</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="p-1.5 text-slate-400 hover:text-white bg-[#111827]/40 border border-white/5 rounded-lg transition-all duration-150 flex items-center justify-center relative"
                title="System Notifications"
              >
                <Bell size={14} className={unreadCount > 0 ? "text-blue-400" : ""} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 border border-[#0b0f19] text-white rounded-full text-[8px] font-extrabold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Glassmorphic Notification Dropdown */}
              {dropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2.5 w-80 bg-[#0b0f19]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 text-left font-sans animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[9px] font-mono text-blue-400 hover:text-blue-300 hover:underline transition-colors uppercase tracking-widest"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-white/5 scrollbar-none">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs">
                          No notifications received
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              if (n.case_id) {
                                router.push(`/cases`);
                              }
                              setDropdownOpen(false);
                            }}
                            className={`p-3 hover:bg-white/[0.02] cursor-pointer transition-all duration-150 relative ${
                              !n.is_read ? "bg-blue-500/[0.02]" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div>
                                <div className="text-[11px] font-semibold text-white leading-tight">
                                  {n.title}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                                  {n.content}
                                </div>
                                <div className="text-[8px] text-slate-550 font-mono mt-1.5">
                                  {new Date(n.created_at).toLocaleTimeString()}
                                </div>
                              </div>
                              {!n.is_read && (
                                <button
                                  onClick={(e) => handleMarkSingleRead(n.id, e)}
                                  className="p-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors shrink-0"
                                  title="Mark read"
                                >
                                  <Check size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Real-time Notification Toasts container */}
        <div className="fixed bottom-6 right-6 space-y-3 z-50 pointer-events-none w-80">
          {toasts.map((t) => (
            <div
              key={t.toastId}
              className="pointer-events-auto p-4 bg-[#0b0f19]/95 backdrop-blur-xl border border-blue-500/30 rounded-xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300 font-sans"
            >
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-bold text-white tracking-wider uppercase font-mono">
                  {t.title}
                </div>
                <div className="text-xs text-slate-300 mt-1 leading-snug">
                  {t.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Viewport Content wrapped in max-width centered container */}
        <main className="flex-1 overflow-y-auto bg-[#030712]">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8 select-text">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
