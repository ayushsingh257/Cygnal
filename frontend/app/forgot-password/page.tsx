"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, Key, ArrowRight } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [tokenSent, setTokenSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter your investigator username.");
      return;
    }
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setTokenSent(true);
      toast.success("Security reset token dispatched!");
    }, 1100);
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
        <div className="w-full max-w-[380px] bg-[#0b0f19]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-extrabold tracking-wide text-white uppercase">
              Recover Secret
            </h2>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Re-establish security signature
            </p>
          </div>

          {!tokenSent ? (
            <form onSubmit={handleResetRequest} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block">
                  Investigator Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ayush Singh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="cyber-input"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn-cyber-primary w-full py-3.5 text-xs font-semibold tracking-widest uppercase mt-2"
              >
                {loading ? "Dispatching Token..." : "Request Reset Token"}
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center mx-auto">
                <Key size={18} />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                An offline credential recovery token has been compiled for <strong>{username}</strong>. Please consult your SOC administrator to complete key re-signing.
              </p>
              <Link 
                href="/login" 
                className="btn-cyber-primary w-full py-3.5 text-xs font-semibold tracking-widest uppercase flex items-center justify-center gap-1.5"
              >
                Return to Login <ArrowRight size={13} />
              </Link>
            </div>
          )}

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
