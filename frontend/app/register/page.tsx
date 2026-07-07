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
    <div className="min-h-screen bg-[#091413] text-slate-100 flex flex-col justify-between p-6 relative font-sans overflow-hidden select-none">
      <Toaster />
      
      {/* Background visual shadows */}
      <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-[#408A71]/[0.03] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-[10%] right-[10%] w-[400px] h-[400px] bg-[#B0E4CC]/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-4 z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-[#B0E4CC]" />
          <span className="text-xs font-bold tracking-[0.25em] text-white uppercase">
            Cygnal
          </span>
        </Link>
        <Link href="/login" className="text-[10px] font-mono text-slate-400 hover:text-[#B0E4CC] uppercase tracking-widest transition-colors">
          Sign In
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 z-10">
        <div className="w-full max-w-[400px] bg-[#0f2422]/20 backdrop-blur-xl border border-[#408A71]/15 rounded-2xl p-8 shadow-[0_0_50px_rgba(64,138,113,0.1)] space-y-6">
          
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-wide text-white uppercase font-mono">
              Enlist Investigator
            </h2>
            <p className="text-[9px] text-[#a3c2b4] uppercase tracking-widest font-mono opacity-80">
              Register a new cygnal identity node
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                Investigator Node ID
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#408A71]/70" />
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                Proposed Workspace Role
              </label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-3.5 h-4 w-4 text-[#408A71]/70" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 pl-11 pr-8 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono appearance-none cursor-pointer"
                >
                  <option value="analyst">Analyst (Tier 1/2 Triage)</option>
                  <option value="intern">Intern (ReadOnly Viewer)</option>
                </select>
                <div className="absolute right-3.5 top-4 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#408A71]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                Secret Password Signature
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-[#408A71]/70" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 pl-11 pr-11 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-[#408A71]/70 hover:text-[#B0E4CC] transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                Confirm Password Signature
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 px-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
              />
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(64,138,113,0.2)] transition-all disabled:opacity-50"
              >
                {loading ? "Registering..." : "Create Cygnal Account"}
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <span className="text-[10px] text-slate-400">
              Already enlisted?{" "}
              <Link href="/login" className="text-[#B0E4CC] hover:underline font-semibold">
                Sign In
              </Link>
            </span>
          </div>

        </div>
      </main>

      <footer className="w-full text-center py-4 z-10">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          SSL Cryptographic Handshake Active
        </span>
      </footer>
    </div>
  );
}
