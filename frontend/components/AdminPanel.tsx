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

  const isSelf = (username: string) => user?.username === username;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">🛠️ Admin Panel</h1>

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
      `}</style>

      <section className="bg-gray-100 dark:bg-zinc-900 p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Manage Users</h2>

        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table className="min-w-full text-left border border-gray-300 dark:border-zinc-700">
            <thead className="bg-gray-200 dark:bg-zinc-800">
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
                  <tr key={u.id ?? u.username} className="border-t dark:border-zinc-700">
                    <td className="p-2">{u.username}</td>
                    <td className="p-2">{u.email || "N/A"}</td>
                    <td className="p-2">
                      {self ? (
                        <div className="tooltip">
                          <span className="italic text-gray-500 dark:text-gray-400">
                            {u.role}
                          </span>
                          <span className="tooltip-text">
                            You cannot change your own role
                          </span>
                        </div>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.username, e.target.value)}
                          className="border rounded px-2 py-1 bg-white dark:bg-zinc-800 dark:text-white"
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
                            className="bg-red-300 text-white px-3 py-1 rounded cursor-not-allowed"
                          >
                            Delete
                          </button>
                          <span className="tooltip-text">
                            You cannot delete yourself
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(u.username)}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
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
    </div>
  );
}