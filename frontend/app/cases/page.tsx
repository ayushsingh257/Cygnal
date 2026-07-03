"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardShell from "@/components/DashboardShell";
import IocGraph from "@/components/IocGraph";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "react-hot-toast";
import { 
  FolderPlus, 
  Folder, 
  ChevronRight, 
  Clock, 
  FileCode, 
  Plus, 
  Link as LinkIcon, 
  AlertCircle,
  FileText,
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

  // Severity indicator border colors
  const severityBorders: Record<string, string> = {
    low: "border-green-500/20 hover:border-green-500/40",
    medium: "border-yellow-500/20 hover:border-yellow-500/40",
    high: "border-orange-500/20 hover:border-orange-500/40",
    critical: "border-red-500/40 hover:border-red-500/70 shadow-md shadow-red-950/10"
  };

  return (
    <DashboardShell>
      <Toaster />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        
        {/* LEFT COLUMN: DIRECTORY & CREATION (Lg: 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Create Incident Case Panel */}
          <div className="glass-panel p-5 bg-[#0c0c0e]/80">
            <h3 className="text-sm font-semibold font-mono text-white border-b border-white/5 pb-2 mb-4 flex items-center gap-1.5">
              <FolderPlus size={16} /> File New Incident
            </h3>
            
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 font-mono uppercase">Case Title</label>
                <input
                  type="text"
                  placeholder="e.g. Server-04 Data Ingress Sweep"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  className="input-cyber w-full font-mono text-xs px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1 font-mono uppercase">Incident Description</label>
                <textarea
                  placeholder="Details of suspicious vectors..."
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  className="input-cyber w-full font-mono text-xs px-3 py-2 h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 mb-1 font-mono uppercase">Severity Tier</label>
                <select
                  value={newCaseSeverity}
                  onChange={(e) => setNewCaseSeverity(e.target.value)}
                  className="input-cyber w-full font-mono text-xs px-3 py-2"
                >
                  <option value="low">Low Impact</option>
                  <option value="medium">Medium Security</option>
                  <option value="high">High Threat</option>
                  <option value="critical">Critical Incident</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full btn-cyber-primary py-2 text-xs font-mono" 
                disabled={createLoading}
              >
                {createLoading ? "FILE RECORDING..." : "COMMIT INCIDENT CASE"}
              </button>
            </form>
          </div>

          {/* Incident Cases Directory List */}
          <div className="glass-panel p-5 bg-[#0c0c0e]/80">
            <h3 className="text-sm font-semibold font-mono text-white border-b border-white/5 pb-2 mb-4 flex items-center gap-1.5">
              <Folder size={16} /> Case File Index ({cases.length})
            </h3>
            
            {loadingCases ? (
              <p className="text-gray-500 font-mono text-xs py-4 animate-pulse">Loading active indices...</p>
            ) : cases.length === 0 ? (
              <p className="text-gray-500 font-mono text-xs py-4 text-center">No cases filed.</p>
            ) : (
              <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`p-3 rounded border transition cursor-pointer flex flex-col justify-between ${
                      selectedCaseId === c.id
                        ? "bg-purple-950/15 border-purple-500"
                        : `bg-black/35 ${severityBorders[c.severity]}`
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-gray-500">{c.case_number}</span>
                      <span className={`tag-severity tag-severity-${c.severity}`}>
                        {c.severity}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-gray-200 truncate">{c.title}</h4>
                    <div className="flex justify-between items-center mt-2.5 text-[9px] text-gray-500 font-mono">
                      <span>Investigator: {c.created_by}</span>
                      <span className="capitalize px-1.5 py-0.2 bg-zinc-950 border border-white/5 rounded text-cyan-500">{c.status}</span>
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
            <div className="glass-panel py-28 text-center flex flex-col items-center justify-center bg-[#0c0c0e]/40 h-full border-dashed border-white/5">
              <Folder className="w-12 h-12 text-zinc-600 mb-3" />
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">DFIR Case Investigation console</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs font-mono">
                Select an incident card from the index to verify hashes, audit notes, correlate scans, and plot IOC pathways.
              </p>
            </div>
          ) : loadingDetails && !activeCase ? (
            <div className="glass-panel py-28 text-center bg-[#0c0c0e]/40">
              <p className="text-zinc-500 font-mono text-xs animate-pulse">Synchronizing case details buffer...</p>
            </div>
          ) : activeCase ? (
            <div className="space-y-6">
              
              {/* Active Incident Case Header */}
              <div className="glass-panel p-5 bg-[#0c0c0e]/85 relative overflow-hidden">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-white/5 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-purple-400 font-bold">{activeCase.case_number}</span>
                      <span className={`tag-severity tag-severity-${activeCase.severity}`}>
                        {activeCase.severity}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold font-mono text-white mt-2">{activeCase.title}</h2>
                    <p className="text-xs text-gray-400 mt-2 font-mono leading-relaxed">{activeCase.description || "No overview statement."}</p>
                  </div>
                  
                  {/* Status Toggle Switch */}
                  <div className="space-y-1 bg-black/45 p-1.5 rounded border border-white/5">
                    <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider">Operational Status</label>
                    <div className="flex gap-1">
                      {["open", "investigating", "closed"].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(st)}
                          className={`px-2 py-0.5 text-[9px] capitalize font-mono rounded ${
                            activeCase.status === st
                              ? "bg-purple-900/30 text-purple-400 border border-purple-500/50"
                              : "text-gray-500 hover:text-gray-300"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-mono text-gray-400">
                  <div>
                    <span className="text-gray-600 block">Lead Investigator</span>
                    <span className="text-gray-300 font-bold flex items-center gap-1"><User size={10} /> {activeCase.created_by}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Filed At</span>
                    <span className="text-gray-300">{new Date(activeCase.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 block">Last Activity</span>
                    <span className="text-gray-300">{new Date(activeCase.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Middle Grid: Evidence vault & Scan linker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Evidence vault Panel */}
                <div className="glass-panel p-5 bg-[#0c0c0e]/80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-mono text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5">
                      <FileCode size={16} /> Digital Evidence Vault
                    </h3>
                    
                    {/* Simulated Drop zone file upload */}
                    <div className="p-3 bg-black/45 border border-dashed border-white/5 rounded mb-4">
                      <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-2">Ingest Forensic File</label>
                      <div className="flex gap-2 items-center flex-wrap">
                        <input
                          type="file"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="text-[10px] file:bg-zinc-800 file:text-white file:border-0 file:rounded file:px-2 file:py-0.5 file:mr-2 text-gray-400"
                        />
                        {uploadFile && (
                          <button 
                            onClick={handleUploadEvidence} 
                            disabled={uploadLoading}
                            className="btn-cyber-primary px-3 py-1 text-[9px] font-mono flex items-center gap-1"
                          >
                            <Upload size={10} /> {uploadLoading ? "INGESTING..." : "INGEST"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Files list */}
                    {evidenceList.length === 0 ? (
                      <p className="text-gray-500 font-mono text-xs py-4 text-center">Vault empty.</p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {evidenceList.map((ev) => (
                          <div key={ev.id} className="p-2.5 bg-black/25 border border-white/5 rounded text-[10px] font-mono">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-gray-300 truncate max-w-[140px]">{ev.filename}</span>
                              <span className="text-gray-500">{(ev.file_size / 1024).toFixed(1)} KB</span>
                            </div>
                            <div className="text-gray-500 space-y-0.5 text-[9px]">
                              <div className="flex items-center gap-1">
                                <Hash size={8} /> <span className="text-cyan-400">{ev.file_hash.slice(0, 20)}...</span>
                              </div>
                              <div>Mime: {ev.file_type}</div>
                              <div className="flex justify-between border-t border-white/5 mt-1 pt-1 text-[8px] text-gray-600">
                                <span>Inv: {ev.uploaded_by}</span>
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
                <div className="glass-panel p-5 bg-[#0c0c0e]/80 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold font-mono text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5">
                      <LinkIcon size={16} /> Scan Telemetry Linker
                    </h3>
                    
                    <p className="text-[11px] text-gray-400 font-mono leading-relaxed mb-4">
                      Link active scanning history logs directly to the case timeline to contextualize threat vectors.
                    </p>

                    <div className="space-y-3">
                      <select
                        value={selectedScanId}
                        onChange={(e) => setSelectedScanId(e.target.value)}
                        className="input-cyber w-full font-mono text-[10px] p-2 bg-black/50 border-white/5"
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

                      <button
                        onClick={handleAssociateScan}
                        disabled={associateLoading || !selectedScanId}
                        className="w-full btn-cyber-primary py-2 text-xs font-mono flex items-center justify-center gap-1.5"
                      >
                        <Plus size={12} />
                        {associateLoading ? "LINKING..." : "LINK SCAN HISTORY"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* IOC Relationship Map & Attack path visualizer */}
              <div className="glass-panel p-5 bg-[#0c0c0e]/80">
                <IocGraph 
                  caseTitle={activeCase.title} 
                  evidenceList={evidenceList} 
                  timeline={timeline} 
                />
              </div>

              {/* Forensics Chronological Timeline */}
              <div className="glass-panel p-5 bg-[#0c0c0e]/80">
                <h3 className="text-xs font-bold font-mono text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5">
                  <Clock size={16} /> Forensic Timeline Events
                </h3>

                {/* Analyst Notes Appender */}
                <div className="mb-6 bg-black/45 p-3.5 border border-white/5 rounded">
                  <label className="block text-[8px] font-mono text-gray-500 uppercase tracking-wider mb-2">Append Analyst Note</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Malicious indicators associated with domain registry..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="input-cyber flex-1 font-mono text-xs px-3 py-1.5"
                    />
                    <button 
                      onClick={handleAddNote} 
                      disabled={noteLoading || !newNote.trim()} 
                      className="btn-cyber-primary px-4 py-1.5 text-xs font-mono"
                    >
                      {noteLoading ? "POSTING..." : "POST NOTE"}
                    </button>
                  </div>
                </div>

                {/* Timeline display */}
                {timeline.length === 0 ? (
                  <p className="text-gray-500 font-mono text-xs py-4 text-center">Timeline log empty.</p>
                ) : (
                  <div className="pl-4">
                    {timeline.map((event) => (
                      <div key={event.id} className="timeline-item text-xs font-mono text-left">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.2 rounded text-[8px] font-bold ${
                            event.event_type === "case_created" ? "bg-green-950/40 text-green-400 border border-green-800" :
                            event.event_type === "evidence_uploaded" ? "bg-cyan-950/40 text-cyan-400 border border-cyan-800" :
                            event.event_type === "scan_associated" ? "bg-blue-950/40 text-blue-400 border border-blue-800" :
                            event.event_type === "status_changed" ? "bg-yellow-950/40 text-yellow-400 border border-yellow-800" :
                            "bg-purple-950/40 text-purple-400 border border-purple-800"
                          }`}>
                            {event.event_type.replace("_", " ").toUpperCase()}
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            (Inv: {event.user})
                          </span>
                        </div>
                        <p className="text-gray-200 mt-1 pl-1 text-xs leading-relaxed">{event.description}</p>
                        
                        {/* Nested Scan telemetry viewer */}
                        {event.metadata && event.metadata.result && (
                          <div className="mt-2 pl-2 border-l-2 border-cyan-500/20 bg-zinc-950/80 p-2.5 rounded text-[10px] max-h-36 overflow-y-auto">
                            <pre className="p-0 border-0 bg-transparent text-[9px] leading-4 text-cyan-500/80">
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
