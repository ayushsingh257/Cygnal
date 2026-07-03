"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "react-hot-toast";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard routing
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "analyst") {
      toast.error("Access denied. Analysts and admins only.");
      router.push("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch Cases list
  useEffect(() => {
    if (!token) return;
    fetchCases();
    fetchScanHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Fetch active case details
  useEffect(() => {
    if (!selectedCaseId || !token) return;
    fetchCaseDetails(selectedCaseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 relative">
      <Toaster />
      <Navbar />

      <div className="max-w-7xl mx-auto mt-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: CASE LIST & CREATION */}
        <div className="space-y-8 lg:col-span-1">
          {/* Create Case Panel */}
          <Card className="glass-panel">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">💼 Create Investigation Case</h3>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">Case Title</label>
                <input
                  type="text"
                  placeholder="e.g. Hostinger Infrastructure Leak"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  className="input-cyber w-full font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">Description</label>
                <textarea
                  placeholder="Incident overview details..."
                  value={newCaseDesc}
                  onChange={(e) => setNewCaseDesc(e.target.value)}
                  className="input-cyber w-full font-mono text-sm h-20"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1 font-mono uppercase">Severity</label>
                <select
                  value={newCaseSeverity}
                  onChange={(e) => setNewCaseSeverity(e.target.value)}
                  className="input-cyber w-full font-mono text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <Button type="submit" className="w-full font-semibold" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Case"}
              </Button>
            </form>
          </Card>

          {/* Cases List */}
          <Card className="glass-panel">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">📋 Incident Cases ({cases.length})</h3>
            {loadingCases ? (
              <p className="text-gray-400 font-mono text-xs animate-pulse">Loading active cases...</p>
            ) : cases.length === 0 ? (
              <p className="text-gray-500 font-mono text-xs">No cases created yet.</p>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer text-left ${
                      selectedCaseId === c.id
                        ? "bg-purple-950/20 border-purple-500"
                        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono font-bold text-gray-400">{c.case_number}</span>
                      <span className={`tag-severity tag-severity-${c.severity}`}>
                        {c.severity}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm truncate">{c.title}</h4>
                    <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500 font-mono">
                      <span>By: {c.created_by}</span>
                      <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">{c.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: ACTIVE CASE WORKSPACE */}
        <div className="lg:col-span-2 space-y-8">
          {!selectedCaseId ? (
            <Card className="glass-panel flex flex-col justify-center items-center py-20 text-center h-full">
              <span className="text-5xl mb-4">💼</span>
              <h3 className="text-xl font-semibold text-gray-300">Case Investigation Workspace</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-sm">
                Select an incident case from the cases panel to inspect evidence files, associate scan telemetry, and trace timeline events.
              </p>
            </Card>
          ) : loadingDetails && !activeCase ? (
            <Card className="glass-panel py-20 text-center">
              <p className="text-gray-400 font-mono text-sm animate-pulse">Loading case logs...</p>
            </Card>
          ) : activeCase ? (
            <div className="space-y-8">
              {/* Case Header Details */}
              <Card className="glass-panel text-left">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-zinc-800 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-purple-400 font-bold">{activeCase.case_number}</span>
                      <span className={`tag-severity tag-severity-${activeCase.severity}`}>
                        {activeCase.severity} severity
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold mt-1 text-white">{activeCase.title}</h2>
                    <p className="text-sm text-gray-400 mt-2">{activeCase.description || "No description provided."}</p>
                  </div>
                  
                  {/* Status update controls */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-gray-500 uppercase">Incident Status</label>
                    <div className="flex gap-1.5 bg-zinc-950 p-1 rounded-md border border-zinc-800">
                      {["open", "investigating", "closed"].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(st)}
                          className={`px-2.5 py-1 text-[10px] capitalize font-mono font-bold rounded ${
                            activeCase.status === st
                              ? "bg-purple-900/50 text-purple-400 border border-purple-600"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-gray-500 block">Investigator</span>
                    <span className="text-gray-300 font-semibold">{activeCase.created_by}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Created At</span>
                    <span className="text-gray-300">{new Date(activeCase.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Last Updated</span>
                    <span className="text-gray-300">{new Date(activeCase.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              {/* Grid for Evidence & Scan Log association */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Evidence Panel */}
                <Card className="glass-panel text-left flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                      📁 Files & Digital Evidence
                    </h3>
                    
                    {/* Upload box */}
                    <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg mb-4">
                      <label className="block text-[10px] font-mono text-gray-500 uppercase mb-2">Upload Evidence File</label>
                      <div className="flex gap-2 items-center flex-wrap">
                        <input
                          type="file"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="text-xs file:bg-zinc-800 file:text-white file:border-0 file:rounded file:px-2.5 file:py-1 file:mr-2 text-gray-400"
                        />
                        {uploadFile && (
                          <Button onClick={handleUploadEvidence} size="sm" disabled={uploadLoading}>
                            {uploadLoading ? "Uploading..." : "Upload"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Evidence List */}
                    {evidenceList.length === 0 ? (
                      <p className="text-gray-500 font-mono text-xs">No evidence files registered.</p>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {evidenceList.map((ev) => (
                          <div key={ev.id} className="p-2 bg-zinc-900/60 border border-zinc-850 rounded text-xs font-mono">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-gray-300 truncate max-w-[150px]">{ev.filename}</span>
                              <span className="text-gray-500 text-[10px]">{(ev.file_size / 1024).toFixed(1)} KB</span>
                            </div>
                            <div className="text-[10px] text-gray-500 space-y-0.5">
                              <div>Hash: <span className="text-cyan-400">{ev.file_hash.slice(0, 16)}...</span></div>
                              <div>Type: {ev.file_type}</div>
                              <div className="flex justify-between text-[9px] mt-1 pt-1 border-t border-zinc-800/40">
                                <span>By: {ev.uploaded_by}</span>
                                <span>{new Date(ev.uploaded_at).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Scan Association Panel */}
                <Card className="glass-panel text-left">
                  <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
                    🔗 Associate Scan Telemetry
                  </h3>
                  
                  <div className="space-y-4">
                    <p className="text-xs text-gray-400">
                      Link active scanning history logs (e.g. Header Scanner, WHOIS Lookup, Port Sweeps) directly to the case timeline.
                    </p>

                    <div className="space-y-2">
                      <select
                        value={selectedScanId}
                        onChange={(e) => setSelectedScanId(e.target.value)}
                        className="input-cyber w-full font-mono text-xs"
                      >
                        <option value="">-- Select Scan Log --</option>
                        {scanHistory.map((log) => {
                          const inputLabel =
                            typeof log.input === "object"
                              ? JSON.stringify(log.input)
                              : String(log.input ?? "");
                          return (
                          <option key={log.id} value={log.id}>
                            [{log.tool}] {inputLabel} ({new Date(log.timestamp).toLocaleDateString()})
                          </option>
                          );
                        })}
                      </select>

                      <Button
                        onClick={handleAssociateScan}
                        className="w-full font-semibold"
                        disabled={associateLoading || !selectedScanId}
                      >
                        {associateLoading ? "Associating..." : "Associate Selected Scan"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Chronological Forensics Timeline */}
              <Card className="glass-panel text-left">
                <h3 className="text-lg font-semibold text-purple-400 mb-6 flex items-center gap-2">
                  📜 Chronological Incident Timeline
                </h3>

                {/* Add notes to timeline */}
                <div className="mb-6 bg-zinc-950 p-4 rounded-lg border border-zinc-900">
                  <label className="block text-[10px] font-mono text-gray-500 uppercase mb-2">Append Investigation Note</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Registrant email matches known threat actor profile..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="input-cyber flex-1 font-mono text-xs"
                    />
                    <Button onClick={handleAddNote} disabled={noteLoading} size="sm">
                      {noteLoading ? "Posting..." : "Post Note"}
                    </Button>
                  </div>
                </div>

                {/* Timeline Tree */}
                {timeline.length === 0 ? (
                  <p className="text-gray-500 font-mono text-xs pl-4">Timeline is empty.</p>
                ) : (
                  <div className="pl-4">
                    {timeline.map((event) => (
                      <div key={event.id} className="timeline-item text-xs">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            event.event_type === "case_created" ? "bg-green-950/40 text-green-400 border border-green-800" :
                            event.event_type === "evidence_uploaded" ? "bg-cyan-950/40 text-cyan-400 border border-cyan-800" :
                            event.event_type === "scan_associated" ? "bg-blue-950/40 text-blue-400 border border-blue-800" :
                            event.event_type === "status_changed" ? "bg-yellow-950/40 text-yellow-400 border border-yellow-800" :
                            "bg-purple-950/40 text-purple-400 border border-purple-800"
                          }`}>
                            {event.event_type.replace("_", " ").toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            (By: {event.user})
                          </span>
                        </div>
                        <p className="text-gray-200 mt-1 pl-1 text-sm font-medium">{event.description}</p>
                        
                        {/* Nested scan results mapping */}
                        {event.metadata && event.metadata.result && (
                          <div className="mt-2 pl-2 border-l-2 border-zinc-700 bg-zinc-950/50 p-2 rounded text-[10px] font-mono max-h-40 overflow-y-auto">
                            <pre className="p-0 border-0 bg-transparent text-[10px] leading-4 text-cyan-500/80">
                              {JSON.stringify(event.metadata.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : null}
        </div>

      </div>
    </main>
  );
}
