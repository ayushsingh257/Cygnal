"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardShell from "./DashboardShell";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { 
  Users, 
  Trash2, 
  Settings, 
  Cpu, 
  Play, 
  RotateCcw 
} from "lucide-react";

type User = {
  id?: number;
  username: string;
  email?: string;
  role: string;
};

export default function AdminPanel() {
  const router = useRouter();
  const { user, loadUserFromStorage } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  // For Custom Threat Intelligence Bridge
  const [tiInput, setTiInput] = useState("");
  const [tiResponse, setTiResponse] = useState<any>(null);
  const [tiLoading, setTiLoading] = useState(false);

  useEffect(() => {
    loadUserFromStorage();
    const delay = setTimeout(() => setAuthReady(true), 100);
    return () => clearTimeout(delay);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!user || user.role !== "admin") {
      toast.error("Unauthorized: Admins only.");
      router.push("/");
    } else {
      fetchUsers();
    }
  }, [authReady, user]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cygnal_token")}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        toast.error("Failed to load users.");
      }
    } catch {
      toast.error("Error fetching users.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (username: string, newRole: string) => {
    if (user?.username === username) {
      toast.error("You cannot change your own role.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${username}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("cygnal_token")}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Role updated.");
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to update role.");
      }
    } catch {
      toast.error("Error updating role.");
    }
  };

  const handleDelete = async (username: string) => {
    if (user?.username === username) {
      toast.error("You cannot delete yourself.");
      return;
    }

    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/admin/users/${username}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("cygnal_token")}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("User deleted.");
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to delete user.");
      }
    } catch {
      toast.error("Error deleting user.");
    }
  };

  const handleTestTI = async () => {
    if (!tiInput.trim()) {
      toast.error("Please enter an IP or hash.");
      return;
    }

    setTiLoading(true);
    setTiResponse(null);

    try {
      const res = await fetch("/api/intel-bridge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("cygnal_token")}`,
        },
        body: JSON.stringify({ indicator: tiInput.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setTiResponse(data.result);
        toast.success("Bridge response received.");
      } else {
        toast.error(data.error || "Error from bridge.");
      }
    } catch {
      toast.error("Failed to contact custom TI bridge.");
    } finally {
      setTiLoading(false);
    }
  };

  const handleClear = () => {
    setTiInput("");
    setTiResponse(null);
  };

  const isSelf = (username: string) => user?.username === username;

  if (!user || user.role !== "admin") return null;

  return (
    <DashboardShell>
      <div className="space-y-6 text-left font-sans">
        
        {/* Header Title */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 select-none">
          <Settings className="text-cyan-400 w-5 h-5" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Administration Portal
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Manage user roles & system integrations</p>
          </div>
        </div>

        {/* User Management Card */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60">
          <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 font-mono uppercase tracking-wider select-none">
            <Users size={14} className="text-cyan-400" /> User Directory
          </h3>

          {loading ? (
            <p className="text-slate-550 text-xs py-4 animate-pulse font-mono">Loading identity directory...</p>
          ) : users.length === 0 ? (
            <p className="text-slate-550 text-xs py-4 text-center font-mono">No users indexed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 font-mono">
                    <th className="p-3 text-left">Username</th>
                    <th className="p-3 text-left">Email Address</th>
                    <th className="p-3 text-left">Assigned Role</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px] font-sans">
                  {users.map((u) => {
                    const self = isSelf(u.username);
                    return (
                      <tr key={u.id ?? u.username} className="hover:bg-white/[0.01] transition-all">
                        <td className="p-3 font-semibold text-slate-200">{u.username}</td>
                        <td className="p-3 text-slate-400">{u.email || "N/A"}</td>
                        <td className="p-3">
                          {self ? (
                            <span className="text-cyan-400 font-bold uppercase font-mono text-[10px]">{u.role} (Self)</span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.username, e.target.value)}
                              className="font-mono text-[10.5px] px-2 py-1 bg-[#060814] border border-white/5 rounded text-white focus:border-cyan-500 focus:outline-none"
                            >
                              <option value="admin">admin</option>
                              <option value="analyst">analyst</option>
                              <option value="viewer">viewer</option>
                            </select>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {self ? (
                            <button
                              disabled
                              className="opacity-20 cursor-not-allowed text-slate-600 p-1.5"
                              title="You cannot delete yourself"
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(u.username)}
                              className="text-red-500 hover:text-red-400 hover:bg-red-950/10 p-1.5 rounded transition"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CUSTOM THREAT INTELLIGENCE BRIDGE */}
        <div className="glass-card rounded-xl p-5 bg-[#0d1117]/60">
          <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 font-mono uppercase tracking-wider select-none">
            <Cpu size={14} className="text-cyan-400" /> Threat Intelligence Fusion Bridge
          </h3>
          
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Test the integrated backend connector to run security correlation queries against threat databases using custom indicators.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Input
              type="text"
              value={tiInput}
              onChange={(e) => setTiInput(e.target.value)}
              placeholder="e.g. Malicious IP, SHA-256 file signature..."
              className="w-full sm:flex-1"
            />
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button
                onClick={handleTestTI}
                disabled={tiLoading}
                className="w-full sm:w-auto h-9"
              >
                <Play size={11} className="mr-1.5" />
                {tiLoading ? "Testing..." : "Test Connector"}
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                className="w-full sm:w-auto h-9"
              >
                <RotateCcw size={11} className="mr-1.5" /> Clear
              </Button>
            </div>
          </div>

          {tiResponse && (
            <div className="mt-4 p-4 bg-[#060814]/80 border border-white/5 rounded-lg">
              <div className="text-[9px] text-cyan-400 font-bold border-b border-white/5 pb-1.5 mb-2 font-mono select-none">
                CONNECTOR BRIDGE OUTPUT:
              </div>
              <pre className="text-[10px] text-slate-400 leading-relaxed overflow-auto max-h-60 font-mono">
                {JSON.stringify(tiResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}