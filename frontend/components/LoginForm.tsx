"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import "../app/auth/auth.css";

export default function LoginForm() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      if (!res.ok || !data.success) {
        setError(data.error || "Login failed.");
        return;
      }

      // ✅ Save role too
      useAuthStore.getState().setUser(
        { username: data.user.username, role: data.user.role },
        data.token
      );
      window.location.href = "/";
    } catch (err) {
      setError("Login failed.");
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title text-2xl font-bold">🔐 Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="text-left text-sm text-gray-400">Username</div>
        <input
          type="text"
          name="username"
          placeholder="Enter your username"
          required
          value={form.username}
          onChange={handleChange}
          className="auth-input"
        />

        <div className="text-left text-sm text-gray-400">Password</div>
        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter your password"
            required
            value={form.password}
            onChange={handleChange}
            className="auth-input"
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>

        <button type="submit" className="auth-button">
          🔓 Login
        </button>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </form>
    </div>
  );
}
