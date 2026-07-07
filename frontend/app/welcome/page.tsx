"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Shield, ShieldCheck, ArrowRight } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const { user, loadUserFromStorage } = useAuthStore();

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-center items-center font-mono text-xs">
        Syncing credentials node...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between p-6 relative select-none font-sans overflow-hidden">
      <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-[130px] pointer-events-none" />

      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-blue-500" />
          <span className="text-xs font-bold tracking-[0.25em] text-white uppercase">
            Cygnal
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-[400px] bg-[#0b0f19]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
          
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center animate-bounce">
              <ShieldCheck size={22} />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-wide text-white uppercase">
              Welcome, Agent
            </h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Workspace node registration active
            </p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            Your investigator profile has been initialized with <strong>{user.role.toUpperCase()}</strong> authority. Your scans dispatches and incident timeline additions are secured under active database audit ledgers.
          </p>

          <div className="bg-[#111827]/40 border border-white/5 p-4 rounded-xl text-left text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-550">Node:</span>
              <span className="text-slate-200 font-semibold">{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-550">Department:</span>
              <span className="text-slate-200">{user.department || "SecOps"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-550">Team:</span>
              <span className="text-slate-200">{user.team || "Triage"}</span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="btn-cyber-primary w-full py-3.5 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 mt-2"
          >
            Launch Operations Console <ArrowRight size={13} />
          </Link>

        </div>
      </main>

      <footer className="w-full text-center py-4">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          SSL Cryptographic Handshake Active
        </span>
      </footer>
    </div>
  );
}
