"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";

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

  // For Phase 34: Threat Intelligence Bridge test
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
    if (!user) {
      toast.error("Unauthorized: Admins only.");
      router.push("/");
    } else if (user.role !== "admin") {
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

  return (
    <div className="p-8 bg-gradient-to-br from-black to-gray-900 min-h-screen text-white flex justify-center items-start">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-purple-400 flex items-center">
          🛠️ Admin Panel
        </h1>

        <style jsx>{`
          .tooltip {
            position: relative;
            display: inline-block;
          }
          .tooltip .tooltip-text {
            visibility: hidden;
            width: 200px;
            background-color: #333;
            color: #fff;
            text-align: center;
            border-radius: 6px;
            padding: 5px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0;
            transition: opacity 0.3s;
          }
          .tooltip:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
          }
          .custom-section {
            background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
            border-radius: 12px;
            border: 2px solid #6b46c1;
            padding: 20px;
            margin-bottom: 20px;
            max-width: 800px;
            box-shadow: 0 4px 15px rgba(107, 70, 193, 0.3);
          }
          .custom-button {
            background: linear-gradient(90deg, #6b46c1, #a78bfa);
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            transition: transform 0.2s;
          }
          .custom-button:hover {
            transform: scale(1.05);
          }
          .custom-input {
            background: #333;
            border: 2px solid #6b46c1;
            border-radius: 8px;
            padding: 8px;
            color: white;
            width: 70%;
          }
          .custom-table {
            background: transparent;
            border-collapse: separate;
            border-spacing: 0 10px;
            max-width: 800px;
          }
          .custom-table th,
          .custom-table td {
            padding: 10px;
            background: #2d2d2d;
            border-radius: 8px;
          }
          .custom-table th {
            background: #4a5568;
          }
          .custom-pre {
            background: #222;
            border: 2px solid #6b46c1;
            border-radius: 8px;
          }
        `}</style>

        {/* USER MANAGEMENT */}
        <section className="custom-section">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">Manage Users</h2>

          {loading ? (
            <p className="text-gray-400">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-400">No users found.</p>
          ) : (
            <table className="custom-table text-left w-full">
              <thead>
                <tr>
                  <th className="p-2">Username</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = isSelf(u.username);
                  return (
                    <tr key={u.id ?? u.username}>
                      <td className="p-2">{u.username}</td>
                      <td className="p-2">{u.email || "N/A"}</td>
                      <td className="p-2">
                        {self ? (
                          <div className="tooltip">
                            <span className="italic text-gray-400">{u.role}</span>
                            <span className="tooltip-text">You cannot change your own role</span>
                          </div>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.username, e.target.value)}
                            className="custom-input text-white"
                          >
                            <option value="admin">admin</option>
                            <option value="analyst">analyst</option>
                            <option value="viewer">viewer</option>
                          </select>
                        )}
                      </td>
                      <td className="p-2">
                        {self ? (
                          <div className="tooltip">
                            <button
                              disabled
                              className="custom-button bg-gray-500 cursor-not-allowed"
                            >
                              Delete
                            </button>
                            <span className="tooltip-text">You cannot delete yourself</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(u.username)}
                            className="custom-button"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* PHASE 34: CUSTOM TI BRIDGE TEST */}
        <section className="custom-section">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">🔌 Test Custom Threat Intelligence Bridge</h2>
          <div className="flex items-center gap-4 mb-4">
            <input
              type="text"
              value={tiInput}
              onChange={(e) => setTiInput(e.target.value)}
              placeholder="Enter IP or hash..."
              className="custom-input"
            />
            <button
              onClick={handleTestTI}
              className="custom-button"
              disabled={tiLoading}
            >
              {tiLoading ? "Testing..." : "Submit"}
            </button>
            <button
              onClick={handleClear}
              className="custom-button bg-gray-600"
            >
              Clear
            </button>
          </div>
          {tiResponse && (
            <pre className="custom-pre text-sm p-4 max-h-96 overflow-auto">
              {JSON.stringify(tiResponse, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}