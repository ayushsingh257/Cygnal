"use client";

import React from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { User, ShieldAlert, Key } from "lucide-react";

export default function ProfilePage() {
  const { user, token } = useAuthStore();

  if (!user) return null;

  return (
    <DashboardShell>
      <div className="space-y-6 text-left font-sans">
        
        {/* Title */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 select-none">
          <User className="text-blue-500 w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Investigator Profile
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">View your session credentials and security authorization level</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="glass-card rounded-xl p-6 bg-[#0d1117]/65 border border-white/5 max-w-xl space-y-6">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <div className="w-14 h-14 rounded-full bg-blue-550/10 border border-blue-500/20 flex items-center justify-center text-xl font-bold text-blue-450 font-mono">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-md font-bold text-white uppercase tracking-wide">{user.username}</h3>
              <p className="text-xs text-slate-500 font-mono capitalize mt-0.5">{user.role} Tier Access</p>
            </div>
          </div>

          <div className="space-y-4 font-mono text-xs text-slate-400">
            <div className="space-y-1">
              <span className="text-slate-550 text-[10px] uppercase tracking-wider block">Assigned Security Role</span>
              <span className="text-slate-200 uppercase flex items-center gap-1"><ShieldAlert size={12} className="text-blue-450" /> {user.role}</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-slate-550 text-[10px] uppercase tracking-wider block">Active Verification Token</span>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  readOnly
                  value={token || ""}
                  className="cyber-input pl-9 text-[10px] bg-black/40"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
