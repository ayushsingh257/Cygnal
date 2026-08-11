"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Shield,
  Key,
  Globe,
  Users,
  Plus,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Server,
  Lock,
  Layers
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

interface IdPRecord {
  id: string;
  provider_type: string;
  provider_name: string;
  metadata_url: string;
  client_id: string;
  allowed_domains: string;
  enabled: boolean;
  created_at: string;
}

interface GroupMappingRecord {
  id: string;
  provider_group: string;
  cygnal_role: string;
  provider: string;
  created_at: string;
}

export default function EnterpriseSSOAdminPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [providers, setProviders] = useState<IdPRecord[]>([]);
  const [mappings, setMappings] = useState<GroupMappingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // New Provider Form State
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newType, setNewType] = useState("entra_id");
  const [newName, setNewName] = useState("");
  const [newMetaUrl, setNewMetaUrl] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [newAllowedDomains, setNewAllowedDomains] = useState("");

  // New Mapping Form State
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [newRole, setNewRole] = useState("analyst");
  const [newProviderScope, setNewProviderScope] = useState("all");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        fetch("/api/auth/sso/admin/providers", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("/api/auth/sso/admin/mappings", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const pData = await pRes.json();
      const mData = await mRes.json();

      if (pData.success) setProviders(pData.providers || []);
      if (mData.success) setMappings(mData.mappings || []);
    } catch {
      toast.error("Failed to load SSO configuration data.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Provider display name required.");
      return;
    }

    try {
      const res = await fetch("/api/auth/sso/admin/providers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider_type: newType,
          provider_name: newName,
          metadata_url: newMetaUrl,
          client_id: newClientId,
          allowed_domains: newAllowedDomains
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Identity Provider configured!");
        setShowAddProvider(false);
        setNewName("");
        setNewMetaUrl("");
        setNewClientId("");
        setNewAllowedDomains("");
        fetchData();
      } else {
        toast.error(data.error || "Failed to configure provider.");
      }
    } catch {
      toast.error("Network error saving provider.");
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.trim()) {
      toast.error("Directory Group name required.");
      return;
    }

    try {
      const res = await fetch("/api/auth/sso/admin/mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          provider_group: newGroup,
          cygnal_role: newRole,
          provider: newProviderScope
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Directory group mapping created!");
        setShowAddMapping(false);
        setNewGroup("");
        fetchData();
      } else {
        toast.error(data.error || "Failed to create mapping.");
      }
    } catch {
      toast.error("Network error saving mapping.");
    }
  };

  return (
    <div className="min-h-screen bg-[#060D0C] text-slate-200 font-sans">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="border-b border-[#408A71]/20 bg-[#091413]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 rounded-lg bg-slate-900 border border-[#408A71]/20 text-[#B0E4CC] hover:bg-[#408A71]/20 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-[#B0E4CC]" />
              <h1 className="text-lg font-bold text-white font-mono tracking-wider uppercase">
                Enterprise Identity Federation (SSO)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#a3c2b4] bg-[#0f2422] border border-[#408A71]/30 px-3 py-1.5 rounded-lg">
              Tenant ID: {user?.tenant_id || 1}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Top Info Banner */}
        <div className="bg-gradient-to-r from-[#091917] to-[#0d2623] border border-[#408A71]/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(64,138,113,0.1)]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#B0E4CC] font-mono text-sm font-semibold mb-1">
                <Globe className="h-4 w-4" />
                <span>OIDC & SAML 2.0 Identity Federation</span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Connect corporate Identity Providers (Microsoft Entra ID, Google Workspace, Okta, Ping Identity) with dynamic metadata discovery, JWKS signature validation, and real-time directory group-to-role mapping.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[11px] font-mono bg-[#408A71]/20 text-[#B0E4CC] border border-[#408A71]/40 rounded-full flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Federation Active
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Configured Identity Providers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-sm text-white font-bold uppercase">
              <Server className="h-4 w-4 text-[#B0E4CC]" />
              <span>Configured Identity Providers</span>
            </div>
            <button
              onClick={() => setShowAddProvider(!showAddProvider)}
              className="bg-[#408A71] hover:bg-[#4ea88a] text-white text-xs font-mono py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(64,138,113,0.3)] transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Identity Provider</span>
            </button>
          </div>

          {showAddProvider && (
            <form onSubmit={handleCreateProvider} className="bg-[#091413] border border-[#408A71]/40 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase text-[#B0E4CC] font-bold">Register Identity Provider</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Provider Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-[#060D0C] border border-[#408A71]/30 rounded-lg p-2 text-xs text-white font-mono focus:outline-none"
                  >
                    <option value="entra_id">Microsoft Entra ID (Azure AD)</option>
                    <option value="google">Google Workspace</option>
                    <option value="okta">Okta SSO (OIDC/SAML)</option>
                    <option value="saml">SAML 2.0 Enterprise</option>
                    <option value="oidc">Generic OIDC</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="Corporate Azure AD"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#060D0C] border border-[#408A71]/30 rounded-lg p-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Client ID / App ID</label>
                  <input
                    type="text"
                    placeholder="00000000-0000-0000-0000-000000000000"
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-[#060D0C] border border-[#408A71]/30 rounded-lg p-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Discovery / Metadata URL</label>
                  <input
                    type="text"
                    placeholder="https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration"
                    value={newMetaUrl}
                    onChange={(e) => setNewMetaUrl(e.target.value)}
                    className="w-full bg-[#060D0C] border border-[#408A71]/30 rounded-lg p-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Allowed Email Domains (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="company.com, enterprise.org"
                    value={newAllowedDomains}
                    onChange={(e) => setNewAllowedDomains(e.target.value)}
                    className="w-full bg-[#060D0C] border border-[#408A71]/30 rounded-lg p-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProvider(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#408A71] hover:bg-[#4ea88a] text-white px-5 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer"
                >
                  Save Provider
                </button>
              </div>
            </form>
          )}

          {/* Providers Table */}
          <div className="bg-[#091413] border border-[#408A71]/20 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0a1815] border-b border-[#408A71]/20 text-[#a3c2b4]">
                <tr>
                  <th className="p-3">Provider</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Client ID</th>
                  <th className="p-3">Allowed Domains</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#408A71]/10">
                {/* Built-in Providers */}
                <tr className="hover:bg-[#408A71]/5">
                  <td className="p-3 text-white font-semibold flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-[#B0E4CC]" /> Microsoft Entra ID
                  </td>
                  <td className="p-3 text-slate-400">OIDC / Azure AD</td>
                  <td className="p-3 text-slate-400">System Managed</td>
                  <td className="p-3 text-slate-400">All Enterprise</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">Enabled</span>
                  </td>
                </tr>
                <tr className="hover:bg-[#408A71]/5">
                  <td className="p-3 text-white font-semibold flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-[#B0E4CC]" /> Google Workspace
                  </td>
                  <td className="p-3 text-slate-400">OIDC OAuth2</td>
                  <td className="p-3 text-slate-400">System Managed</td>
                  <td className="p-3 text-slate-400">Corporate Domains</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">Enabled</span>
                  </td>
                </tr>
                <tr className="hover:bg-[#408A71]/5">
                  <td className="p-3 text-white font-semibold flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-[#B0E4CC]" /> Okta SSO
                  </td>
                  <td className="p-3 text-slate-400">OIDC / SAML</td>
                  <td className="p-3 text-slate-400">System Managed</td>
                  <td className="p-3 text-slate-400">All Enterprise</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">Enabled</span>
                  </td>
                </tr>

                {/* Custom DB Configured Providers */}
                {providers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#408A71]/5">
                    <td className="p-3 text-white font-semibold">{p.provider_name}</td>
                    <td className="p-3 text-slate-400 uppercase">{p.provider_type}</td>
                    <td className="p-3 text-slate-400">{p.client_id || "N/A"}</td>
                    <td className="p-3 text-slate-400">{p.allowed_domains || "All"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Directory Group-to-Role Mappings */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-sm text-white font-bold uppercase">
              <Users className="h-4 w-4 text-[#B0E4CC]" />
              <span>Directory Group to Cygnal RBAC Mappings</span>
            </div>
            <button
              onClick={() => setShowAddMapping(!showAddMapping)}
              className="bg-[#408A71] hover:bg-[#4ea88a] text-white text-xs font-mono py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(64,138,113,0.3)] transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Group Mapping</span>
            </button>
          </div>

          {showAddMapping && (
            <form onSubmit={handleCreateMapping} className="bg-[#091413] border border-[#408A71]/40 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-mono uppercase text-[#B0E4CC] font-bold">New Directory Group Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">IdP Group Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Security-Admins or DFIR-Team"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full bg-[#060D0C] border border-[#408A71]/30 rounded-lg p-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Cygnal RBAC Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-[#060D0C] border border-[#408A71]/30 rounded-lg p-2 text-xs text-white font-mono focus:outline-none"
                  >
                    <option value="admin">admin (Full Control)</option>
                    <option value="director">director (Executive / Read-All)</option>
                    <option value="soc_manager">soc_manager (SOC Ops Management)</option>
                    <option value="red_lead">red_lead (Offensive Security Lead)</option>
                    <option value="blue_lead">blue_lead (Defensive Security Lead)</option>
                    <option value="analyst">analyst (Investigator)</option>
                    <option value="intern">intern (Triage / Limited)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Provider Scope</label>
                  <select
                    value={newProviderScope}
                    onChange={(e) => setNewProviderScope(e.target.value)}
                    className="w-full bg-[#060D0C] border border-[#408A71]/30 rounded-lg p-2 text-xs text-white font-mono focus:outline-none"
                  >
                    <option value="all">All Providers</option>
                    <option value="entra_id">Microsoft Entra ID</option>
                    <option value="google">Google Workspace</option>
                    <option value="okta">Okta SSO</option>
                    <option value="saml">SAML 2.0</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMapping(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#408A71] hover:bg-[#4ea88a] text-white px-5 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          )}

          {/* Group Mappings Table */}
          <div className="bg-[#091413] border border-[#408A71]/20 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0a1815] border-b border-[#408A71]/20 text-[#a3c2b4]">
                <tr>
                  <th className="p-3">IdP Group Name</th>
                  <th className="p-3">Mapped Cygnal Role</th>
                  <th className="p-3">Provider Scope</th>
                  <th className="p-3">Rule Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#408A71]/10">
                {/* Default Fallback Mappings */}
                <tr className="hover:bg-[#408A71]/5">
                  <td className="p-3 text-white font-semibold">Security-Admins / Global-Admins</td>
                  <td className="p-3 text-emerald-400 font-bold">admin</td>
                  <td className="p-3 text-slate-400">All</td>
                  <td className="p-3 text-slate-500">System Default</td>
                </tr>
                <tr className="hover:bg-[#408A71]/5">
                  <td className="p-3 text-white font-semibold">SOC-Managers</td>
                  <td className="p-3 text-cyan-400 font-bold">soc_manager</td>
                  <td className="p-3 text-slate-400">All</td>
                  <td className="p-3 text-slate-500">System Default</td>
                </tr>
                <tr className="hover:bg-[#408A71]/5">
                  <td className="p-3 text-white font-semibold">SOC-Analysts / DFIR / Incident-Responders</td>
                  <td className="p-3 text-blue-400 font-bold">analyst</td>
                  <td className="p-3 text-slate-400">All</td>
                  <td className="p-3 text-slate-500">System Default</td>
                </tr>

                {/* Custom DB Mappings */}
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-[#408A71]/5">
                    <td className="p-3 text-white font-semibold">{m.provider_group}</td>
                    <td className="p-3 text-emerald-400 font-bold">{m.cygnal_role}</td>
                    <td className="p-3 text-slate-400 uppercase">{m.provider}</td>
                    <td className="p-3 text-emerald-500">Tenant Custom</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
