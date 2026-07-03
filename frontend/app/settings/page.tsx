"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sliders, Shield, Save } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [tokenLimit, setTokenLimit] = useState("1000");
  const [scanInterval, setScanInterval] = useState("8");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Platform settings updated successfully.");
    }, 1200);
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6 text-left font-sans">
        
        {/* Title */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 select-none">
          <Sliders className="text-blue-500 w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Platform Configurations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage dashboard query limits, security tokens, and sensor boundaries</p>
          </div>
        </div>

        {/* Configurations Card Form */}
        <div className="glass-card rounded-xl p-6 bg-[#0d1117]/65 border border-white/5 max-w-xl">
          <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-5 flex items-center gap-1.5 font-mono uppercase tracking-wider select-none">
            <Shield size={14} className="text-blue-450" /> System Threshold Settings
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider select-none">
                Historical Query Ingestion Limit
              </label>
              <Input
                type="number"
                value={tokenLimit}
                onChange={(e) => setTokenLimit(e.target.value)}
                required
              />
              <span className="text-[10px] text-slate-500 leading-none">Maximum number of historic scan operations shown in reports compiler tables</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider select-none">
                Sensor Polling Ingress Interval (seconds)
              </label>
              <Input
                type="number"
                value={scanInterval}
                onChange={(e) => setScanInterval(e.target.value)}
                required
              />
              <span className="text-[10px] text-slate-500 leading-none">Frequency of active background worker polling checks for scanner results</span>
            </div>

            <Button type="submit" disabled={loading} className="w-full flex justify-center py-2.5">
              <Save size={13} className="mr-1.5" />
              {loading ? "Saving Configs..." : "Save Configurations"}
            </Button>
          </form>
        </div>

      </div>
    </DashboardShell>
  );
}
