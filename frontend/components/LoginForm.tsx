"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../app/auth/auth.css";

export default function LoginForm() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Login failed.");
        return;
      }

      router.push("/"); // ✅ Redirect to homepage
    } catch (err) {
      setError("Network error or server is offline.");
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title text-2xl font-bold">🔐 Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="text"
          name="username"
          placeholder="Enter your username"
          required
          value={form.username}
          onChange={handleChange}
          className="auth-input"
        />
        <input
          type="password"
          name="password"
          placeholder="Enter your password"
          required
          value={form.password}
          onChange={handleChange}
          className="auth-input"
        />
        <button type="submit" className="auth-button">
          🔓 Login
        </button>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </form>
    </div>
  );
}
