"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Sliders, Key, Shield, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";

export default function SettingsPage() {
  const { token, user } = useAuthStore();
  const [apiKey, setApiKey] = useState("cyg_live_cf89073a987d65b12a84");
  const [showKey, setShowKey] = useState(false);
  const [scanInterval, setScanInterval] = useState(30);

  // MFA States
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaUri, setMfaUri] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Configurations updated successfully!");
  };

  const handleSetupMfa = async () => {
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setMfaSecret(data.secret);
        setMfaUri(data.provisioning_uri);
        toast.success("MFA credentials initialized.");
      } else {
        toast.error(data.error || "Failed to initialize MFA.");
      }
    } catch {
      toast.error("MFA setup connection error.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast.error("Please enter verification code.");
      return;
    }
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ code: verificationCode })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Multi-Factor Authentication enabled successfully!");
        setMfaSecret(null);
        setMfaUri(null);
        setVerificationCode("");
      } else {
        toast.error(data.error || "Invalid verification code.");
      }
    } catch {
      toast.error("MFA verification connection error.");
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6">
        
        {/* Header Title HUD Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
              <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                System Configurations
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Manage personal node configurations, API authentication keys, and sensor thresholds.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Configurations Form Panel */}
          <div className="border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 sm:p-8 space-y-6 text-left">
            <div className="flex items-center gap-2 border-b border-[#408A71]/15 pb-3">
              <Sliders className="w-4.5 h-4.5 text-[#B0E4CC]" />
              <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                General Node Settings
              </h2>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                  API Integration Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-[#408A71]/60" />
                  <input
                    type={showKey ? "text" : "password"}
                    readOnly
                    value={apiKey}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 pl-11 pr-24 text-xs text-slate-450 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-2.5 text-[9px] font-mono bg-[#285A48]/20 border border-[#408A71]/20 hover:border-[#408A71]/40 text-[#B0E4CC] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    {showKey ? "HIDE" : "REVEAL"}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                  Telemetry Scan Interval (Seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={scanInterval}
                  onChange={(e) => setScanInterval(parseInt(e.target.value) || 30)}
                  className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                className="bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] text-white py-3 px-6 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(64,138,113,0.15)] cursor-pointer"
              >
                SAVE SETTINGS
              </button>
            </form>
          </div>

          {/* MFA Panel */}
          <div className="border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 sm:p-8 space-y-6 text-left">
            <div className="flex items-center gap-2 border-b border-[#408A71]/15 pb-3">
              <Shield className="w-4.5 h-4.5 text-[#B0E4CC]" />
              <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                Multi-Factor Authentication (MFA)
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Secure your investigator node using Time-Based One-Time Passwords (TOTP). Authenticator apps like Google Authenticator or 1Password are supported.
              </p>

              {!mfaSecret ? (
                <button
                  type="button"
                  onClick={handleSetupMfa}
                  disabled={mfaLoading}
                  className="bg-[#285A48]/20 border border-[#408A71]/20 hover:border-[#408A71]/40 text-[#B0E4CC] py-3 px-6 rounded-xl text-xs font-bold tracking-widest uppercase transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Configure TOTP MFA
                </button>
              ) : (
                <form onSubmit={handleVerifyMfa} className="space-y-4 border border-[#408A71]/20 bg-[#091413]/60 p-4 rounded-xl">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                      MFA Secret Key
                    </label>
                    <code className="block bg-[#0f2422] border border-[#408A71]/20 p-2.5 rounded-lg text-xs font-mono text-[#B0E4CC] select-all">
                      {mfaSecret}
                    </code>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                      Provisioning URI
                    </label>
                    <textarea
                      readOnly
                      value={mfaUri || ""}
                      className="w-full bg-[#0f2422] border border-[#408A71]/20 p-2 text-[10px] font-mono text-slate-400 rounded-lg h-16 focus:outline-none resize-none"
                    />
                    <p className="text-[9px] text-slate-500 font-sans leading-normal">
                      Copy-paste the provisioning URI or enter the Secret Key in your Authenticator app.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                      6-Digit Authenticator Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={mfaLoading || verificationCode.length !== 6}
                      className="flex-1 bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] text-white py-2 px-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(64,138,113,0.15)] disabled:opacity-40 cursor-pointer"
                    >
                      {mfaLoading ? "Verifying..." : "Verify & Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMfaSecret(null); setMfaUri(null); }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
