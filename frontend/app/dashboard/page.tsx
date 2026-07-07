"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Shield, Power, Activity } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, logout, loadUserFromStorage } = useAuthStore();

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  useEffect(() => {
    // If not authenticated, redirect back to login
    if (!useAuthStore.getState().token) {
      router.push("/login");
    }
  }, [token]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-center items-center font-mono text-xs animate-pulse">
        Initializing workspace cockpit...
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    toast.success("Session exited successfully.");
    setTimeout(() => {
      router.push("/login");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-6 flex flex-col justify-between font-sans select-none">
      <Toaster />
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-500/[0.01] rounded-full blur-[150px] pointer-events-none" />

      <header className="max-w-7xl mx-auto w-full flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-blue-500" />
          <span className="text-xs font-bold tracking-[0.25em] text-white uppercase">
            Cygnal Workspace
          </span>
        </div>

        <button 
          onClick={handleLogout}
          className="btn-cyber flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-red-400 border-red-500/10 hover:bg-red-500/10"
        >
          <Power size={11} /> Exit Session
        </button>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col justify-center py-12">
        <div className="glass-card rounded-2xl p-8 max-w-lg mx-auto w-full text-center space-y-6">
          <div className="flex justify-center select-none">
            <div className="h-10 w-10 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity size={18} />
            </div>
          </div>

          <div className="space-y-1.5 select-none">
            <h3 className="text-md font-bold text-white uppercase tracking-wide">
              Sentinel Active Ingress
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              Operational dashboard v1.0
            </p>
          </div>

          <div className="bg-[#111827]/40 border border-white/5 p-4 rounded-xl text-left text-xs font-mono space-y-2 select-none">
            <div className="flex justify-between">
              <span className="text-slate-550">Node ID:</span>
              <span className="text-slate-200 font-semibold">{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-550">Role Rank:</span>
              <span className="text-slate-400 capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-550">Department:</span>
              <span className="text-slate-400">{user.department || "Triage Operations"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-550">Security Team:</span>
              <span className="text-slate-400">{user.team || "Blue Team"}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto select-none">
            Era 2 (Authentication Core) is online. Dynamic dashboards grids, cases workflows, threat scanners, and RAG copilot widgets will be mounted in successive eras.
          </p>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto w-full text-center py-4 shrink-0">
        <span className="text-[9px] font-mono text-slate-650 uppercase tracking-widest">
          SSL Cryptographic Handshake Active
        </span>
      </footer>
    </div>
  );
}
