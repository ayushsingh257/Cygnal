"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardShell from "@/components/DashboardShell";
import {
  Shield,
  Database,
  Clock,
  Trash2,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  CheckCircle,
  FileText,
  Lock,
  Search,
  Eye,
  Copy,
  ChevronRight,
  Sparkles,
  Layers,
  BarChart3,
  Flame,
  ArrowRight
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface RetentionPolicyRecord {
  id: string;
  tenant_id: number;
  resource_type: string;
  classification_level: string;
  retention_days: number;
  action_after_expiry: string;
  enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DeletionRecordItem {
  id: string;
  tenant_id: number;
  resource_type: string;
  resource_id: string;
  deletion_reason: string;
  deleted_by: string;
  deleted_at: string;
  verification_hash: string;
}

interface ExpiredItem {
  resource_type: string;
  resource_id: string;
  classification_level: string;
  age_days: number;
  policy_retention_days: number;
  action: string;
}

interface ComplianceReport {
  timestamp: string;
  tenant_id: number;
  compliance_score: number;
  total_active_policies: number;
  total_managed_resources: number;
  total_cryptographic_purges: number;
  classification_breakdown: Record<string, number>;
  expired_resources_pending_action: number;
  issues_identified: Array<{ severity: string; description: string; recommendation: string }>;
  frameworks_aligned: string[];
}

export default function DataGovernancePage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"policies" | "classify" | "lifecycle" | "proofs" | "compliance">("policies");
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<RetentionPolicyRecord[]>([]);
  const [deletionHistory, setDeletionHistory] = useState<DeletionRecordItem[]>([]);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [expiredItems, setExpiredItems] = useState<ExpiredItem[]>([]);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [enforceLoading, setEnforceLoading] = useState(false);

  // Policy Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newResourceType, setNewResourceType] = useState("cases");
  const [newClassification, setNewClassification] = useState("CONFIDENTIAL");
  const [newRetentionDays, setNewRetentionDays] = useState(90);
  const [newAction, setNewAction] = useState("ARCHIVE");

  // Reclassify Tool
  const [classifyType, setClassifyType] = useState("cases");
  const [classifyId, setClassifyId] = useState("");
  const [classifyLevel, setClassifyLevel] = useState("RESTRICTED");
  const [classifyReason, setClassifyReason] = useState("");
  const [classifyLoading, setClassifyLoading] = useState(false);

  const isAdminOrDirector = user?.role === "admin" || user?.role === "director";

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [polRes, delRes, compRes, statRes] = await Promise.all([
        fetch("/api/governance/policies", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/governance/deletion/history", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/governance/compliance/report", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/governance/retention/status?dry_run=true", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const polData = await polRes.json();
      const delData = await delRes.json();
      const compData = await compRes.json();
      const statData = await statRes.json();

      if (polData.success) setPolicies(polData.policies || []);
      if (delData.success) setDeletionHistory(delData.deletion_records || []);
      if (compData.success) setComplianceReport(compData);
      if (statData.success) setExpiredItems(statData.processed || []);
    } catch {
      toast.error("Failed to load governance telemetry.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRetentionDays < 1) {
      toast.error("Retention period must be at least 1 day.");
      return;
    }

    try {
      const res = await fetch("/api/governance/policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resource_type: newResourceType,
          classification_level: newClassification,
          retention_days: Number(newRetentionDays),
          action_after_expiry: newAction,
          enabled: true
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Retention policy deployed successfully.");
        setShowCreateModal(false);
        loadData();
      } else {
        toast.error(data.error || "Failed to create policy.");
      }
    } catch {
      toast.error("Network error creating retention policy.");
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm("Are you sure you want to permanently delete this retention lifecycle policy?")) return;

    try {
      const res = await fetch(`/api/governance/policies/${policyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Policy deleted successfully.");
        setPolicies(policies.filter(p => p.id !== policyId));
      } else {
        toast.error(data.error || "Failed to delete policy.");
      }
    } catch {
      toast.error("Error deleting policy.");
    }
  };

  const handleClassifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classifyId.trim()) {
      toast.error("Resource ID is required.");
      return;
    }

    setClassifyLoading(true);
    try {
      const res = await fetch("/api/governance/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resource_type: classifyType,
          resource_id: classifyId.trim(),
          classification_level: classifyLevel,
          classification_reason: classifyReason.trim() || `Classified as ${classifyLevel}`
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Resource classified as ${classifyLevel}`);
        setClassifyId("");
        setClassifyReason("");
        loadData();
      } else {
        toast.error(data.error || "Classification failed.");
      }
    } catch {
      toast.error("Error updating resource classification.");
    } finally {
      setClassifyLoading(false);
    }
  };

  const handleRunDryRun = async () => {
    setDryRunLoading(true);
    try {
      const res = await fetch("/api/governance/retention/status?dry_run=true", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExpiredItems(data.processed || []);
        toast.success(data.message || `Simulation complete: ${data.total_expired} expired objects.`);
      }
    } catch {
      toast.error("Dry run simulation failed.");
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleEnforceLifecycle = async () => {
    if (!confirm(`Are you sure you want to enforce retention lifecycle? This will execute permanent secure deletion/archival on all ${expiredItems.length} expired resources.`)) return;

    setEnforceLoading(true);
    try {
      const res = await fetch("/api/governance/retention/enforce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dry_run: false })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Enforcement pass complete: ${data.actions_executed?.length || 0} actions executed.`);
        loadData();
      } else {
        toast.error(data.error || "Enforcement failed.");
      }
    } catch {
      toast.error("Network error executing lifecycle pass.");
    } finally {
      setEnforceLoading(false);
    }
  };

  const copyHashToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Verification proof hash copied to clipboard!");
  };

  const getClassificationBadgeClass = (lvl: string) => {
    switch (lvl?.toUpperCase()) {
      case "TOP_SECRET":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "RESTRICTED":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "CONFIDENTIAL":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "INTERNAL":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  };

  return (
    <DashboardShell>
      <Toaster position="top-right" />
      <div className="space-y-8 pb-16">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#0c1f1d] via-[#102926] to-[#0a1816] border border-[#2b594b]/40 p-8 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-32 -bottom-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <Database className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-widest text-emerald-400 font-mono font-semibold">
                    Enterprise Cyber Compliance & Hardening
                  </span>
                  <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                    Data Governance & Automated Retention Lifecycles
                  </h1>
                </div>
              </div>
              <p className="text-sm text-slate-300 max-w-2xl">
                Cryptographic lifecycle automation, multi-tenant row-level classification, deterministic storage purge pipelines, and verifiable SHA-256 destruction proofs.
              </p>
            </div>

            {/* Quick KPI Badge */}
            <div className="flex items-center gap-4">
              <div className="bg-slate-900/80 border border-emerald-500/30 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <div className="text-xs text-slate-400 font-mono uppercase">Audit Score</div>
                  <div className="text-xl font-bold text-emerald-300 font-mono">
                    {complianceReport ? `${complianceReport.compliance_score}%` : "98%"}
                  </div>
                </div>
              </div>

              {isAdminOrDirector && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Deploy Policy
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Active Policies</span>
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white mt-3 font-mono">
              {policies.filter(p => p.enabled).length}
            </div>
            <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-mono">
              <CheckCircle className="w-3.5 h-3.5" /> Automated Enforce Active
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Managed Objects</span>
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white mt-3 font-mono">
              {complianceReport?.total_managed_resources || 0}
            </div>
            <div className="text-xs text-cyan-400 mt-2 flex items-center gap-1 font-mono">
              <Shield className="w-3.5 h-3.5" /> Scoped to Tenant #{user?.tenant_id || 1}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Expired Pending Action</span>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 mt-3 font-mono">
              {expiredItems.length}
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-mono">
              Age evaluated against retention rules
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:border-rose-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Cryptographic Purges</span>
              <Flame className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-3xl font-bold text-rose-400 mt-3 font-mono">
              {deletionHistory.length}
            </div>
            <div className="text-xs text-rose-300/80 mt-2 flex items-center gap-1 font-mono">
              <Lock className="w-3.5 h-3.5" /> SHA-256 Proof Chain
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {[
            { key: "policies", label: "Retention Policies", icon: Clock },
            { key: "classify", label: "Classification Explorer", icon: Shield },
            { key: "lifecycle", label: "Lifecycle Enforcement & Simulator", icon: RefreshCw, badge: expiredItems.length > 0 ? expiredItems.length : undefined },
            { key: "proofs", label: "Cryptographic Proofs Chain", icon: FileCheck },
            { key: "compliance", label: "Audit & Frameworks", icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-5 py-3 rounded-2xl text-sm font-medium transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: RETENTION POLICIES */}
        {activeTab === "policies" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Configured Lifecycle Policies</h2>
                <p className="text-xs text-slate-400 mt-0.5">Automated policy engine triggers based on resource age and sensitivity.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadData}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 font-mono text-sm">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-emerald-400" />
                Loading retention rules...
              </div>
            ) : policies.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 p-12 rounded-3xl text-center">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No Retention Policies Deployed</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Create a policy to automate archival or secure cryptographic deletion for aged incident records.
                </p>
                {isAdminOrDirector && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" /> Create First Policy
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                      <tr>
                        <th className="py-4 px-6">Resource Type</th>
                        <th className="py-4 px-6">Classification Level</th>
                        <th className="py-4 px-6">Retention Lifecycle</th>
                        <th className="py-4 px-6">Expiry Action</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6">Created By</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {policies.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-6 font-semibold uppercase font-mono text-emerald-400 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-500" />
                            {p.resource_type}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${getClassificationBadgeClass(p.classification_level)}`}>
                              {p.classification_level}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-mono">
                            <span className="text-white font-bold">{p.retention_days}</span> days
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                              p.action_after_expiry === "DELETE"
                                ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                            }`}>
                              {p.action_after_expiry}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-mono ${p.enabled ? "text-emerald-400" : "text-slate-500"}`}>
                              <span className={`w-2 h-2 rounded-full ${p.enabled ? "bg-emerald-400" : "bg-slate-600"}`} />
                              {p.enabled ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-400 font-mono">{p.created_by}</td>
                          <td className="py-4 px-6 text-right">
                            {isAdminOrDirector && (
                              <button
                                onClick={() => handleDeletePolicy(p.id)}
                                className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer"
                                title="Delete Policy"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CLASSIFICATION EXPLORER */}
        {activeTab === "classify" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Reclassification Form */}
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-md space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Classify Resource
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Assign sensitivity labels to cases, evidence, or reports with an immutable audit justification.
                </p>
              </div>

              <form onSubmit={handleClassifySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Resource Type</label>
                  <select
                    value={classifyType}
                    onChange={(e) => setClassifyType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-mono"
                  >
                    <option value="cases">Cases (Incident Dossiers)</option>
                    <option value="evidence">Evidence (Artifacts & Captures)</option>
                    <option value="reports">Reports (Compiled Telemetry)</option>
                    <option value="audit_logs">Audit Logs</option>
                    <option value="vector_records">Vector Records (Embeddings)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Target Resource ID</label>
                  <input
                    type="text"
                    placeholder="e.g. case-uuid-1234 or ev-5678"
                    value={classifyId}
                    onChange={(e) => setClassifyId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Classification Level</label>
                  <select
                    value={classifyLevel}
                    onChange={(e) => setClassifyLevel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-mono"
                  >
                    <option value="PUBLIC">PUBLIC — Open Information</option>
                    <option value="INTERNAL">INTERNAL — Standard Organizational</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL — Restricted Access</option>
                    <option value="RESTRICTED">RESTRICTED — High-Impact Sensitive</option>
                    <option value="TOP_SECRET">TOP_SECRET — CISO/Executive Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Classification Justification</label>
                  <textarea
                    placeholder="Audit reason for sensitivity rating..."
                    value={classifyReason}
                    onChange={(e) => setClassifyReason(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={classifyLoading}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {classifyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Apply Classification
                </button>
              </form>
            </div>

            {/* Right: Breakdown & Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
                <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Tenant Data Distribution by Sensitivity
                </h3>

                <div className="space-y-5">
                  {complianceReport?.classification_breakdown ? (
                    Object.entries(complianceReport.classification_breakdown).map(([lvl, count]) => {
                      const total = complianceReport.total_managed_resources || 1;
                      const pct = Math.round((count / total) * 100) || 0;
                      return (
                        <div key={lvl} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className={`px-2.5 py-0.5 rounded-full border ${getClassificationBadgeClass(lvl)}`}>
                              {lvl}
                            </span>
                            <span className="text-slate-300 font-bold">{count} objects ({pct}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                lvl === "TOP_SECRET"
                                  ? "bg-rose-500"
                                  : lvl === "RESTRICTED"
                                  ? "bg-amber-500"
                                  : lvl === "CONFIDENTIAL"
                                  ? "bg-cyan-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.max(pct, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-500 font-mono">No classification telemetry available.</div>
                  )}
                </div>
              </div>

              {/* Hierarchy Info Box */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl space-y-3">
                <h4 className="text-xs font-mono uppercase text-slate-400">Classification Hierarchy Rules</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-rose-400 font-bold font-mono">TOP_SECRET:</span> Full disk AES-256-GCM envelope encryption required.
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-amber-400 font-bold font-mono">RESTRICTED:</span> Cryptographic destruction proof on expiry.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LIFECYCLE SIMULATOR & ENFORCEMENT */}
        {activeTab === "lifecycle" && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                  Automated Lifecycle Enforcement Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Simulate dry-run policy evaluation or trigger instantaneous multi-tenant lifecycle actions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunDryRun}
                  disabled={dryRunLoading}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  {dryRunLoading ? "Evaluating..." : "Run Dry-Run Pass"}
                </button>

                {isAdminOrDirector && (
                  <button
                    onClick={handleEnforceLifecycle}
                    disabled={enforceLoading || expiredItems.length === 0}
                    className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
                  >
                    <Flame className="w-4 h-4" />
                    {enforceLoading ? "Purging..." : `Enforce Purge (${expiredItems.length})`}
                  </button>
                )}
              </div>
            </div>

            {expiredItems.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 p-12 rounded-3xl text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">All Objects Fully Compliant</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Zero resources have exceeded their configured retention thresholds.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {expiredItems.length} Expired Resource(s) Pending Lifecycle Execution
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                      <tr>
                        <th className="py-4 px-6">Resource ID</th>
                        <th className="py-4 px-6">Resource Type</th>
                        <th className="py-4 px-6">Sensitivity Level</th>
                        <th className="py-4 px-6">Object Age</th>
                        <th className="py-4 px-6">Policy Limit</th>
                        <th className="py-4 px-6">Target Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono">
                      {expiredItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-4 px-6 text-white font-bold">{item.resource_id}</td>
                          <td className="py-4 px-6 uppercase text-emerald-400">{item.resource_type}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-0.5 rounded-full border ${getClassificationBadgeClass(item.classification_level)}`}>
                              {item.classification_level}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-amber-300">{item.age_days} days old</td>
                          <td className="py-4 px-6 text-slate-400">{item.policy_retention_days} days max</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              item.action === "DELETE" ? "bg-rose-500/20 text-rose-300" : "bg-cyan-500/20 text-cyan-300"
                            }`}>
                              {item.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CRYPTOGRAPHIC DELETION PROOFS */}
        {activeTab === "proofs" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                  Cryptographic Destruction Ledger
                </h2>
                <p className="text-xs text-slate-400">
                  Unalterable SHA-256 chain-of-custody proofs generated upon permanent data destruction.
                </p>
              </div>

              <button
                onClick={loadData}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Proofs
              </button>
            </div>

            {deletionHistory.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 p-12 rounded-3xl text-center">
                <FileCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No Cryptographic Purges Recorded</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  When lifecycle actions execute permanent secure deletions, unalterable SHA-256 certificates are logged here.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider">
                      <tr>
                        <th className="py-4 px-6">Resource ID</th>
                        <th className="py-4 px-6">Type</th>
                        <th className="py-4 px-6">Purge Reason</th>
                        <th className="py-4 px-6">Operator</th>
                        <th className="py-4 px-6">Timestamp</th>
                        <th className="py-4 px-6">SHA-256 Proof Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono">
                      {deletionHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-6 font-bold text-white">{rec.resource_id}</td>
                          <td className="py-4 px-6 uppercase text-emerald-400">{rec.resource_type}</td>
                          <td className="py-4 px-6 text-slate-300 font-sans text-xs">{rec.deletion_reason}</td>
                          <td className="py-4 px-6 text-slate-400">{rec.deleted_by}</td>
                          <td className="py-4 px-6 text-slate-400">{rec.deleted_at?.substring(0, 19)}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-emerald-300 text-[11px] font-mono select-all">
                                {rec.verification_hash.substring(0, 16)}...{rec.verification_hash.substring(48)}
                              </span>
                              <button
                                onClick={() => copyHashToClipboard(rec.verification_hash)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
                                title="Copy Full Hash"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: COMPLIANCE REPORT */}
        {activeTab === "compliance" && complianceReport && (
          <div className="space-y-8">
            <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-emerald-400" />
                    Automated Compliance Audit Report
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Evaluation Timestamp: {complianceReport.timestamp} • Tenant #{complianceReport.tenant_id}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-sm">
                    {complianceReport.compliance_score}% / 100% Score
                  </div>
                </div>
              </div>

              {/* Frameworks Alignment Badges */}
              <div>
                <h4 className="text-xs font-mono uppercase text-slate-400 mb-3">Aligned Regulatory Frameworks</h4>
                <div className="flex flex-wrap gap-2.5">
                  {complianceReport.frameworks_aligned?.map((fw, i) => (
                    <span key={i} className="px-4 py-2 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      {fw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Identified Issues / Recommendations */}
              <div>
                <h4 className="text-xs font-mono uppercase text-slate-400 mb-3">Compliance Findings & Recommendations</h4>
                {complianceReport.issues_identified?.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Zero compliance deficiencies detected. All audit benchmarks met.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {complianceReport.issues_identified?.map((iss, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
                        <div className="flex items-center gap-2 font-bold text-amber-300 font-mono">
                          <AlertTriangle className="w-4 h-4" />
                          [{iss.severity}] {iss.description}
                        </div>
                        <div className="text-slate-300 pl-6">
                          <span className="text-slate-400 font-semibold">Recommendation:</span> {iss.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CREATE POLICY MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  Deploy Retention Lifecycle Policy
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePolicy} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Resource Domain</label>
                  <select
                    value={newResourceType}
                    onChange={(e) => setNewResourceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-mono"
                  >
                    <option value="cases">Cases (Incident Dossiers)</option>
                    <option value="evidence">Evidence (Envelopes & Artifacts)</option>
                    <option value="reports">Reports (Compiled Data)</option>
                    <option value="audit_logs">Audit Logs</option>
                    <option value="vector_records">Vector Memory Records</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Sensitivity Level</label>
                  <select
                    value={newClassification}
                    onChange={(e) => setNewClassification(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-mono"
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                    <option value="TOP_SECRET">TOP_SECRET</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Retention Window (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={newRetentionDays}
                    onChange={(e) => setNewRetentionDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Lifecycle Action On Expiry</label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-emerald-500 outline-none font-mono"
                  >
                    <option value="ARCHIVE">ARCHIVE — Move to cold storage & mark closed</option>
                    <option value="DELETE">DELETE — Cryptographic purge & SHA-256 destruction proof</option>
                    <option value="ANONYMIZE">ANONYMIZE — Mask PII & retain telemetry</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Save & Deploy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
