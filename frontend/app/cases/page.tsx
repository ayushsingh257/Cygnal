"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardShell from "@/components/DashboardShell";
import IocGraph from "@/components/IocGraph";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "react-hot-toast";
import { 
  FolderPlus, 
  Folder, 
  Clock, 
  FileCode, 
  Plus, 
  Link as LinkIcon, 
  User, 
  Hash, 
  Upload
} from "lucide-react";

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Evidence {
  id: string;
  case_id: string;
  filename: string;
  file_size: number;
  file_hash: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

interface TimelineEvent {
  id: string;
  case_id: string;
  event_type: string;
  description: string;
  timestamp: string;
  user: string;
  metadata: Record<string, any> | null;
}

export default function CasesPage() {
  const { user, token, loadUserFromStorage } = useAuthStore();
  const router = useRouter();

  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  
  // Case detail states
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  // Create Case Form States
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseDesc, setNewCaseDesc] = useState("");
  const [newCaseSeverity, setNewCaseSeverity] = useState("medium");
  const [createLoading, setCreateLoading] = useState(false);

  // Notes state
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Evidence file upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Associate Scan state
  const [scanHistory, setScanHistory] = useState<Record<string, any>[]>([]);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [associateLoading, setAssociateLoading] = useState(false);

  const [loadingCases, setLoadingCases] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Guard routing
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "analyst") {
      toast.error("Access denied. Analysts and admins only.");
      router.push("/");
    }
  }, [user]);

  // Fetch Cases list
  useEffect(() => {
    if (!token) return;
    fetchCases();
    fetchScanHistory();
  }, [token]);

  // Fetch active case details
  useEffect(() => {
    if (!selectedCaseId || !token) return;
    fetchCaseDetails(selectedCaseId);
  }, [selectedCaseId, token]);

  const fetchCases = async () => {
    setLoadingCases(true);
    try {
      const res = await fetch("/api/cases", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCases(data.cases);
      } else {
        toast.error(data.error || "Failed to load cases");
      }
    } catch {
      toast.error("Error connecting to case service");
    } finally {
      setLoadingCases(false);
    }
  };

  const fetchScanHistory = async () => {
    try {
      const res = await fetch("/api/lookups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setScanHistory(data.logs);
      }
    } catch (err) {
      console.error("Failed to load history for associations", err);
    }
  };

  const fetchCaseDetails = async (caseId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setActiveCase(data.case);
        setEvidenceList(data.evidence);
        setTimeline(data.timeline);
      } else {
        toast.error(data.error || "Failed to fetch details");
      }
    } catch {
      toast.error("Failed to load case files");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseTitle.trim()) return;

    setCreateLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newCaseTitle,
          description: newCaseDesc,
          severity: newCaseSeverity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Investigation Case created");
        setNewCaseTitle("");
        setNewCaseDesc("");
        setNewCaseSeverity("medium");
        fetchCases();
      } else {
        toast.error(data.error || "Failed to create case");
      }
    } catch {
      toast.error("Failed to post case files");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedCaseId) return;

    setNoteLoading(true);
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/note`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Analyst note appended");
        setNewNote("");
        fetchCaseDetails(selectedCaseId);
      } else {
        toast.error(data.error || "Failed to append note");
      }
    } catch {
      toast.error("Connection failed");
    } finally {
      setNoteLoading(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (!uploadFile || !selectedCaseId) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/evidence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Evidence file registered & hashed");
        setUploadFile(null);
        fetchCaseDetails(selectedCaseId);
      } else {
        toast.error(data.error || "Failed to upload file");
      }
    } catch {
      toast.error("File upload connection failure");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAssociateScan = async () => {
    if (!selectedScanId || !selectedCaseId) return;

    setAssociateLoading(true);
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/associate-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scan_id: selectedScanId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Scan linked to incident timeline");
        setSelectedScanId("");
        fetchCaseDetails(selectedCaseId);
      } else {
        toast.error(data.error || "Failed to associate scan");
      }
    } catch {
      toast.error("Failed to associate scan history");
    } finally {
      setAssociateLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedCaseId) return;

    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Case status set to ${status}`);
        fetchCaseDetails(selectedCaseId);
        fetchCases();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Status update request failed");
    }
  };

  if (!user) return null;

  const severityBorders: Record<string, string> = {
    low: "border-emerald-500/10 hover:border-emerald-500/30",
    medium: "border-blue-500/10 hover:border-blue-500/30",
    high: "border-amber-500/10 hover:border-amber-500/30",
    critical: "border-red-500/25 hover:border-red-500/55"
  };

  const severityBadges: Record<string, string> = {
    low: "badge-low",
    medium: "badge-medium",
    high: "badge-high",
    critical: "badge-critical"
  };

  return (
    <DashboardShell>
      <Toaster />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left font-sans select-none">
        
        {/* LEFT COLUMN: DIRECTORY & CREATION (Lg: 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Create Incident Case Panel */}
          <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/60">
            <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <FolderPlus size={14} className="text-blue-500" /> File New Incident
            </h3>
            
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Case Title</label>
                <Input
                  type="text"
                  placeholder="e.g. Server-04 Data Ingress Sweep"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Incident Description</label>
                <textarea
                  placeholder="Details of suspicious vectors..."
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  className="cyber-input w-full h-16 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider">Severity Tier</label>
                <select
                  value={newCaseSeverity}
                  onChange={(e) => setNewCaseSeverity(e.target.value)}
                  className="cyber-input w-full"
                >
                  <option value="low">Low Impact</option>
                  <option value="medium">Medium Security</option>
                  <option value="high">High Threat</option>
                  <option value="critical">Critical Incident</option>
                </select>
              </div>

              <Button 
                type="submit" 
                className="w-full text-xs font-mono py-2.5 tracking-wider uppercase" 
                disabled={createLoading}
              >
                {createLoading ? "FILE RECORDING..." : "COMMIT INCIDENT CASE"}
              </Button>
            </form>
          </div>

          {/* Incident Cases Directory List */}
          <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/60">
            <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Folder size={14} className="text-blue-500" /> Case File Index ({cases.length})
            </h3>
            
            {loadingCases ? (
              <p className="text-slate-550 font-mono text-xs py-4 animate-pulse">Loading active indices...</p>
            ) : cases.length === 0 ? (
              <p className="text-slate-550 font-mono text-xs py-4 text-center">No cases filed.</p>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`p-3.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                      selectedCaseId === c.id
                        ? "bg-blue-500/10 border-blue-500/30"
                        : `bg-[#0b0f19]/30 ${severityBorders[c.severity]}`
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-mono text-slate-550 font-semibold">{c.case_number}</span>
                      <span className={`${severityBadges[c.severity]}`}>
                        {c.severity}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-200 truncate">{c.title}</h4>
                    <div className="flex justify-between items-center mt-3 text-[9px] text-slate-500 font-mono">
                      <span>Investigator: {c.created_by}</span>
                      <span className="capitalize px-1.5 py-0.5 bg-black/40 border border-white/5 rounded text-blue-400 text-[8px] font-bold tracking-wider">{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: ACTIVE CASE WORKSPACE PANEL (Lg: 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {!selectedCaseId ? (
            <div className="glass-card rounded-xl py-32 text-center flex flex-col items-center justify-center bg-[#0b0f19]/30 h-full border-dashed border-white/5">
              <Folder className="w-10 h-10 text-slate-650 mb-3" />
              <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">DFIR Case Audit console</h3>
              <p className="text-[11px] text-slate-500 mt-2 max-w-xs leading-relaxed font-sans">
                Select an incident card from the index to verify hashes, audit notes, correlate scans, and plot IOC pathways.
              </p>
            </div>
          ) : loadingDetails && !activeCase ? (
            <div className="glass-card rounded-xl py-32 text-center bg-[#0b0f19]/40">
              <p className="text-slate-555 font-mono text-xs animate-pulse">Synchronizing case details buffer...</p>
            </div>
          ) : activeCase ? (
            <div className="space-y-6">
              
              {/* Active Incident Case Header */}
              <div className="glass-card rounded-xl p-6 bg-[#0b0f19]/80 relative overflow-hidden">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-white/5 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-blue-450 font-bold">{activeCase.case_number}</span>
                      <span className={`${severityBadges[activeCase.severity]}`}>
                        {activeCase.severity}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white mt-2 uppercase font-mono tracking-wide">{activeCase.title}</h2>
                    <p className="text-xs text-slate-455 mt-1.5 leading-relaxed font-sans">{activeCase.description || "No overview statement."}</p>
                  </div>
                  
                  {/* Status Toggle Switch */}
                  <div className="space-y-1 bg-black/35 p-2 rounded-lg border border-white/5">
                    <label className="block text-[8px] font-mono text-slate-550 uppercase tracking-wider mb-1">Operational Status</label>
                    <div className="flex gap-1">
                      {["open", "investigating", "closed"].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(st)}
                          className={`px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-mono rounded ${
                            activeCase.status === st
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold"
                              : "text-slate-550 hover:text-slate-350"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-mono text-slate-550">
                  <div>
                    <span className="text-slate-655 block mb-0.5">Lead Investigator</span>
                    <span className="text-slate-350 font-bold flex items-center gap-1"><User size={10} /> {activeCase.created_by}</span>
                  </div>
                  <div>
                    <span className="text-slate-655 block mb-0.5">Filed At</span>
                    <span className="text-slate-355">{new Date(activeCase.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-655 block mb-0.5">Last Activity</span>
                    <span className="text-slate-355">{new Date(activeCase.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Middle Grid: Evidence vault & Scan linker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Evidence vault Panel */}
                <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/60 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-mono text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                      <FileCode size={14} className="text-blue-550" /> Digital Evidence Vault
                    </h3>
                    
                    {/* Ingest forensic file dropzone */}
                    <div className="p-3.5 bg-black/40 border border-dashed border-white/5 rounded-lg mb-4 text-left">
                      <label className="block text-[8px] font-mono text-slate-555 uppercase tracking-wider mb-2">Ingest Forensic File</label>
                      <div className="flex gap-2 items-center flex-wrap">
                        <input
                          type="file"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="text-[10px] file:bg-zinc-800 file:text-white file:border-0 file:rounded file:px-2.5 file:py-1 file:mr-2 text-slate-400 font-mono"
                        />
                        {uploadFile && (
                          <Button 
                            onClick={handleUploadEvidence} 
                            disabled={uploadLoading}
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Upload size={9} /> {uploadLoading ? "INGESTING..." : "INGEST"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Files list */}
                    {evidenceList.length === 0 ? (
                      <p className="text-slate-555 font-mono text-xs py-4 text-center">Vault empty.</p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {evidenceList.map((ev) => (
                          <div key={ev.id} className="p-2.5 bg-black/20 border border-white/5 rounded-lg text-[10px] font-mono">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-350 truncate max-w-[140px]">{ev.filename}</span>
                              <span className="text-slate-500">{(ev.file_size / 1024).toFixed(1)} KB</span>
                            </div>
                            <div className="text-slate-555 space-y-0.5 text-[9px]">
                              <div className="flex items-center gap-1.5">
                                <Hash size={9} /> <span className="text-blue-400">{ev.file_hash.slice(0, 20)}...</span>
                              </div>
                              <div>MIME Type: {ev.file_type}</div>
                              <div className="flex justify-between border-t border-white/5 mt-1.5 pt-1 text-[8px] text-slate-600">
                                <span>Uploaded By: {ev.uploaded_by}</span>
                                <span>{new Date(ev.uploaded_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Scan Telemetry Linker Panel */}
                <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/60 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-mono text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                      <LinkIcon size={14} className="text-blue-555" /> Scan Telemetry Linker
                    </h3>
                    
                    <p className="text-xs text-slate-555 leading-relaxed mb-4">
                      Link active scanning history logs directly to the case timeline to contextualize threat vectors.
                    </p>

                    <div className="space-y-3">
                      <select
                        value={selectedScanId}
                        onChange={(e) => setSelectedScanId(e.target.value)}
                        className="cyber-input w-full text-[10px] p-2"
                      >
                        <option value="">-- Select Scan Log --</option>
                        {scanHistory.map((log) => {
                          const label =
                            typeof log.input === "object"
                              ? JSON.stringify(log.input)
                              : String(log.input ?? "");
                          return (
                            <option key={log.id} value={log.id}>
                              [{log.tool}] {label.slice(0, 20)}... ({new Date(log.timestamp).toLocaleDateString()})
                            </option>
                          );
                        })}
                      </select>

                      <Button
                        onClick={handleAssociateScan}
                        disabled={associateLoading || !selectedScanId}
                        className="w-full text-xs font-mono flex items-center justify-center gap-1.5 py-2.5 tracking-wider"
                      >
                        <Plus size={12} />
                        {associateLoading ? "LINKING..." : "LINK SCAN HISTORY"}
                      </Button>
                    </div>
                  </div>
                </div>

              </div>

              {/* IOC Relationship Map & Attack path visualizer */}
              <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/60">
                <IocGraph 
                  caseTitle={activeCase.title} 
                  evidenceList={evidenceList} 
                  timeline={timeline} 
                />
              </div>

              {/* Forensics Chronological Timeline */}
              <div className="glass-card rounded-xl p-5 bg-[#0b0f19]/60">
                <h3 className="text-xs font-bold font-mono text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock size={14} className="text-blue-550" /> Forensic Timeline Events
                </h3>

                {/* Analyst Notes Appender */}
                <div className="mb-6 bg-black/25 p-4 border border-white/5 rounded-lg text-left">
                  <label className="block text-[8px] font-mono text-slate-555 uppercase tracking-wider mb-2 select-none">Append Analyst Note</label>
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder="e.g. Malicious indicators associated with domain registry..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleAddNote} 
                      disabled={noteLoading || !newNote.trim()} 
                      className="px-5 text-xs font-mono tracking-wider py-2"
                    >
                      {noteLoading ? "POSTING..." : "POST NOTE"}
                    </Button>
                  </div>
                </div>

                {/* Timeline display */}
                {timeline.length === 0 ? (
                  <p className="text-slate-555 font-mono text-xs py-4 text-center">Timeline log empty.</p>
                ) : (
                  <div className="pl-4 space-y-4 border-l border-white/5">
                    {timeline.map((event) => (
                      <div key={event.id} className="relative text-xs font-sans text-left pl-3">
                        {/* Dot indicator */}
                        <span className="absolute left-[-16px] top-1.5 w-2 h-2 rounded-full border border-[#030712] bg-blue-500" />

                        <div className="flex items-center gap-2 mb-1 flex-wrap font-mono text-[9px]">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                            event.event_type === "case_created" ? "bg-green-950/20 text-green-450 border-green-800/25" :
                            event.event_type === "evidence_uploaded" ? "bg-blue-955/20 text-blue-400 border-blue-800/25" :
                            event.event_type === "scan_associated" ? "bg-indigo-955/20 text-indigo-400 border-indigo-800/25" :
                            event.event_type === "status_changed" ? "bg-amber-955/20 text-amber-455 border-amber-800/25" :
                            "bg-purple-955/20 text-purple-400 border-purple-800/25"
                          }`}>
                            {event.event_type.replace("_", " ").toUpperCase()}
                          </span>
                          <span className="text-slate-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                          <span className="text-slate-555 font-bold uppercase">
                            (Inv: {event.user})
                          </span>
                        </div>
                        <p className="text-slate-300 mt-1 pl-1 text-[11px] leading-relaxed font-sans">{event.description}</p>
                        
                        {/* Nested Scan telemetry viewer */}
                        {event.metadata && event.metadata.result && (
                          <div className="mt-2.5 pl-3 border-l border-blue-500/20 bg-black/40 p-3 rounded-lg text-[10px] max-h-36 overflow-y-auto font-mono">
                            <pre className="p-0 border-0 bg-transparent text-[9px] leading-4 text-slate-455">
                              {JSON.stringify(event.metadata.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : null}

        </div>

      </div>

    </DashboardShell>
  );
}
