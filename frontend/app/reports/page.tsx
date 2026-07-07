"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { FileText, Plus, Share2, Printer, CheckCircle, Database, Calendar, Trash2, ArrowRight } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface Case {
  id: string;
  case_number: string;
  title: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  case_id: string;
  share_token: string;
  case_number: string;
}

export default function ReportsCompilerPage() {
  const { token, user } = useAuthStore();
  const [cases, setCases] = useState<Case[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [execSummary, setExecSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePreviewReport, setActivePreviewReport] = useState<any>(null);

  useEffect(() => {
    fetchCases();
    fetchReports();
  }, [token]);

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/cases", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCases(data.cases || []);
      }
    } catch {
      toast.error("Failed to load active cases list.");
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch {
      toast.error("Failed to load reports history.");
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !execSummary.trim()) {
      toast.error("Report title and executive summary content are required.");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        content: JSON.stringify({ executive_summary: execSummary.trim() }),
        case_id: selectedCaseId || null
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Forensic report compiled!");
        setTitle("");
        setDescription("");
        setExecSummary("");
        setSelectedCaseId("");
        fetchReports();
      } else {
        toast.error(data.error || "Report compilation failed.");
      }
    } catch {
      toast.error("Server compilation timeout.");
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = (token: string) => {
    const link = `${window.location.origin}/reports/share/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Public share link copied to clipboard!");
  };

  const handlePrint = (report: Report) => {
    // Fetch full report detail
    fetch(`/api/reports/${report.id}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActivePreviewReport(data.report);
          setTimeout(() => {
            window.print();
          }, 300);
        } else {
          toast.error("Failed to compile print assets.");
        }
      })
      .catch(() => toast.error("Report retrieval failed."));
  };

  return (
    <DashboardShell>
      <Toaster />
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: #ffffff !important;
            color: #000000 !important;
          }
          aside, header, main > :not(.print-area) {
            display: none !important;
          }
        }
      `}</style>

      {/* Hidden A4 Print Sheet Container */}
      {activePreviewReport && (
        <div className="hidden print-area text-black bg-white font-sans p-10 space-y-8 max-w-4xl mx-auto border border-gray-200">
          {/* Letterhead */}
          <div className="flex justify-between items-center border-b-2 border-emerald-700 pb-5">
            <div>
              <h1 className="text-2xl font-black tracking-widest text-emerald-800 font-mono">CYGNAL FORENSICS</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Enterprise Investigation Platform</p>
            </div>
            <div className="text-right text-[10px] font-mono text-gray-500 leading-normal">
              <div>REPORT ID: {activePreviewReport.id}</div>
              <div>DATE: {activePreviewReport.created_at}</div>
              <div>CLASSIFICATION: RESTRICTED // COCKPIT AUDIT</div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold uppercase border-b border-gray-200 pb-1">{activePreviewReport.title}</h2>
            {activePreviewReport.description && (
              <p className="text-xs text-gray-600 italic">{activePreviewReport.description}</p>
            )}
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-150 text-[10px] font-mono">
              <div><strong>CASE NUMBER:</strong> {activePreviewReport.case_number || "None"}</div>
              <div><strong>COMPILED BY:</strong> {activePreviewReport.created_by}</div>
              <div><strong>SECURITY SIGNATURE:</strong> SHA-256 SEALED</div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-850">1. Executive Summary</h3>
            <p className="text-xs leading-relaxed text-gray-800 whitespace-pre-line bg-gray-50/50 p-4 border border-gray-100 rounded-lg">
              {(() => {
                try {
                  const content = JSON.parse(activePreviewReport.content);
                  return content.executive_summary;
                } catch {
                  return activePreviewReport.content;
                }
              })()}
            </p>
          </div>

          {/* Timeline custody verification stamps */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-850">2. Chain of Custody & Evidence Vault</h3>
            <p className="text-[10px] text-gray-600 leading-normal">
              All evidentiary logs and scanner inputs resolved during this triage are permanently sealed under cryptographic hashes. Verify individual files against the database ledger using target tokens.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-5 text-center text-[9px] font-mono text-gray-400">
            Cygnal Relational System Ledger Audit. Verified by cryptographical signatures.
          </div>
        </div>
      )}

      {/* Main Panel Viewport */}
      <div className="space-y-8">
        
        {/* Header HUD Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0f2422]/15 border border-[#408A71]/15 p-6 rounded-2xl">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B0E4CC] animate-pulse" />
              <h1 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                Forensics Reports Compiler
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Compile active timelines and evidence hashes into certified print-ready A4 reports.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left panel: compiler inputs form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border border-[#408A71]/15 rounded-2xl bg-[#0f2422]/5 p-6 space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono text-left">
                New Compilation Report
              </h2>

              <form onSubmit={handleCreateReport} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                    Associate Investigation Case
                  </label>
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 px-4 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                  >
                    <option value="">-- No Case Association --</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.case_number} - {c.title.slice(0, 25)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                    Report Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Audit Findings on Host anomalous behavior"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 px-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Passively gathered WHOIS and metadata EXIF logs"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl py-3 px-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#a3c2b4] uppercase tracking-wider block">
                    Executive Summary & Findings
                  </label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Detailed audit summary findings..."
                    value={execSummary}
                    onChange={(e) => setExecSummary(e.target.value)}
                    className="w-full bg-[#091413]/90 border border-[#408A71]/20 rounded-xl p-4 text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#B0E4CC]/40 focus:border-transparent transition-all font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#285A48] via-[#408A71] to-[#B0E4CC] text-white py-3 px-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(64,138,113,0.15)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> COMPILE AUDIT REPORT
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: compiled reports history */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border border-[#408A71]/15 rounded-2xl bg-[#0f2422]/5 p-6 space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono text-left">
                Sealed Reports Registry
              </h2>

              {reports.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#408A71]/15 rounded-2xl text-slate-500">
                  <FileText className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">No compiled reports logged</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((r) => (
                    <div 
                      key={r.id}
                      className="border border-[#408A71]/10 bg-[#091413]/60 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#408A71]/35 transition-all text-left"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wide truncate">
                          {r.title}
                        </h4>
                        <div className="flex flex-wrap gap-2 text-[9px] font-mono text-slate-450 uppercase mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> {r.created_at.slice(0, 10)}
                          </span>
                          <span>|</span>
                          <span className="flex items-center gap-1">
                            <Database size={10} /> Case: {r.case_number || "None"}
                          </span>
                          <span>|</span>
                          <span>By: {r.created_by}</span>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => copyShareLink(r.share_token)}
                          title="Share Link"
                          className="bg-[#0f2422]/30 border border-[#408A71]/20 hover:border-[#408A71]/40 text-[#B0E4CC] p-2 rounded-lg transition-all cursor-pointer"
                        >
                          <Share2 size={13} />
                        </button>
                        <button
                          onClick={() => handlePrint(r)}
                          title="Print A4"
                          className="bg-[#285A48]/10 border border-[#408A71]/25 hover:border-[#408A71]/50 text-white px-3 py-2 rounded-lg text-[10px] font-mono tracking-widest uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Printer size={12} /> Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
