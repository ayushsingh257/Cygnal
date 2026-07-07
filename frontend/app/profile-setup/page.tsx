"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Shield, UserCheck } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, token, setUser, loadUserFromStorage } = useAuthStore();
  const [department, setDepartment] = useState("Security Operations");
  const [team, setTeam] = useState("Triage");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useAuthStore.getState().user || !token) {
      toast.error("Unauthenticated investigator node.");
      return;
    }
    const activeUser = useAuthStore.getState().user!;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${activeUser.username}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          department,
          team
        })
      });

      const data = await res.json();
      if (data.success) {
        setUser({ ...activeUser, department, team }, token);
        toast.success("Profile setup complete!");
        setTimeout(() => {
          router.push("/welcome");
        }, 500);
      } else {
        toast.error(data.error || "Failed to update profile settings.");
        setLoading(false);
      }
    } catch {
      toast.error("Database profile sync failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between p-6 relative select-none font-sans overflow-hidden">
      <Toaster />
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
        <div className="w-full max-w-[380px] bg-[#0b0f19]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-wide text-white uppercase flex items-center justify-center gap-2">
              <UserCheck className="text-blue-555" /> Profile Setup
            </h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Configure workspace coordinates
            </p>
          </div>

          <form onSubmit={handleSetup} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block">
                Department Assignment
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="cyber-input bg-[#0b0f19] appearance-none"
              >
                <option value="Security Operations">Security Operations</option>
                <option value="Offensive Security">Red Team</option>
                <option value="Incident Response">DFIR</option>
                <option value="Threat Intelligence">CTI</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block">
                Security Team
              </label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="cyber-input bg-[#0b0f19] appearance-none"
              >
                <option value="Triage">SOC Triage</option>
                <option value="Penetration Testing">Offensive Ops</option>
                <option value="Incident Response">Blue Team IR</option>
                <option value="Malware Analysis">Reverse Engineering</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-cyber-primary w-full py-3.5 text-xs font-semibold tracking-widest uppercase mt-4"
            >
              {loading ? "Saving Setup..." : "Commit Setup Coordinates"}
            </button>
          </form>

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
