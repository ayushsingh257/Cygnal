"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { AlertTriangle, ShieldCheck, Shield, Info, ChevronDown, ChevronUp, Link2, Paperclip } from "lucide-react";
import { toast } from "react-hot-toast";

// ─── Severity Badge ──────────────────────────────────────────────────────────
export function SeverityBadge({ level }: { level: string }) {
  const cfg: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
    critical: { cls: "badge-critical", label: "Critical", icon: <AlertTriangle size={10} /> },
    high:     { cls: "badge-high",     label: "High",     icon: <AlertTriangle size={10} /> },
    medium:   { cls: "badge-medium",   label: "Medium",   icon: <Shield size={10} /> },
    low:      { cls: "badge-low",      label: "Low",      icon: <ShieldCheck size={10} /> },
    clean:    { cls: "badge-low",      label: "Clean",    icon: <ShieldCheck size={10} /> },
  };
  const c = cfg[level?.toLowerCase()] || cfg.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Confidence Bar ──────────────────────────────────────────────────────────
export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-red-500" : value >= 40 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="label-mono">Confidence</span>
        <span className="text-[10px] font-mono text-slate-400">{value}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ─── Warning List ────────────────────────────────────────────────────────────
export function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-xs">
        <ShieldCheck size={14} />
        <span>No warnings detected</span>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 text-[11px] text-amber-300 bg-amber-950/10 border border-amber-500/15 rounded-lg px-3 py-2">
          <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-400" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}

// ─── IOC Table ───────────────────────────────────────────────────────────────
export function IOCTable({ iocs }: { iocs: Array<{ type: string; value: string }> }) {
  if (!iocs || iocs.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="label-mono flex items-center gap-1.5"><Link2 size={10} /> Extracted IOCs</h4>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {iocs.map((ioc, i) => (
              <tr key={i}>
                <td>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
                    {ioc.type}
                  </span>
                </td>
                <td className="font-mono text-slate-300 select-all break-all">{ioc.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Raw JSON Expander ────────────────────────────────────────────────────────
export function RawDataExpander({ data }: { data: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-mono text-slate-500 hover:text-slate-400 hover:bg-white/[0.01] transition-colors uppercase tracking-wider"
      >
        <span className="flex items-center gap-2"><Info size={10} /> Raw Scan Data</span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <pre className="p-4 text-[10px] font-mono text-slate-400 bg-black/20 overflow-x-auto max-h-80 leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Save to Case Button ──────────────────────────────────────────────────────
interface SaveToCaseProps {
  scannerName: string;
  summary: string;
  result: Record<string, unknown>;
}

export function SaveToCase({ scannerName, summary, result }: SaveToCaseProps) {
  const { token } = useAuthStore();
  const [cases, setCases] = useState<Array<{ id: string; case_number: string; title: string }>>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCases = async () => {
    if (cases.length > 0) { setOpen(true); return; }
    try {
      const res = await fetch("/api/cases", { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.success) {
        setCases(d.cases.filter((c: any) => c.status !== "closed"));
        setOpen(true);
      }
    } catch {
      toast.error("Could not load cases.");
    }
  };

  const saveToCase = async (caseId: string, caseNum: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          description: `[${scannerName}] ${summary}`,
          event_type: "scanner_result",
          metadata: { scanner: scannerName, result }
        })
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`Saved to case ${caseNum}!`);
        setOpen(false);
      } else {
        toast.error(d.error || "Save failed.");
      }
    } catch {
      toast.error("Connection error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={loadCases}
        className="btn-cyber flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider"
      >
        <Paperclip size={11} /> Attach to Case
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Select active case</p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {cases.length === 0 ? (
              <p className="p-4 text-[11px] text-slate-600 text-center">No open cases found</p>
            ) : (
              cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => saveToCase(c.id, c.case_number)}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 hover:bg-white/[0.03] border-b border-white/5 transition-colors"
                >
                  <p className="text-[10px] font-mono font-bold text-blue-400">{c.case_number}</p>
                  <p className="text-[11px] text-slate-300 mt-0.5 truncate">{c.title}</p>
                </button>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-white/5">
            <button onClick={() => setOpen(false)} className="text-[10px] text-slate-600 hover:text-slate-400 font-mono uppercase">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result Section Wrapper ───────────────────────────────────────────────────
export function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="label-mono border-b border-white/5 pb-2">{title}</h3>
      {children}
    </div>
  );
}

// ─── KV Row ──────────────────────────────────────────────────────────────────
export function KVRow({ label, value, mono = false }: { label: string; value: string | number | undefined | null; mono?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-1 border-b border-white/[0.03] last:border-0">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono shrink-0">{label}</span>
      <span className={`text-[11px] text-slate-300 text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
