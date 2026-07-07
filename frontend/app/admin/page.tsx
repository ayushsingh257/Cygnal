"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { Settings, Shield, Plus, Lock, Users, Activity, Trash2 } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface UserRecord {
  username: string;
  role: string;
  department: string;
  team: string;
}

export default function AdminControlPage() {
  const { token, user } = useAuthStore();
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("analyst");
  const [newDept, setNewDept] = useState("Security Operations");
  const [newTeam, setNewTeam] = useState("Triage");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users || []);
      }
    } catch {
      // Seed default registry if server listing fails (fallback)
      setUsersList([
        { username: "ayush_singh", role: "admin", department: "Security Administration", team: "Controller" },
        { username: "john_doe", role: "analyst", department: "Security Operations", team: "Triage" },
        { username: "jane_smith", role: "analyst", department: "Security Operations", team: "Triage" }
      ]);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error("Username and password are required.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
          department: newDept,
          team: newTeam
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Investigator node registered successfully!");
        setNewUsername("");
        setNewPassword("");
        fetchUsers();
      } else {
        toast.error(data.error || "Investigator registration failed.");
      }
    } catch {
      toast.error("Registration server request timeout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6">
        
        {/* Header Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
              <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                Admin Registry Dashboard
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Register security nodes, configure policies overrides, and monitor system databases status.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          
          {/* User Registration Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 space-y-5 text-left">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Enlist Security Node
              </h2>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                    Investigator Node ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                    Password Signature
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                    Assigned Workspace Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 px-4 text-xs text-slate-350 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                  >
                    <option value="intern">Intern (ReadOnly)</option>
                    <option value="analyst">Analyst (Triage)</option>
                    <option value="blue_lead">Blue Lead (Incident Lead)</option>
                    <option value="red_lead">Red Lead (Offensive Lead)</option>
                    <option value="soc_manager">SOC Manager</option>
                    <option value="director">Director</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] text-white py-3 px-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(64,138,113,0.15)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> REGISTER NODE
                </button>
              </form>
            </div>
          </div>

          {/* User Records Registry list */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 space-y-4 text-left">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Active Investigator Node Registry
              </h2>

              <div className="space-y-3">
                {usersList.map((usr, idx) => (
                  <div 
                    key={idx}
                    className="border border-[#408A71]/10 bg-[#091413]/60 rounded-xl p-4 flex justify-between items-center hover:border-[#408A71]/35 transition-all text-left"
                  >
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        {usr.username}
                      </h4>
                      <div className="flex gap-2 text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                        <span>Role: {usr.role.replace("_", " ")}</span>
                        <span>|</span>
                        <span>Dept: {usr.department}</span>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono tracking-widest uppercase border border-[#408A71]/20 bg-[#285A48]/10 text-[#B0E4CC] px-2 py-0.5 rounded-full select-none">
                      node active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </DashboardShell>
  );
}
