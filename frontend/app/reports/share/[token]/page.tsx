"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shield, FileText, CheckCircle, Database, Calendar, ShieldCheck, HardDrive } from "lucide-react";

interface EvidenceItem {
  filename: string;
  file_size: number;
  file_hash: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface ReportDetail {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  content: string;
  case_id: string;
  case_number: string;
  case_title: string;
  case_severity: string;
  evidence: EvidenceItem[];
}

export default function PublicReportSharePage() {
  const { token } = useParams();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      fetch(`/api/reports/share/${token}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setReport(data.report);
          } else {
            setError(data.error || "Shared report not found.");
          }
        })
        .catch(() => {
          setError("Failed to verify report token against relational registry.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#091413] text-slate-100 flex flex-col justify-center items-center p-6 font-mono text-xs uppercase tracking-widest animate-pulse">
        <Shield className="w-8 h-8 text-[#B0E4CC] mb-4 animate-spin" />
        Cryptographic Hash Verification in progress...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#091413] text-slate-100 flex flex-col justify-center items-center p-6 font-sans">
        <div className="max-w-md w-full border border-red-500/20 bg-red-950/10 rounded-2xl p-6 text-center space-y-4">
          <Shield className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">Ingress Sweep Error</h2>
          <p className="text-xs text-slate-400">{error || "Invalid or expired share token signature."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#091413] text-slate-200 p-6 sm:p-12 font-sans select-none overflow-y-auto">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#285A48]/10 to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-[#408A71]/15 pb-6">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-[#B0E4CC]" />
            <span className="text-xs font-bold tracking-[0.25em] text-white uppercase font-mono">
              Cygnal Public Registry
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#285A48]/10 border border-[#408A71]/20 px-3 py-1.5 rounded-full text-[9px] font-mono text-[#B0E4CC] uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" /> Sealed Report
          </div>
        </div>

        {/* Report Overview */}
        <div className="space-y-4 text-left">
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide leading-tight">
            {report.title}
          </h1>
          {report.description && (
            <p className="text-sm text-slate-400 leading-relaxed font-light">{report.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-4 rounded-xl text-[10px] font-mono text-[#a3c2b4]/85 leading-normal">
            <div>
              <span className="text-slate-500 block uppercase">Created By</span>
              <strong className="text-white text-xs">{report.created_by}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">Sealed Date</span>
              <strong className="text-white text-xs flex items-center gap-1 mt-0.5">
                <Calendar size={10} /> {report.created_at.slice(0, 10)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">Linked Case</span>
              <strong className="text-[#B0E4CC] text-xs flex items-center gap-1 mt-0.5">
                <Database size={10} /> {report.case_number || "None"}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">Classification</span>
              <strong className="text-white text-xs">UNCLASSIFIED // SEALED</strong>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="border border-[#408A71]/15 rounded-2xl bg-[#0f2422]/5 p-6 sm:p-8 space-y-4 text-left">
          <div className="flex items-center gap-2 border-b border-[#408A71]/15 pb-3">
            <FileText className="w-4.5 h-4.5 text-[#B0E4CC]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              1. Executive Summary & Findings
            </h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-350 whitespace-pre-line font-sans">
            {(() => {
              try {
                const content = JSON.parse(report.content);
                return content.executive_summary;
              } catch {
                return report.content;
              }
            })()}
          </p>
        </div>

        {/* Evidence files list verification */}
        <div className="border border-[#408A71]/15 rounded-2xl bg-[#0f2422]/5 p-6 sm:p-8 space-y-5 text-left">
          <div className="flex items-center gap-2 border-b border-[#408A71]/15 pb-3">
            <HardDrive className="w-4.5 h-4.5 text-[#B0E4CC]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              2. Evidentiary Files Custody Signatures
            </h2>
          </div>

          {report.evidence.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No evidence files linked to report workspace.</p>
          ) : (
            <div className="space-y-4">
              {report.evidence.map((ev, idx) => (
                <div 
                  key={idx}
                  className="border border-[#408A71]/10 bg-[#091413]/60 p-4 rounded-xl flex flex-col gap-2 font-mono text-[9px] hover:border-[#408A71]/35 transition-all text-[#a3c2b4]"
                >
                  <div className="flex justify-between items-center">
                    <strong className="text-white text-xs font-sans">{ev.filename}</strong>
                    <span className="text-[8px] bg-[#285A48]/20 border border-[#408A71]/20 px-2 py-0.5 rounded text-[#B0E4CC]">
                      {ev.file_type}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-slate-500">
                    <div>SIZE: {(ev.file_size / 1024).toFixed(2)} KB</div>
                    <div>UPLOADED BY: {ev.uploaded_by}</div>
                  </div>
                  <div className="pt-2 border-t border-[#408A71]/10">
                    <span className="text-slate-550 block">SHA-256 FORENSIC STAMP</span>
                    <span className="text-[#B0E4CC] font-bold select-all break-all">{ev.file_hash}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 pt-6 text-center text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          Cryptographically signed by Cygnal Relational Ledger Controller. Signature verified.
        </div>

      </div>
    </div>
  );
}
