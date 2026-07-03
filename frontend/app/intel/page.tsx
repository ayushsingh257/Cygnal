"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function ThreatIntelPage() {
  const { token } = useAuthStore();
  const [tiInput, setTiInput] = useState("");
  const [tiResponse, setTiResponse] = useState<any>(null);
  const [tiLoading, setTiLoading] = useState(false);

  const handleTestTI = async () => {
    if (!tiInput.trim()) {
      toast.error("Please enter an IP or hash.");
      return;
    }

    setTiLoading(true);
    setTiResponse(null);

    try {
      const res = await fetch("/api/intel-bridge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ indicator: tiInput.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setTiResponse(data.result);
        toast.success("Bridge response received.");
      } else {
        toast.error(data.error || "Error from bridge.");
      }
    } catch {
      toast.error("Failed to contact custom TI bridge.");
    } finally {
      setTiLoading(false);
    }
  };

  const handleClear = () => {
    setTiInput("");
    setTiResponse(null);
  };

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6 text-left font-sans">
        
        {/* Title */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 select-none">
          <Globe className="text-blue-500 w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Threat Intelligence Fusion
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Test custom API indicators against configured backend databases</p>
          </div>
        </div>

        {/* Query Input */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60 space-y-4">
          <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 flex items-center gap-1.5 font-mono uppercase tracking-wider select-none">
            <ShieldCheck size={14} className="text-blue-450" /> API Database Integrations
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed">
            Test the integrated backend threat intelligence bridge to query malicious signatures, IPs, or domains.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Input
              type="text"
              value={tiInput}
              onChange={(e) => setTiInput(e.target.value)}
              placeholder="e.g. Malicious IP, SHA-256 file signature..."
              className="w-full sm:flex-1"
            />
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button
                onClick={handleTestTI}
                disabled={tiLoading}
                className="w-full sm:w-auto h-9"
              >
                <Play size={11} className="mr-1.5" />
                {tiLoading ? "Testing..." : "Test Connector"}
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                className="w-full sm:w-auto h-9"
              >
                <RotateCcw size={11} className="mr-1.5" /> Clear
              </Button>
            </div>
          </div>

          {tiResponse && (
            <div className="mt-4 p-4 bg-[#060814]/80 border border-white/5 rounded-lg">
              <div className="text-[9px] text-blue-450 font-bold border-b border-white/5 pb-1.5 mb-2 font-mono select-none">
                CONNECTOR BRIDGE OUTPUT:
              </div>
              <pre className="text-[10px] text-slate-400 leading-relaxed overflow-auto max-h-60 font-mono">
                {JSON.stringify(tiResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
