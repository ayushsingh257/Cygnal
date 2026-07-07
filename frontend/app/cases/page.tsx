"use client";

import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Briefcase, 
  Plus, 
  FileText, 
  ShieldAlert, 
  Clock, 
  User, 
  Send, 
  UploadCloud, 
  Layers, 
  Network,
  Activity,
  CheckCircle,
  FileCode
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  department: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  timestamp: string;
  user: string;
  metadata: string;
}

interface EvidenceItem {
  id: string;
  filename: string;
  file_size: number;
  file_hash: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

export default function CasesPage() {
  const { user, token } = useAuthStore();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<CaseItem | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Forms states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState("medium");
  const [newDept, setNewDept] = useState("Security Operations");

  const [commentText, setCommentText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "evidence" | "graph">("timeline");

  // Filter states
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    if (!token) return;
    fetchCases();
  }, [token]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetails(selectedCaseId);
    } else {
      setCaseDetails(null);
      setTimeline([]);
      setEvidence([]);
    }
  }, [selectedCaseId]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCases(data.cases || []);
        if (data.cases.length > 0 && !selectedCaseId) {
          setSelectedCaseId(data.cases[0].id);
        }
      } else {
        toast.error(data.error || "Failed to load cases.");
      }
    } catch {
      toast.error("Error communicating with database.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseDetails = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCaseDetails(data.case);
        setTimeline(data.timeline || []);
        setEvidence(data.evidence || []);
      } else {
        toast.error(data.error || "Failed to load case profiles.");
      }
    } catch {
      toast.error("Connection failed.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Case title is required.");
      return;
    }

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          severity: newSeverity,
          department: newDept,
          assigned_to: user?.username
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Incident registered successfully!");
        setShowCreateModal(false);
        setNewTitle("");
        setNewDesc("");
        // Reload list and set active
        await fetchCases();
        setSelectedCaseId(data.case.id);
      } else {
        toast.error(data.error || "Failed to seed case.");
      }
    } catch {
      toast.error("Request failed.");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedCaseId) return;

    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/timeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          description: commentText,
          event_type: "analyst_note"
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Timeline note logged!");
        setCommentText("");
        fetchCaseDetails(selectedCaseId);
      } else {
        toast.error(data.error || "Could not post note.");
      }
    } catch {
      toast.error("Request failed.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedCaseId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/evidence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Evidence '${file.name}' signed and cached!`);
        fetchCaseDetails(selectedCaseId);

      } else {
        toast.error(data.error || "Upload failed.");
      }
    } catch {
      toast.error("Upload connection failed.");
    } finally {
      setUploading(false);
    }
  };

  // Filter cases
  const filteredCases = cases.filter(c => {
    const matchSev = filterSeverity === "all" || c.severity === filterSeverity;
    const matchStat = filterStatus === "all" || c.status === filterStatus;
    return matchSev && matchStat;
  });

  // Extract mock SVG graph coordinates dynamically based on case timeline
  const getGraphNodesAndLinks = () => {
    if (!caseDetails) return { nodes: [], links: [] };

    // Root node
    const nodes = [
      { id: "root", label: caseDetails.case_number, type: "case", x: 220, y: 160 }
    ];
    const links: any[] = [];

    // Mapped indicators nodes (Extract IPs/hashes/files)
    evidence.slice(0, 3).forEach((ev, idx) => {
      const hashNodeId = `hash_${idx}`;
      const fileNodeId = `file_${idx}`;
      
      const angle = (idx * 2 * Math.PI) / 3;
      const hashX = 220 + Math.cos(angle) * 110;
      const hashY = 160 + Math.sin(angle) * 110;
      
      const fileX = hashX + Math.cos(angle + 0.3) * 60;
      const fileY = hashY + Math.sin(angle + 0.3) * 60;

      nodes.push({ id: hashNodeId, label: `SHA-256: ${ev.file_hash.slice(0, 8)}...`, type: "hash", x: hashX, y: hashY });
      nodes.push({ id: fileNodeId, label: ev.filename, type: "file", x: fileX, y: fileY });
      
      links.push({ source: "root", target: hashNodeId });
      links.push({ source: hashNodeId, target: fileNodeId });
    });

    return { nodes, links };
  };

  const { nodes, links } = getGraphNodesAndLinks();

  return (
    <DashboardShell>
      <Toaster />
      <div className="space-y-6 text-left font-sans select-none">
        
        {/* Banner Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-4">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Incident Case files
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review threat investigations timeline and secure evidence custody hashes
            </p>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-cyber-primary py-2 px-4 text-xs font-semibold tracking-wider flex items-center gap-1.5"
          >
            <Plus size={14} /> File New Case
          </button>
        </div>

        {/* Outer Grid Workspace splits */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left panel: Case List Directory (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Filter controls */}
            <div className="glass-card rounded-xl p-4 bg-[#0d1117]/60 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
                <span>Filter Options</span>
                <span>{filteredCases.length} Mapped</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="cyber-input bg-[#0b0f19] py-1.5 px-2 appearance-none text-[11px]"
                >
                  <option value="all">ALL SEVERITIES</option>
                  <option value="critical">CRITICAL</option>
                  <option value="high">HIGH</option>
                  <option value="medium">MEDIUM</option>
                  <option value="low">LOW</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="cyber-input bg-[#0b0f19] py-1.5 px-2 appearance-none text-[11px]"
                >
                  <option value="all">ALL STATUSES</option>
                  <option value="open">OPEN</option>
                  <option value="investigating">INVESTIGATING</option>
                  <option value="closed">CLOSED</option>
                </select>
              </div>
            </div>

            {/* Cases list */}
            <div className="glass-card rounded-xl bg-[#0d1117]/60 flex-1 overflow-y-auto max-h-[460px] p-2 space-y-1">
              {loading ? (
                <p className="text-xs font-mono text-slate-550 text-center py-12 animate-pulse">Syncing cases indexes...</p>
              ) : filteredCases.length === 0 ? (
                <p className="text-xs font-mono text-slate-550 text-center py-12">No active cases match search.</p>
              ) : (
                filteredCases.map((c) => {
                  const isActive = selectedCaseId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCaseId(c.id)}
                      className={`w-full text-left p-3.5 rounded-lg border transition ${
                        isActive 
                          ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.05)]" 
                          : "border-transparent bg-transparent hover:bg-white/[0.01]"
                      }`}
                    >
                      <div className="flex justify-between items-start text-xs">
                        <span className="font-mono font-bold text-white tracking-wide">{c.case_number}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono tracking-wide ${
                          c.severity === "critical" ? "bg-red-950/20 text-red-400 border border-red-800/25" :
                          c.severity === "high" ? "bg-amber-950/20 text-amber-500 border border-amber-800/25" :
                          "bg-blue-950/20 text-blue-400 border border-blue-800/25"
                        }`}>
                          {c.severity.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 truncate mt-2">{c.title}</h4>
                      <p className="text-[10px] text-slate-500 truncate mt-1">{c.description || "No description provided."}</p>
                    </button>
                  );
                })
              )}
            </div>

          </div>

          {/* Right panel: Active Case Details Ledger (8 cols) */}
          <div className="lg:col-span-8 glass-card rounded-2xl bg-[#0b0f19]/60 p-6 flex flex-col justify-between">
            {detailLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-3 text-slate-550 animate-pulse">
                <Activity className="w-6 h-6 animate-spin text-blue-450" />
                <span className="text-[10px] font-mono uppercase tracking-widest">Querying incident custody ledgers...</span>
              </div>
            ) : !caseDetails ? (
              <div className="text-center py-36 text-slate-550 text-xs font-mono select-none">
                Select an incident case to load worksheet files.
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{caseDetails.case_number}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${
                        caseDetails.status === "open" ? "bg-emerald-950/20 text-emerald-450 border border-emerald-800/25" :
                        "bg-slate-900 text-slate-400 border border-slate-700/20"
                      }`}>
                        {caseDetails.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide mt-1">{caseDetails.title}</h3>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 text-left sm:text-right space-y-1">
                    <div>ASSIGNED: <span className="text-slate-350">{caseDetails.assigned_to || "UNASSIGNED"}</span></div>
                    <div>DEPARTMENT: <span className="text-slate-350">{caseDetails.department.toUpperCase()}</span></div>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-white/5 select-none">
                  {(["timeline", "evidence", "graph"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wider font-mono border-b-2 transition ${
                        activeTab === tab 
                          ? "border-blue-500 text-blue-400" 
                          : "border-transparent text-slate-500 hover:text-slate-350"
                      }`}
                    >
                      {tab === "timeline" && "Chronological Timeline"}
                      {tab === "evidence" && "Evidence Vault"}
                      {tab === "graph" && "IOC Link Graph"}
                    </button>
                  ))}
                </div>

                {/* TAB CONTENT: Timeline */}
                {activeTab === "timeline" && (
                  <div className="space-y-4">
                    {/* Add Timeline note input */}
                    <form onSubmit={handlePostComment} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Log new analyst note to case timeline..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="cyber-input py-2 text-xs"
                      />
                      <button 
                        type="submit"
                        className="btn-cyber-primary py-2 px-4 flex items-center justify-center"
                      >
                        <Send size={13} />
                      </button>
                    </form>

                    {/* Timeline List */}
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {timeline.length === 0 ? (
                        <p className="text-[11px] font-mono text-slate-550 text-center py-8">No events registered.</p>
                      ) : (
                        timeline.map((evt) => (
                          <div key={evt.id} className="flex gap-3 items-start border-l border-white/5 pl-3.5 relative ml-2 text-left">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute -left-1 top-1.5" />
                            <div className="space-y-0.5 leading-normal">
                              <p className="text-xs text-slate-200">{evt.description}</p>
                              <div className="flex gap-2 text-[9px] font-mono text-slate-500 uppercase">
                                <span>{new Date(evt.timestamp).toLocaleString()}</span>
                                <span>• by {evt.user}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: Evidence Vault */}
                {activeTab === "evidence" && (
                  <div className="space-y-4">
                    
                    {/* Uploader dropzone */}
                    <label className="border border-dashed border-white/5 hover:border-blue-500/20 bg-black/10 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition select-none">
                      <UploadCloud size={24} className={uploading ? "text-blue-500 animate-bounce" : "text-slate-550"} />
                      <span className="text-[10px] font-mono text-slate-450 uppercase tracking-widest">
                        {uploading ? "UPLOADING FORENSIC EVIDENCE..." : "DRAG & DROP OR CLICK TO UPLOAD EVIDENCE"}
                      </span>
                      <input 
                        type="file" 
                        onChange={handleFileUpload} 
                        disabled={uploading} 
                        className="hidden" 
                      />
                    </label>

                    {/* Evidence List */}
                    <div className="overflow-x-auto max-h-[260px]">
                      {evidence.length === 0 ? (
                        <p className="text-[11px] font-mono text-slate-555 text-center py-6">No evidence attachments signed.</p>
                      ) : (
                        <table className="w-full text-[11px] font-mono text-left">
                          <thead>
                            <tr className="border-b border-white/5 text-slate-500 uppercase tracking-wider">
                              <th className="p-2">Filename</th>
                              <th className="p-2">Size</th>
                              <th className="p-2">SHA-256 custody Seal</th>
                              <th className="p-2">Uploaded by</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-350">
                            {evidence.map((ev) => (
                              <tr key={ev.id} className="hover:bg-white/[0.01]">
                                <td className="p-2 text-slate-200 font-semibold">{ev.filename}</td>
                                <td className="p-2 text-slate-400">{(ev.file_size / 1024).toFixed(1)} KB</td>
                                <td className="p-2 text-blue-450 tracking-wider font-bold select-all" title={ev.file_hash}>
                                  {ev.file_hash.slice(0, 16)}...
                                </td>
                                <td className="p-2 text-slate-400">{ev.uploaded_by}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: SVG Link Graph */}
                {activeTab === "graph" && (
                  <div className="glass-card rounded-xl p-4 bg-black/20 flex flex-col items-center justify-center relative select-none">
                    <div className="absolute top-4 left-4 flex items-center gap-1 text-[9px] font-mono text-slate-500 uppercase">
                      <Network size={12} className="text-blue-450" /> Live Threat Indicator Graph Map
                    </div>

                    {nodes.length <= 1 ? (
                      <p className="text-slate-555 text-xs py-20 font-mono text-center">
                        Upload evidence files to populate indicator nodes mappings.
                      </p>
                    ) : (
                      <svg className="w-full h-80 bg-[#030712]/40 rounded-lg">
                        {/* Links */}
                        {links.map((link, idx) => {
                          const srcNode = nodes.find(n => n.id === link.source);
                          const tgtNode = nodes.find(n => n.id === link.target);
                          if (!srcNode || !tgtNode) return null;
                          return (
                            <line
                              key={idx}
                              x1={srcNode.x}
                              y1={srcNode.y}
                              x2={tgtNode.x}
                              y2={tgtNode.y}
                              stroke="rgba(59, 130, 246, 0.2)"
                              strokeWidth={1.5}
                              strokeDasharray="4 2"
                            />
                          );
                        })}

                        {/* Nodes */}
                        {nodes.map((node) => (
                          <g key={node.id}>
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={node.type === "case" ? 14 : 7}
                              fill={node.type === "case" ? "rgba(59, 130, 246, 0.25)" : node.type === "hash" ? "rgba(99, 102, 241, 0.2)" : "rgba(6, 182, 212, 0.2)"}
                              stroke={node.type === "case" ? "#3b82f6" : node.type === "hash" ? "#6366f1" : "#06b6d4"}
                              strokeWidth={1.5}
                              className="transition duration-300 hover:scale-110"
                            />
                            <text
                              x={node.x}
                              y={node.y + (node.type === "case" ? 28 : 20)}
                              textAnchor="middle"
                              fill="#94a3b8"
                              className="text-[9px] font-mono tracking-tight font-semibold"
                            >
                              {node.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

      </div>

      {/* CREATE CASE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-[420px] bg-[#0b0f19] border border-white/5 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="text-left border-b border-white/5 pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Initialize Case Worksheet
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Register a new security incident case file</p>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-slate-450 uppercase tracking-wider block">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Port Ingress Sweep detected"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="cyber-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-slate-450 uppercase tracking-wider block">Description / Notes</label>
                <textarea
                  placeholder="Log indicator hosts details..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="cyber-input h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-450 uppercase tracking-wider block">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="cyber-input bg-[#0b0f19] appearance-none"
                  >
                    <option value="critical">CRITICAL</option>
                    <option value="high">HIGH</option>
                    <option value="medium">MEDIUM</option>
                    <option value="low">LOW</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-450 uppercase tracking-wider block">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="cyber-input bg-[#0b0f19] appearance-none"
                  >
                    <option value="Security Operations">SecOps</option>
                    <option value="Offensive Security">Red Team</option>
                    <option value="Incident Response">DFIR</option>
                    <option value="Threat Intelligence">CTI</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-cyber font-semibold uppercase tracking-wider text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-cyber-primary py-2 px-4 text-[10px]"
                >
                  File Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardShell>
  );
}
