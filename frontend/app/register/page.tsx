"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Shield, Key, Eye, EyeOff, User, Layers } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("analyst");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("All credentials fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Secrets signatures do not match.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          role,
          department: "Security Operations",
          team: "Triage"
        })
      });

      const data = await res.json();
      if (data.success) {
        login(data.token, data.user);
        toast.success("Enlistment recorded! Directing to security handshake...");
        
        setTimeout(() => {
          router.push("/email-verification");
        }, 850);
      } else {
        toast.error(data.error || "Enlistment rejected by security controller.");
        setLoading(false);
      }
    } catch {
      toast.error("Database registration synchronize timed out.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between p-6 relative font-sans overflow-hidden select-none">
      <Toaster />
      <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-[130px] pointer-events-none" />

      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-blue-500" />
          <span className="text-xs font-bold tracking-[0.25em] text-white uppercase">
            Cygnal
          </span>
        </Link>
        <Link href="/login" className="text-[10px] font-mono text-slate-500 hover:text-slate-350 uppercase tracking-widest">
          Sign In
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-[390px] bg-[#0b0f19]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-wide text-white uppercase">
              Enlist Investigator
            </h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Register a new sentinel identity node
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block">
                Investigator Node ID
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-550" />
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="cyber-input pl-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block">
                Proposed Workspace Role
              </label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-555" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="cyber-input pl-11 bg-[#0b0f19] appearance-none cursor-pointer"
                >
                  <option value="analyst">Analyst (Tier 1/2 Triage)</option>
                  <option value="intern">Intern (ReadOnly Viewer)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block">
                Secret Password Signature
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-555" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cyber-input pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-350 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block">
                Confirm Password Signature
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="cyber-input"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-cyber-primary w-full py-3.5 text-xs font-semibold tracking-widest uppercase mt-4"
            >
              {loading ? "Registering..." : "Create Cygnal Account"}

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
