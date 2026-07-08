"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Shield, Key, Eye, EyeOff, User } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { login, loadUserFromStorage, user } = useAuthStore();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // MFA login states
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both username and password.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (data.success) {
        if (data.mfa_required) {
          setMfaRequired(true);
          setLoading(false);
          toast.success("MFA authentication challenge required.");
          return;
        }
        login(data.token, data.user);
        toast.success("Credential validation complete!");
        
        setTimeout(() => {
          if (data.user.role === "admin") {
            router.push("/dashboard");
          } else if (!data.user.department || !data.user.team) {
            router.push("/profile-setup");
          } else {
            router.push("/dashboard");
          }
        }, 600);
      } else {
        toast.error(data.error || "Invalid investigator credentials.");
        setLoading(false);
      }
    } catch {
      toast.error("Server synchronization timed out.");
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) {
      toast.error("Please enter a 6-digit verification code.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code: totpCode })
      });
      const data = await res.json();
      if (data.success) {
        login(data.token, data.user);
        toast.success("MFA validation complete!");
        setTimeout(() => {
          if (data.user.role === "admin") {
            router.push("/dashboard");
          } else if (!data.user.department || !data.user.team) {
            router.push("/profile-setup");
          } else {
            router.push("/dashboard");
          }
        }, 600);
      } else {
        toast.error(data.error || "Invalid verification code.");
        setLoading(false);
      }
    } catch {
      toast.error("MFA server connection error.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#091413] text-slate-100 flex flex-col justify-between p-6 relative font-sans overflow-hidden select-none">
      <Toaster />
      
      {/* Ambient background glow shadows */}
      <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-[#408A71]/[0.03] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-[10%] right-[10%] w-[400px] h-[400px] bg-[#B0E4CC]/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-4 z-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-[#B0E4CC]" />
          <span className="text-xs font-bold tracking-[0.25em] text-white uppercase">
            Cygnal
          </span>
        </Link>
        <Link href="/" className="text-[10px] font-mono text-slate-400 hover:text-[#B0E4CC] uppercase tracking-widest transition-colors">
          Back to Portal
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 z-10">
        <div className="w-full max-w-[390px] bg-[#0f2422]/20 backdrop-blur-xl border border-[#408A71]/15 rounded-2xl p-8 shadow-[0_0_50px_rgba(64,138,113,0.1)] space-y-6">
          
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-wide text-white uppercase font-mono">
              {mfaRequired ? "MFA Challenge" : "Establish Link"}
            </h2>
            <p className="text-[9px] text-[#a3c2b4] uppercase tracking-widest font-mono opacity-80">
              {mfaRequired ? "Verify 6-digit TOTP token" : "Validate credentials to access cockpit"}
            </p>
          </div>

          {!mfaRequired ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5 text-left">
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

              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                    Credential Secret
                  </label>
                  <Link 
                    href="/forgot-password" 
                    className="text-[9px] font-mono text-[#B0E4CC] hover:underline uppercase tracking-wider transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
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

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(64,138,113,0.2)] transition-all disabled:opacity-50"
                >
                  {loading ? "Authenticating..." : "Establish Connection Link"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                  6-Digit Authenticator Code
                </label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-3.5 h-4 w-4 text-[#408A71]/70" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 pl-11 pr-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button 
                  type="submit" 
                  disabled={loading || totpCode.length !== 6}
                  className="flex-1 bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] hover:opacity-95 text-white py-3.5 rounded-xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(64,138,113,0.2)] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setMfaRequired(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="text-center pt-2">
            <span className="text-[10px] text-slate-400">
              New investigator?{" "}
              <Link href="/register" className="text-[#B0E4CC] hover:underline font-semibold">
                Enlist Node
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
