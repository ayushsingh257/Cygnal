"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import "../app/auth/auth.css";

export default function RegisterForm() {
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || `Server error: ${res.status}`);
        return;
      }

      setSuccess(true);
      if (data.user && data.user.username) {
        setUser({ username: data.user.username });
        router.push("/"); // redirect to homepage
      } else {
        router.push("/auth?mode=login");
      }
    } catch (err) {
      console.error("Register error:", err);
      setError("Server unreachable or failed.");
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title text-2xl font-bold">📝 Register</h2>
      {success ? (
        <p className="text-green-400 font-semibold mt-4">
          ✅ Registered! You can now log in.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            value={form.email}
            onChange={handleChange}
            className="auth-input"
          />
          <input
            type="text"
            name="username"
            placeholder="Choose a username"
            required
            value={form.username}
            onChange={handleChange}
            className="auth-input"
          />
          <input
            type="password"
            name="password"
            placeholder="Create a password"
            required
            value={form.password}
            onChange={handleChange}
            className="auth-input"
          />
          <button type="submit" className="auth-button">
            🚀 Register
          </button>
          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </form>
      )}
    </div>
  );
}
