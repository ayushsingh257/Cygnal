"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import "../app/auth/auth.css";

export default function RegisterForm() {
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setUser } = useAuthStore();

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isStrongPassword = (password: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!isValidEmail(form.email)) {
      setError("Invalid email format.");
      return;
    }

    if (!isStrongPassword(form.password)) {
      setError("Password must be 8+ characters, with uppercase, lowercase, number, and symbol.");
      return;
    }

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

      if (data.user && data.user.username && data.token) {
        // ✅ Save role as well
        setUser({ username: data.user.username, role: data.user.role }, data.token);
        router.push("/");
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
          <div className="text-left text-sm text-gray-400">Email</div>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            value={form.email}
            onChange={handleChange}
            className="auth-input"
          />

          <div className="text-left text-sm text-gray-400">Username</div>
          <input
            type="text"
            name="username"
            placeholder="Choose a username"
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
              placeholder="Create a password"
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
            🚀 Register
          </button>
          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </form>
      )}
    </div>
  );
}
