"use client";

import React, { useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { User, Shield, ShieldCheck, Mail, Database } from "lucide-react";

export default function ProfilePage() {
  const { user, loadUserFromStorage } = useAuthStore();

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  if (!user) return null;

  return (
    <DashboardShell>
      <div className="space-y-6">
        
        {/* Header Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
              <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                Investigator Node Profile
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Review active workspace credentials, role-based capabilities, and enlisting logs.
            </p>
          </div>
        </div>

        {/* Profile Card details */}
        <div className="max-w-2xl border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 sm:p-8 space-y-6 text-left flex flex-col sm:flex-row gap-8 items-start sm:items-center">
          {/* Avatar Icon */}
          <div className="w-24 h-24 rounded-full bg-[#285A48]/20 border border-[#B0E4CC]/30 flex items-center justify-center text-3xl font-black text-[#B0E4CC] shrink-0 select-none shadow-[0_0_20px_rgba(64,138,113,0.15)]">
            {user.username.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-4 flex-1">
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Investigator Name</span>
              <h2 className="text-xl font-bold text-white tracking-wide">{user.username}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-[#a3c2b4]/85 leading-normal">
              <div>
                <span className="text-slate-550 block uppercase">Workspace Role</span>
                <span className="text-white text-xs font-semibold uppercase">{user.role.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-slate-550 block uppercase">Department</span>
                <span className="text-white text-xs font-semibold">{user.department || "Security Operations"}</span>
              </div>
              <div>
                <span className="text-slate-550 block uppercase">Operational Team</span>
                <span className="text-[#B0E4CC] text-xs font-semibold uppercase">{user.team || "Triage"}</span>
              </div>
              <div>
                <span className="text-slate-550 block uppercase">Sealed Signature</span>
                <span className="text-emerald-400 text-xs font-semibold uppercase">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
