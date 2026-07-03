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
      <div className="space-y-6 text-left font-mono">
        
        {/* Title area */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-4 select-none">
          <Settings className="text-cyan-500 w-5 h-5" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Administration Portal
            </h2>
            <p className="text-[9px] text-zinc-500">MANAGE USER ROLES & SYSTEM INTEGRATIONS</p>
          </div>
        </div>

        {/* User management card */}
        <div className="glass-panel p-5 bg-[#0c0c0e]/80">
          <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 uppercase select-none">
            <Users size={14} className="text-cyan-500" /> User Directory
          </h3>

          {loading ? (
            <p className="text-zinc-550 text-xs py-4 animate-pulse">Loading identity directory...</p>
          ) : users.length === 0 ? (
            <p className="text-zinc-550 text-xs py-4 text-center">No users indexed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500">
                    <th className="p-3 text-left">Username</th>
                    <th className="p-3 text-left">Email Address</th>
                    <th className="p-3 text-left">Assigned Role</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => {
                    const self = isSelf(u.username);
                    return (
                      <tr key={u.id ?? u.username} className="hover:bg-white/[0.01] transition-all">
                        <td className="p-3 font-semibold text-gray-250">{u.username}</td>
                        <td className="p-3 text-zinc-400">{u.email || "N/A"}</td>
                        <td className="p-3">
                          {self ? (
                            <span className="text-cyan-500 font-semibold uppercase">{u.role} (Self)</span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.username, e.target.value)}
                              className="font-mono text-xs px-2 py-1 bg-[#09090b] border border-white/5 rounded text-white focus:border-cyan-500 focus:outline-none"
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
                              className="opacity-20 cursor-not-allowed text-zinc-650 p-1.5"
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
        <div className="glass-panel p-5 bg-[#0c0c0e]/80">
          <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2.5 mb-4 flex items-center gap-1.5 uppercase select-none">
            <Cpu size={14} className="text-cyan-500" /> Threat Intelligence Fusion Bridge
          </h3>
          
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
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
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={handleTestTI}
                className="w-full sm:w-auto h-9 flex items-center justify-center gap-1.5"
                disabled={tiLoading}
              >
                <Play size={12} />
                {tiLoading ? "TESTING..." : "TEST CONNECTOR"}
              </Button>
              <button
                onClick={handleClear}
                className="btn-cyber-secondary px-3 py-2 text-xs font-mono flex items-center gap-1.5"
              >
                <RotateCcw size={12} /> Clear
              </button>
            </div>
          </div>

          {tiResponse && (
            <div className="mt-4 p-4 bg-black/45 border border-white/5 rounded-md">
              <div className="text-[9px] text-cyan-500 font-bold border-b border-white/5 pb-1.5 mb-2 select-none">
                CONNECTOR BRIDGE OUTPUT:
              </div>
              <pre className="text-[10px] text-zinc-400 leading-relaxed overflow-auto max-h-60">
                {JSON.stringify(tiResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}