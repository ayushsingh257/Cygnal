"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Sliders, Key, Shield, RefreshCw } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("cyg_live_cf89073a987d65b12a84");
  const [showKey, setShowKey] = useState(false);
  const [scanInterval, setScanInterval] = useState(30);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Configurations updated successfully!");
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

        {/* Configurations Form Panel */}
        <div className="max-w-2xl border border-[#408A71]/15 bg-[#0f2422]/5 rounded-2xl p-6 sm:p-8 space-y-6 text-left">
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

      </div>
    </DashboardShell>
  );
}
