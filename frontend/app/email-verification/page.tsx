"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert, ArrowRight } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function EmailVerificationPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Please enter your verification key.");
      return;
    }
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast.success("Security token handshake synchronized!");
      setTimeout(() => {
        router.push("/profile-setup");
      }, 500);
    }, 1200);
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
              <ShieldAlert className="text-blue-550" /> Verify Key
            </h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Validate your access credentials
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block">
                Ingress Key / Verification Code
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CYG-V4-XXXXX"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="cyber-input font-mono text-xs text-center uppercase tracking-widest"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-cyber-primary w-full py-3.5 text-xs font-semibold tracking-widest uppercase mt-2"
            >
              {loading ? "Verifying..." : "Establish Connection Link"}
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
