"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";
import { io } from "socket.io-client";
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
  FileCode,
  Search,
  Maximize,
  Filter,
  Mail,
  Globe
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
  const [activeTab, setActiveTab] = useState<"timeline" | "evidence" | "graph" | "comments">("timeline");

  // Collaborative Real-Time states (v2.5)
  const [comments, setComments] = useState<any[]>([]);
  const [collabMessageText, setCollabMessageText] = useState("");
  const [lockedBy, setLockedBy] = useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<string | null>(null);
  const [myLockActive, setMyLockActive] = useState(false);
  const [isCaseLocked, setIsCaseLocked] = useState(false);
  const socketRef = useRef<any>(null);

  // Phase 4 Collaboration states
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);

  // Filter states
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Sprint 2 Graph states
  const [graphNodes, setGraphNodes] = useState<any[]>([]);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [layoutNodes, setLayoutNodes] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilters, setTypeFilters] = useState<string[]>([]);

  // Sprint 3 Timeline states
  const [timelineStages, setTimelineStages] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [expandedStages, setExpandedStages] = useState<string[]>(["Initial Detection"]);

  // Sprint 4A Orchestrator states
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [jobElapsed, setJobElapsed] = useState(0);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [orchestratorTarget, setOrchestratorTarget] = useState("");
  const [orchestratorType, setOrchestratorType] = useState("");
  const [orchestratorFile, setOrchestratorFile] = useState<File | null>(null);
  const [orchestratorLaunching, setOrchestratorLaunching] = useState(false);




  useEffect(() => {
    if (!token) return;
    fetchCases();
  }, [token]);

  // Load team roster
  useEffect(() => {
    if (!token) return;
    fetch("/api/roster", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRoster(data.users || []);
        }
      })
      .catch(err => console.error("Error loading roster:", err));
  }, [token]);

  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetails(selectedCaseId);
      fetchGraphData(selectedCaseId);
      fetchTimelineStages(selectedCaseId);
    } else {
      setCaseDetails(null);
      setTimeline([]);
      setEvidence([]);
      setGraphNodes([]);
      setGraphEdges([]);
      setTimelineStages([]);
    }
  }, [selectedCaseId]);

  // WebSockets Real-Time connection & Case Room subscription (v2.5 & Phase 4)
  useEffect(() => {
    if (!selectedCaseId || !token) {
      setComments([]);
      setLockedBy(null);
      setIsCaseLocked(false);
      setMyLockActive(false);
      setActiveUsers([]);
      setTypingUser(null);
      return;
    }

    // Resolve URL for dev vs prod context
    let connectionUrl = "";
    if (typeof window !== "undefined") {
      const port = window.location.port;
      if (port === "3000" || port === "3001") {
        connectionUrl = "http://localhost:5000";
      } else {
        connectionUrl = window.location.origin;
      }
    }

    const socket = io(connectionUrl, {
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket linked to backend channel.");
      socket.emit("join_case", { case_id: selectedCaseId, token });
    });

    socket.on("new_comment", (data: any) => {
      if (data.case_id === selectedCaseId) {
        setComments((prev) => {
          if (prev.some((c) => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
      }
    });

    socket.on("case_locked", (data: any) => {
      if (data.case_id === selectedCaseId) {
        setLockedBy(data.locked_by);
        setLockExpiresAt(data.expires_at);
        if (data.locked_by !== user?.username) {
          setIsCaseLocked(true);
          setMyLockActive(false);
        } else {
          setIsCaseLocked(false);
          setMyLockActive(true);
        }
      }
    });

    socket.on("case_unlocked", (data: any) => {
      if (data.case_id === selectedCaseId) {
        setLockedBy(null);
        setLockExpiresAt(null);
        setIsCaseLocked(false);
        setMyLockActive(false);
      }
    });

    // Phase 4: Room User Presence Updates
    socket.on("presence_update", (data: any) => {
      if (data.case_id === selectedCaseId) {
        setActiveUsers(data.users || []);
      }
    });

    // Phase 4: Typing Status Broadcasts
    socket.on("typing_update", (data: any) => {
      if (data.case_id === selectedCaseId) {
        if (data.is_typing) {
          setTypingUser(data.username);
        } else {
          setTypingUser(null);
        }
      }
    });

    // Phase 4: Case Information Synced (Metadata / Assignment)
    socket.on("case_updated", (data: any) => {
      if (data.case_id === selectedCaseId) {
        fetchCaseDetails(selectedCaseId);
        fetchCases();
      }
    });

    // Phase 4: Evidence Workspace Auto-Sync
    socket.on("new_evidence", (data: any) => {
      if (data.case_id === selectedCaseId) {
        setEvidence((prev) => {
          if (prev.some((ev) => ev.id === data.evidence.id)) return prev;
          return [data.evidence, ...prev];
        });
        // Reload case details to update graph and narrator
        fetchGraphData(selectedCaseId);
        fetchTimelineStages(selectedCaseId);
      }
    });

    // Phase 4: Extracted Indicators Auto-Sync
    socket.on("indicators_updated", (data: any) => {
      if (data.case_id === selectedCaseId) {
        // Trigger graph and timeline reload since new indicators are linked
        fetchGraphData(selectedCaseId);
        fetchTimelineStages(selectedCaseId);
      }
    });

    // Phase 4: Timeline Chronology Sync
    socket.on("timeline_updated", (data: any) => {
      if (data.case_id === selectedCaseId) {
        setTimeline((prev) => {
          if (prev.some((evt) => evt.id === data.event.id)) return prev;
          return [data.event, ...prev];
        });
        fetchTimelineStages(selectedCaseId);
      }
    });

    // Fetch initial comments & lock state
    fetchComments(selectedCaseId);
    fetchLockStatus(selectedCaseId);

    return () => {
      socket.emit("leave_case", { case_id: selectedCaseId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedCaseId, token, user?.username]);

  // Lock auto-renewal hook
  useEffect(() => {
    if (!myLockActive || !selectedCaseId) return;

    const renewInterval = setInterval(() => {
      autoRenewLock();
    }, 15000);

    return () => clearInterval(renewInterval);
  }, [myLockActive, selectedCaseId]);

  const autoRenewLock = async () => {
    if (!selectedCaseId) return;
    try {
      await fetch(`/api/cases/${selectedCaseId}/lock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error("Lock auto-renewal failed.", e);
    }
  };

  const fetchComments = async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setComments(data.comments || []);
      }
    } catch {
      console.error("Failed to load comments.");
    }
  };

  const fetchLockStatus = async (caseId: string) => {
    try {
      const res = await fetch(`/api/cases/${caseId}/lock`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.locked) {
        setLockedBy(data.locked_by);
        setLockExpiresAt(data.expires_at);
        if (data.locked_by !== user?.username) {
          setIsCaseLocked(true);
          setMyLockActive(false);
        } else {
          setIsCaseLocked(false);
          setMyLockActive(true);
        }
      } else {
        setLockedBy(null);
        setLockExpiresAt(null);
        setIsCaseLocked(false);
        setMyLockActive(false);
      }
    } catch {
      console.error("Failed to load lock status.");
    }
  };

  const handleAcquireLock = async () => {
    if (!selectedCaseId) return;
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/lock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLockedBy(data.locked_by);
        setLockExpiresAt(data.expires_at);
        setMyLockActive(true);
        setIsCaseLocked(false);
        toast.success("Case lock acquired. Edit mode activated.");
      } else {
        setLockedBy(data.locked_by);
        setIsCaseLocked(true);
        setMyLockActive(false);
        toast.error(data.error || "Failed to acquire lock.");
      }
    } catch {
      toast.error("Error communicating with locking engine.");
    }
  };

  const handleReleaseLock = async () => {
    if (!selectedCaseId) return;
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/unlock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLockedBy(null);
        setMyLockActive(false);
        setIsCaseLocked(false);
        toast.success("Case lock released.");
      } else {
        toast.error(data.error || "Failed to release lock.");
      }
    } catch {
      toast.error("Error communicating with locking engine.");
    }
  };

  const handlePostCollabComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabMessageText.trim() || !selectedCaseId) return;

    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: collabMessageText })
      });
      const data = await res.json();
      if (data.success) {
        setCollabMessageText("");
        // Clear typing status
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        setIsTyping(false);
        if (socketRef.current) {
          socketRef.current.emit("typing_status", { case_id: selectedCaseId, token, is_typing: false });
        }
      } else {
        toast.error(data.error || "Failed to post comment.");
      }
    } catch {
      toast.error("Post comment connection timeout.");
    }
  };

  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCollabMessageText(val);

    if (!socketRef.current) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit("typing_status", { case_id: selectedCaseId, token, is_typing: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit("typing_status", { case_id: selectedCaseId, token, is_typing: false });
    }, 2500);
  };

  // Job status polling hook
  useEffect(() => {
    if (!activeJobId) return;

    let pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/investigations/${activeJobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.job) {
          setActiveJob(data.job);
          
          if (data.job.case_id) {
            fetchTimelineStages(data.job.case_id);
          }

          if (data.job.status === "completed" || data.job.status === "failed" || data.job.status === "cancelled") {
            clearInterval(pollInterval);
            setActiveJobId(null);
            
            if (data.job.case_id) {
              fetchCaseDetails(data.job.case_id);
              fetchGraphData(data.job.case_id);
              fetchTimelineStages(data.job.case_id);
              fetchCases();
            }
          }
        }
      } catch {
        console.error("Job polling failed.");
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [activeJobId, token]);

  // Elapsed timer hook
  useEffect(() => {
    if (!activeJobId) {
      setJobElapsed(0);
      return;
    }
    let timer = setInterval(() => {
      setJobElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeJobId]);

  const handleLaunchOrchestrator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orchestratorTarget.trim() && !orchestratorFile) {
      toast.error("Please provide a target string or upload a file.");
      return;
    }
    setOrchestratorLaunching(true);
    try {
      let res;
      if (orchestratorFile) {
        const formData = new FormData();
        formData.append("file", orchestratorFile);
        if (orchestratorTarget.trim()) formData.append("target", orchestratorTarget);
        if (orchestratorType) formData.append("input_type", orchestratorType);
        if (selectedCaseId) formData.append("case_id", selectedCaseId);
        
        res = await fetch("/api/investigations/start", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        const payload: any = { target: orchestratorTarget };
        if (orchestratorType) payload.input_type = orchestratorType;
        if (selectedCaseId) payload.case_id = selectedCaseId;
        
        res = await fetch("/api/investigations/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success("Autonomous investigation job started.");
        setActiveJobId(data.job_id);
        setActiveJob({
          target: data.target,
          input_type: data.input_type,
          status: "queued",
          progress: 0,
          current_scanner: "Initializing",
          completed_scanners: [],
          scanner_statuses: {}
        });
        setIsTriggerModalOpen(false);
        setOrchestratorTarget("");
        setOrchestratorFile(null);
        setOrchestratorType("");
        
        if (data.case_id && data.case_id !== selectedCaseId) {
          setSelectedCaseId(data.case_id);
        }
      } else {
        toast.error(data.error || "Failed to start investigation.");
      }
    } catch {
      toast.error("Network error launching orchestrator.");
    } finally {
      setOrchestratorLaunching(false);
    }
  };

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

  const fetchGraphData = async (id: string) => {
    setGraphLoading(true);
    try {
      const res = await fetch(`/api/cases/${id}/graph`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setGraphNodes(data.nodes || []);
        setGraphEdges(data.edges || []);
      }
    } catch {
      console.error("Failed to load case graph.");
    } finally {
      setGraphLoading(false);
    }
  };

  const fetchTimelineStages = async (id: string) => {
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/cases/${id}/timeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTimelineStages(data.stages || []);
      }
    } catch {
      console.error("Failed to load timeline stages.");
    } finally {
      setTimelineLoading(false);
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

  // Dynamic Force-Directed Layout algorithm for interactive graph mapping
  useEffect(() => {
    if (graphNodes.length === 0) {
      setLayoutNodes([]);
      return;
    }
    
    const width = 800;
    const height = 450;
    
    // Initialize node coordinates
    const nodesWithPos = graphNodes.map((node, idx) => {
      if (node.group === "case" && !node.cross_case) {
        return { ...node, x: width / 2, y: height / 2, vx: 0, vy: 0 };
      }
      const angle = (idx * 2 * Math.PI) / Math.max(1, graphNodes.length - 1);
      const r = 120 + Math.random() * 20;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * r,
        y: height / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0
      };
    });
    
    // Simple force layout simulation
    const k = 0.05;
    const rep = 1200;
    const centerPull = 0.035;
    const iterations = 100;
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < nodesWithPos.length; i++) {
        for (let j = i + 1; j < nodesWithPos.length; j++) {
          const dx = nodesWithPos[i].x - nodesWithPos[j].x;
          const dy = nodesWithPos[i].y - nodesWithPos[j].y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          if (dist < 200) {
            const force = rep / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            if (nodesWithPos[i].group !== "case" || nodesWithPos[i].cross_case) {
              nodesWithPos[i].vx += fx;
              nodesWithPos[i].vy += fy;
            }
            if (nodesWithPos[j].group !== "case" || nodesWithPos[j].cross_case) {
              nodesWithPos[j].vx -= fx;
              nodesWithPos[j].vy -= fy;
            }
          }
        }
      }
      
      graphEdges.forEach((edge) => {
        const src = nodesWithPos.find((n) => n.id === edge.source);
        const tgt = nodesWithPos.find((n) => n.id === edge.target);
        if (src && tgt) {
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const desiredDist = 100;
          const force = (dist - desiredDist) * k;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          if (src.group !== "case" || src.cross_case) {
            src.vx += fx;
            src.vy += fy;
          }
          if (tgt.group !== "case" || tgt.cross_case) {
            tgt.vx -= fx;
            tgt.vy -= fy;
          }
        }
      });
      
      nodesWithPos.forEach((node) => {
        if (node.group === "case" && !node.cross_case) return;
        const dx = width / 2 - node.x;
        const dy = height / 2 - node.y;
        node.vx += dx * centerPull;
        node.vy += dy * centerPull;
        
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.65;
        node.vy *= 0.65;
      });
    }
    
    setLayoutNodes(nodesWithPos);
  }, [graphNodes, graphEdges]);

  // SVG Panning/Zooming Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(prev * zoomFactor, 3));
    } else {
      setZoom((prev) => Math.max(prev / zoomFactor, 0.4));
    }
  };
  
  const resetZoomPan = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  // Node highlighting and neighbor resolution helpers
  const getNeighbors = (nodeId: string) => {
    const neighbors = new Set<string>();
    graphEdges.forEach((edge) => {
      if (edge.source === nodeId) neighbors.add(edge.target);
      if (edge.target === nodeId) neighbors.add(edge.source);
    });
    return neighbors;
  };

  const isHighlighted = (nodeId: string) => {
    if (!selectedNodeId) return true;
    if (nodeId === selectedNodeId) return true;
    return getNeighbors(selectedNodeId).has(nodeId);
  };

  const getNodeColor = (group: string) => {
    switch (group) {
      case "case": return "#10b981"; // Emerald
      case "evidence": return "#3b82f6"; // Blue
      case "threat_intel": return "#ef4444"; // Red
      case "ip": return "#6366f1"; // Indigo
      case "domain": return "#06b6d4"; // Cyan
      case "url": return "#0891b2"; // Dark Cyan
      case "email": return "#8b5cf6"; // Violet
      case "hash": return "#a855f7"; // Purple
      default: return "#94a3b8"; // Slate
    }
  };

  const getGroupIcon = (group: string) => {
    switch (group) {
      case "case": return <Briefcase size={12} className="text-white" />;
      case "evidence": return <FileText size={12} className="text-white" />;
      case "threat_intel": return <ShieldAlert size={12} className="text-white" />;
      case "ip": return <Network size={12} className="text-white" />;
      case "domain": return <Globe size={12} className="text-white" />;
      case "url": return <Layers size={12} className="text-white" />;
      case "email": return <User size={12} className="text-white" />;
      case "hash": return <FileCode size={12} className="text-white" />;
      default: return <Layers size={12} className="text-white" />;
    }
  };

  // Node filtering
  const filteredNodes = layoutNodes.filter((node) => {
    if (searchQuery && !node.label.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (typeFilters.length > 0 && node.group !== "case" && !typeFilters.includes(node.group)) {
      return false;
    }
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  const filteredEdges = graphEdges.filter((edge) => {
    return filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target);
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case "case_created": return <Plus size={11} className="text-emerald-400" />;
      case "evidence_uploaded": return <UploadCloud size={11} className="text-blue-400" />;
      case "ioc_extracted": return <Layers size={11} className="text-purple-400" />;
      case "threat_intel_match": return <ShieldAlert size={11} className="text-red-400" />;
      case "evidence_relation": return <Network size={11} className="text-indigo-400" />;
      case "analyst_note": return <User size={11} className="text-amber-400" />;
      case "scanner_execution": return <Activity size={11} className="text-cyan-400" />;
      default: return <Clock size={11} className="text-slate-400" />;
    }
  };

  const toggleStageExpanded = (stageName: string) => {
    if (expandedStages.includes(stageName)) {
      setExpandedStages(expandedStages.filter((x) => x !== stageName));
    } else {
      setExpandedStages([...expandedStages, stageName]);
    }
  };



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
                    
                    {/* Workspace Presence HUD */}
                    {activeUsers.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 select-none">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Workspace:</span>
                        <div className="flex -space-x-1 overflow-hidden">
                          {activeUsers.map((u, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[8px] font-bold text-blue-400 font-mono shadow-md"
                              title={`${u.username} (${u.role.replace("_", " ").toUpperCase()})`}
                            >
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row items-center gap-3">
                    <button
                      onClick={() => setIsTriggerModalOpen(true)}
                      className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-[10px] font-mono font-bold tracking-wide uppercase transition flex items-center gap-1.5 shadow-[0_0_8px_rgba(59,130,246,0.1)]"
                    >
                      <Activity size={12} className="animate-pulse text-blue-400" />
                      Orchestrate Scan
                    </button>
                    <div className="text-[10px] font-mono text-slate-500 text-left sm:text-right space-y-1">
                      <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                        <span>OWNER:</span>
                        <select
                          value={caseDetails.assigned_to || ""}
                          disabled={isCaseLocked && !myLockActive}
                          onChange={async (e) => {
                            const newAssignee = e.target.value;
                            if (!newAssignee) return;
                            try {
                              const res = await fetch(`/api/cases/${caseDetails.id}/assign`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ assigned_to: newAssignee })
                              });
                              const data = await res.json();
                              if (data.success) {
                                toast.success(`Case assigned to ${newAssignee}.`);
                                setCaseDetails(prev => prev ? { ...prev, assigned_to: newAssignee } : null);
                              } else {
                                toast.error(data.error || "Failed to assign case.");
                              }
                            } catch {
                              toast.error("Assignment connection failure.");
                            }
                          }}
                          className="bg-[#0b0f19] border border-white/5 px-2 py-0.5 rounded text-[10px] text-slate-350 focus:outline-none focus:border-blue-500/30"
                        >
                          <option value="">UNASSIGNED</option>
                          {roster.map((u) => (
                            <option key={u.username} value={u.username}>
                              {u.username.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>DEPARTMENT: <span className="text-slate-350">{caseDetails.department.toUpperCase()}</span></div>
                    </div>
                  </div>

                </div>

                {/* Case Locking HUD Banner (v2.5) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all text-xs font-mono select-none bg-[#091413]/40 border-[#408A71]/15 gap-2 text-left">
                  <div className="flex items-center gap-2.5">
                    {isCaseLocked ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <div>
                          <span className="text-red-400 font-bold uppercase tracking-wider block">
                            ⚠️ Case Locked by {lockedBy}
                          </span>
                          <span className="text-[9px] text-slate-500 block">
                            Read-only worksheet view active.
                          </span>
                        </div>
                      </>
                    ) : myLockActive ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <span className="text-emerald-400 font-bold uppercase tracking-wider block">
                            🔒 Case Locked by You
                          </span>
                          <span className="text-[9px] text-slate-500 block">
                            Lease auto-renewing. Full editing permissions active.
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <div>
                          <span className="text-slate-400 font-bold uppercase tracking-wider block">
                            🔓 Case Unlocked
                          </span>
                          <span className="text-[9px] text-slate-500 block">
                            Anyone can view/edit. Claim lock to restrict write access.
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    {isCaseLocked ? (
                      <button
                        disabled
                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-600 rounded text-[9.5px] font-bold uppercase cursor-not-allowed"
                      >
                        Lock Engaged
                      </button>
                    ) : myLockActive ? (
                      <button
                        type="button"
                        onClick={handleReleaseLock}
                        className="px-2.5 py-1.5 bg-red-950/20 border border-red-800/40 hover:border-red-650 hover:bg-red-950/40 text-red-400 rounded text-[9.5px] font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        Release Lock
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleAcquireLock}
                        className="px-2.5 py-1.5 bg-[#285A48]/20 border border-[#408A71]/35 hover:border-[#408A71] text-[#B0E4CC] rounded text-[9.5px] font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        Acquire Lock
                      </button>
                    )}
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-white/5 select-none">
                  {(["timeline", "evidence", "graph", "comments"] as const).map((tab) => (
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
                      {tab === "comments" && "Collaborative Chat"}
                    </button>
                  ))}
                </div>

                {/* Active Job Progress Dashboard */}
                {activeJob && activeJob.case_id === caseDetails.id && (
                  <div className="border border-blue-500/20 rounded-xl bg-blue-955/10 p-4 space-y-3.5 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.03)] text-left">
                    <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-blue-500 via-teal-400 to-blue-600 animate-pulse" />
                    
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold font-mono tracking-widest text-blue-400 uppercase">
                          🤖 Autonomous Investigation Pipeline
                        </span>
                        <h4 className="text-xs font-semibold text-slate-200">
                          Target: <span className="font-mono text-white select-all">{activeJob.target}</span>
                        </h4>
                      </div>
                      <div className="flex gap-2 items-center text-[9px] font-mono">
                        <span className="text-slate-500">ELAPSED:</span>
                        <span className="text-blue-450 font-bold">{jobElapsed}s</span>
                        <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                          activeJob.status === "completed" ? "bg-emerald-950/20 text-emerald-450 border border-emerald-800/25" :
                          activeJob.status === "failed" ? "bg-red-950/20 text-red-400 border border-red-800/25" :
                          "bg-amber-955/20 text-amber-500 border border-amber-800/25 animate-pulse"
                        }`}>
                          {activeJob.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400">
                          Pipeline Step: <span className="text-white font-bold">{activeJob.current_scanner}</span>
                        </span>
                        <span className="text-blue-400 font-bold">{activeJob.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-900/60 rounded-full overflow-hidden border border-white/5 relative">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all duration-500 relative"
                          style={{ width: `${activeJob.progress}%` }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[size:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
                        </div>
                      </div>
                    </div>

                    {/* Scanners checklist grid */}
                    {activeJob.scanner_statuses && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {Object.entries(activeJob.scanner_statuses).map(([name, status]) => (
                          <div 
                            key={name} 
                            className={`flex items-center gap-2 px-2 py-1 rounded bg-slate-950 border text-[9px] font-mono font-semibold ${
                              status === "completed" ? "border-emerald-500/25 text-emerald-400" :
                              status === "failed" ? "border-red-500/25 text-red-400" :
                              "border-slate-800 text-slate-500"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              status === "completed" ? "bg-emerald-500" :
                              status === "failed" ? "bg-red-500" :
                              "bg-slate-700"
                            }`} />
                            <span className="uppercase">{name}</span>
                          </div>
                        ))}
                        {activeJob.status === "running" && activeJob.current_scanner !== "None" && (
                          <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-950 border border-amber-500/25 text-amber-500 text-[9px] font-mono font-semibold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            <span className="uppercase">{activeJob.current_scanner}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: Timeline */}

                {activeTab === "timeline" && (
                  <div className="space-y-5">
                    {/* Add Timeline note input */}
                    <form onSubmit={handlePostComment} className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Log new analyst note to case timeline..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="cyber-input py-2 text-xs bg-black/40"
                      />
                      <button 
                        type="submit"
                        className="btn-cyber-primary py-2 px-4 flex items-center justify-center"
                      >
                        <Send size={13} />
                      </button>
                    </form>

                    {/* Timeline Stages List */}
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {timelineLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-550 animate-pulse">
                          <Activity className="w-5 h-5 animate-spin text-blue-450 mr-2" />
                          <span className="text-[10px] font-mono uppercase tracking-wider">Parsing chronological ledger events...</span>
                        </div>
                      ) : timelineStages.length === 0 ? (
                        <p className="text-[11px] font-mono text-slate-550 text-center py-8">No timeline stages compiled.</p>
                      ) : (
                        timelineStages.map((stage) => {
                          const isExpanded = expandedStages.includes(stage.name);
                          return (
                            <div key={stage.name} className="border border-white/5 rounded-xl bg-black/10 overflow-hidden transition-all duration-300">
                              {/* Stage Header */}
                              <button
                                type="button"
                                onClick={() => toggleStageExpanded(stage.name)}
                                className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.02] text-left transition select-none"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 border border-white/10 text-[10px] font-mono font-bold text-slate-400">
                                    {stage.events.length}
                                  </div>
                                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                                    {stage.name}
                                  </h4>
                                </div>
                                <span className="text-slate-500 font-mono text-[10px] hover:text-white transition">
                                  {isExpanded ? "Collapse ▲" : "Expand ▼"}
                                </span>
                              </button>

                              {/* Stage Content */}
                              {isExpanded && (
                                <div className="p-4 border-t border-white/5 space-y-4 bg-black/15">
                                  {/* AI Summary Card */}
                                  <div className="glass-card rounded-lg p-3 bg-blue-955/20 border border-blue-900/30 text-left relative overflow-hidden">
                                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-900/40 border-l border-b border-blue-800/40 text-[7.5px] font-bold text-blue-450 uppercase tracking-widest font-mono select-none">
                                      AI Narrator
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-slate-300 font-mono">
                                      {stage.summary}
                                    </p>
                                  </div>

                                  {/* Events list */}
                                  {stage.events.length === 0 ? (
                                    <p className="text-[10px] font-mono text-slate-600 text-center py-2">
                                      No events registered for this stage.
                                    </p>
                                  ) : (
                                    <div className="space-y-3 pl-2">
                                      {stage.events.map((evt: any) => (
                                        <div key={evt.id} className="flex gap-3 items-start border-l border-white/10 pl-4 relative ml-1.5 text-left">
                                          <span className="w-5 h-5 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center absolute -left-2.5 top-0.5 shadow-sm">
                                            {getEventIcon(evt.type)}
                                          </span>
                                          <div className="space-y-1.5 leading-normal w-full">
                                            <p className="text-xs text-slate-200">{evt.description}</p>
                                            
                                            {/* Metadata badging */}
                                            {evt.metadata && (
                                              <div className="flex flex-wrap gap-1.5 items-center">
                                                {evt.metadata.filename && (
                                                  <span className="px-1.5 py-0.5 bg-blue-955/20 text-blue-400 border border-blue-900/20 rounded text-[8.5px] font-mono">
                                                    File: {evt.metadata.filename}
                                                  </span>
                                                )}
                                                {evt.metadata.hash && (
                                                  <span className="px-1.5 py-0.5 bg-indigo-950/20 text-indigo-400 border border-indigo-900/20 rounded text-[8.5px] font-mono tracking-wider font-semibold select-all" title={evt.metadata.hash}>
                                                    SHA-256: {evt.metadata.hash.slice(0, 16)}...
                                                  </span>
                                                )}
                                                {evt.metadata.type && (
                                                  <span className="px-1.5 py-0.5 bg-purple-950/20 text-purple-400 border border-purple-900/20 rounded text-[8.5px] font-mono uppercase font-bold">
                                                    Type: {evt.metadata.type}
                                                  </span>
                                                )}
                                                {evt.metadata.confidence !== undefined && (
                                                  <span className="px-1.5 py-0.5 bg-cyan-950/20 text-cyan-400 border border-cyan-900/20 rounded text-[8.5px] font-mono">
                                                    Confidence: {evt.metadata.confidence}%
                                                  </span>
                                                )}
                                                {evt.metadata.tags && (
                                                  <span className="px-1.5 py-0.5 bg-red-950/20 text-red-400 border border-red-900/20 rounded text-[8.5px] font-mono font-bold animate-pulse">
                                                    FEED TAGS: {evt.metadata.tags}
                                                  </span>
                                                )}
                                              </div>
                                            )}

                                            <div className="flex gap-2 text-[9px] font-mono text-slate-500 uppercase">
                                              <span>{new Date(evt.timestamp).toLocaleString()}</span>
                                              <span>• by {evt.user}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
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
                  <div className="glass-card rounded-xl p-5 bg-black/20 flex flex-col relative select-none">
                    
                    {/* Graph Controls HUD Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 w-full border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 text-slate-500" size={13} />
                          <input
                            type="text"
                            placeholder="Search node label..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="cyber-input pl-8 py-1.5 text-xs w-44 font-mono bg-black/40"
                          />
                        </div>
                        <button
                          onClick={resetZoomPan}
                          className="px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded text-[9.5px] font-mono text-slate-400 hover:text-white uppercase tracking-wider flex items-center gap-1 transition"
                          title="Reset view fit screen"
                        >
                          <Maximize size={11} /> Reset
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] font-mono text-slate-400">
                        <span className="uppercase tracking-wider mr-1 text-slate-500 flex items-center gap-1">
                          <Filter size={11} /> Filter:
                        </span>
                        {["ip", "domain", "url", "email", "hash", "evidence", "threat_intel"].map((t) => {
                          const active = typeFilters.includes(t);
                          return (
                            <button
                              key={t}
                              onClick={() => {
                                if (active) {
                                  setTypeFilters(typeFilters.filter((x) => x !== t));
                                } else {
                                  setTypeFilters([...typeFilters, t]);
                                }
                              }}
                              className={`px-2 py-0.5 rounded border transition font-bold uppercase ${
                                active 
                                  ? "bg-blue-950/40 text-blue-400 border-blue-500/40" 
                                  : "bg-slate-900/45 text-slate-400 border-white/5 hover:border-white/10"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interactive Canvas */}
                    <div className="relative w-full h-[450px] bg-[#030712]/60 border border-white/5 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none">
                      {graphLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-blue-400">
                          <Activity className="animate-spin mr-2" size={14} /> Loading case network layout...
                        </div>
                      ) : filteredNodes.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-xs text-slate-550 p-4">
                          <span>No matching nodes found.</span>
                          <span className="text-[10px] text-slate-600 mt-1">Upload forensic artifacts or adjust active filters.</span>
                        </div>
                      ) : (
                        <>
                          <svg
                            className="w-full h-full"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onWheel={handleWheel}
                          >
                            <defs>
                              <filter id="glow-neon" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>
                            </defs>

                            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                              {/* Render Link edges */}
                              {filteredEdges.map((edge, idx) => {
                                const srcNode = filteredNodes.find((n) => n.id === edge.source);
                                const tgtNode = filteredNodes.find((n) => n.id === edge.target);
                                if (!srcNode || !tgtNode) return null;
                                
                                const isEdgeHighlighted = !selectedNodeId || edge.source === selectedNodeId || edge.target === selectedNodeId;
                                
                                return (
                                  <g key={idx}>
                                    <line
                                      x1={srcNode.x}
                                      y1={srcNode.y}
                                      x2={tgtNode.x}
                                      y2={tgtNode.y}
                                      stroke={isEdgeHighlighted ? "rgba(59, 130, 246, 0.45)" : "rgba(30, 41, 59, 0.1)"}
                                      strokeWidth={isEdgeHighlighted ? 1.5 : 0.8}
                                      strokeDasharray={edge.relation.includes("prefix") || edge.relation.includes("hash") ? "4 3" : "none"}
                                      className="transition duration-300"
                                    />
                                    {(selectedNodeId === edge.source || selectedNodeId === edge.target) && (
                                      <text
                                        x={(srcNode.x + tgtNode.x) / 2}
                                        y={(srcNode.y + tgtNode.y) / 2 - 5}
                                        fill="#94a3b8"
                                        className="text-[8px] font-mono font-bold tracking-wide"
                                        textAnchor="middle"
                                      >
                                        {edge.relation.toUpperCase()}
                                      </text>
                                    )}
                                  </g>
                                );
                              })}

                              {/* Render Nodes */}
                              {filteredNodes.map((node) => {
                                const active = isHighlighted(node.id);
                                const color = getNodeColor(node.group);
                                const size = node.group === "case" ? 18 : node.group === "evidence" ? 13 : 10;
                                const isSearching = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());
                                
                                return (
                                  <g
                                    key={node.id}
                                    transform={`translate(${node.x}, ${node.y})`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
                                    }}
                                    onMouseEnter={() => setHoveredNode(node)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                    className="cursor-pointer group"
                                  >
                                    {isSearching && (
                                      <circle
                                        r={size + 6}
                                        fill="none"
                                        stroke="#eab308"
                                        strokeWidth={2}
                                        filter="url(#glow-neon)"
                                        className="animate-pulse"
                                      />
                                    )}

                                    {selectedNodeId === node.id && (
                                      <circle
                                        r={size + 5}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth={1.5}
                                        filter="url(#glow-neon)"
                                        opacity={0.8}
                                      />
                                    )}

                                    <circle
                                      r={size}
                                      fill="#0b0f19"
                                      stroke={color}
                                      strokeWidth={selectedNodeId === node.id ? 2.5 : 1.5}
                                      opacity={active ? 1.0 : 0.25}
                                      className="transition duration-300 group-hover:scale-105"
                                    />

                                    <foreignObject
                                      x={-6}
                                      y={-6}
                                      width={12}
                                      height={12}
                                      opacity={active ? 0.95 : 0.2}
                                      className="pointer-events-none transition duration-300"
                                    >
                                      <div className="flex items-center justify-center w-full h-full">
                                        {getGroupIcon(node.group)}
                                      </div>
                                    </foreignObject>

                                    <text
                                      y={size + 14}
                                      textAnchor="middle"
                                      fill={active ? (isSearching ? "#f59e0b" : "#cbd5e1") : "#475569"}
                                      className="text-[9px] font-mono tracking-tight font-medium pointer-events-none select-none transition duration-300"
                                    >
                                      {node.group === "hash" ? `${node.label.slice(0, 10)}...` : node.label}
                                    </text>
                                  </g>
                                );
                              })}
                            </g>
                          </svg>

                          {/* HUD Stats */}
                          <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none font-mono text-[9px] text-slate-500 uppercase select-none">
                            <div className="bg-black/80 backdrop-blur border border-white/5 rounded px-2.5 py-1 flex items-center gap-3">
                              <span>NODES: {filteredNodes.length}</span>
                              <span>EDGES: {filteredEdges.length}</span>
                            </div>

                            <div className="bg-black/80 backdrop-blur border border-white/5 rounded px-2.5 py-1">
                              SCROLL TO ZOOM • DRAG TO PAN
                            </div>
                          </div>

                          {/* HUD Tooltip Details Panel */}
                          {hoveredNode && (
                            <div
                              className="absolute top-4 right-4 bg-slate-950/90 border border-white/10 backdrop-blur-md rounded-lg p-3 text-left w-56 text-[10px] font-mono text-slate-400 shadow-2xl pointer-events-none space-y-1.5 transition-opacity"
                            >
                              <div className="border-b border-white/5 pb-1 flex items-center justify-between">
                                <span className="font-bold text-white uppercase tracking-wider">{hoveredNode.group}</span>
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getNodeColor(hoveredNode.group) }}
                                />
                              </div>
                              <div className="text-slate-200 break-all">{hoveredNode.label}</div>
                              
                              {hoveredNode.severity && (
                                <div>SEVERITY: <span className="text-red-400 font-bold">{hoveredNode.severity.toUpperCase()}</span></div>
                              )}
                              {hoveredNode.confidence !== undefined && (
                                <div>CONFIDENCE: <span className="text-blue-400 font-bold">{hoveredNode.confidence}%</span></div>
                              )}
                              {hoveredNode.hash && (
                                <div className="break-all text-[8.5px]">HASH: <span className="text-indigo-400 font-semibold">{hoveredNode.hash}</span></div>
                              )}
                              {hoveredNode.tags && (
                                <div>TAGS: <span className="text-amber-500 font-bold">{hoveredNode.tags}</span></div>
                              )}
                              {hoveredNode.cross_case && (
                                <div className="text-amber-500 font-bold">CROSS-CASE RELATION</div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: Collaborative Chat (v2.5) */}
                {activeTab === "comments" && (
                  <div className="space-y-4">
                    
                    {/* Live comments thread list */}
                    <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 text-left flex flex-col gap-2">
                      {comments.length === 0 ? (
                        <div className="text-center py-12 text-slate-550 text-xs font-mono">
                          No collaboration comments posted. Start the conversation!
                        </div>
                      ) : (
                        comments.map((c) => {
                          const isMe = c.username === user?.username;
                          return (
                            <div 
                              key={c.id} 
                              className={`flex flex-col max-w-[85%] rounded-2xl p-3.5 relative overflow-hidden transition-all border ${
                                isMe 
                                  ? "ml-auto bg-[#0f2422]/30 border-[#408A71]/25 text-right" 
                                  : "mr-auto bg-slate-900/60 border-white/5 text-left"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1 justify-between">
                                <span className={`text-[9.5px] font-mono font-bold uppercase ${isMe ? "text-[#B0E4CC]" : "text-blue-400"}`}>
                                  {c.username}
                                </span>
                                <span className="text-[8.5px] font-mono text-slate-500">
                                  {new Date(c.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 leading-relaxed break-words font-mono">
                                {c.content}
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Typing Indicator */}
                    {typingUser && (
                      <div className="text-[10px] font-mono text-blue-400 italic text-left animate-pulse pl-1">
                        🕵️ Investigator {typingUser} is typing...
                      </div>
                    )}

                    {/* Chat Input form */}
                    <form onSubmit={handlePostCollabComment} className="flex gap-3 pt-2">
                      <input
                        type="text"
                        placeholder={isCaseLocked && !myLockActive ? "Case is locked by another investigator..." : "Type collaboration note to other investigators..."}
                        disabled={isCaseLocked && !myLockActive}
                        value={collabMessageText}
                        onChange={handleChatInputChange}
                        className="cyber-input py-3 text-xs bg-black/40 disabled:opacity-40"
                      />
                      <button 
                        type="submit"
                        disabled={isCaseLocked && !myLockActive}
                        className="btn-cyber-primary py-3 px-6 flex items-center justify-center disabled:opacity-40"
                      >
                        <Send size={14} className="mr-1.5" />
                        <span>Send</span>
                      </button>
                    </form>

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

      {/* TRIGGER ORCHESTRATOR MODAL */}
      {isTriggerModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl bg-[#080d16]/90 border border-blue-500/20 max-w-lg w-full p-6 space-y-5 text-left shadow-[0_0_50px_rgba(59,130,246,0.15)] relative">
            <button 
              onClick={() => setIsTriggerModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition font-mono text-sm"
            >
              ✕
            </button>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                🤖 Launch Autonomous Investigation
              </h3>
              <p className="text-[10px] text-slate-400">
                Orchestrate multi-tool scans, extract threat indicators, and build relations automatically.
              </p>
            </div>

            <form onSubmit={handleLaunchOrchestrator} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold font-mono tracking-widest text-slate-455 uppercase">
                  Target String (IP, Domain, URL, Hash, or Free-Text)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 198.51.100.15 or invoice-download.eml"
                  value={orchestratorTarget}
                  onChange={(e) => setOrchestratorTarget(e.target.value)}
                  className="cyber-input py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold font-mono tracking-widest text-slate-455 uppercase">
                    Input Classification (Optional)
                  </label>
                  <select
                    value={orchestratorType}
                    onChange={(e) => setOrchestratorType(e.target.value)}
                    className="cyber-input py-2 text-xs bg-slate-950"
                  >
                    <option value="">Auto-Detect Format</option>
                    <option value="ip">IP Address</option>
                    <option value="domain">Domain Name</option>
                    <option value="url">URL Address</option>
                    <option value="hash">Hash value (SHA-256/MD5)</option>
                    <option value="email">Email file (.eml)</option>
                    <option value="file">Binary / Forensic File</option>
                    <option value="text">Free-Text Description</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold font-mono tracking-widest text-slate-455 uppercase">
                    File Payload (e.g. email, images)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setOrchestratorFile(e.target.files?.[0] || null)}
                    className="cyber-input py-1 text-[10px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTriggerModalOpen(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-[10px] font-bold uppercase text-slate-450 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orchestratorLaunching}
                  className="btn-cyber-primary py-2 px-5 text-[10px]"
                >
                  {orchestratorLaunching ? "Launching Engine..." : "Deploy Orchestrator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardShell>

  );
}
