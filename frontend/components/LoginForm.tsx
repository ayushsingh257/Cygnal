"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Lock, User, Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Login credentials unauthorized.");
        setLoading(false);
        return;
      }

      useAuthStore.getState().setUser(
        { username: data.user.username, role: data.user.role },
        data.token
      );
      window.location.href = "/";
    } catch {
      setError("Failed to reach identity provider. Verify network stream.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5 font-sans">
      <div className="text-center space-y-1 select-none">
        <h2 className="text-lg font-black font-mono tracking-widest text-white uppercase">
          Portal Gateway
        </h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          AUTHENTICATE SECURITY SESSION
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-mono text-slate-550 uppercase tracking-wider block">
            Username
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              name="username"
              placeholder="e.g. security_lead"
              required
              value={form.username}
              onChange={handleChange}
              className="cyber-input pl-10"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-mono text-slate-550 uppercase tracking-wider block">
            Credential Token
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="••••••••••••"
              required
              value={form.password}
              onChange={handleChange}
              className="cyber-input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-350 transition-colors"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-500/10 px-3 py-2 rounded">
            ⚠️ {error}
          </p>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="btn-cyber w-full py-3.5 text-xs tracking-widest"
        >
          {loading ? "AUTHENTICATING..." : "VERIFY CREDENTIALS"}
        </button>
      </form>
    </div>
  );
}
