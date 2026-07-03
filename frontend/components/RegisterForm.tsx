"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Lock, Mail, User, Eye, EyeOff } from "lucide-react";

export default function RegisterForm() {
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

    if (!isValidEmail(form.email)) {
      setError("Invalid email format (e.g. analyst@cygnal.io).");
      setLoading(false);
      return;
    }

    if (!isStrongPassword(form.password)) {
      setError("Token must be 8+ characters, with uppercase, lowercase, number, and symbol.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Identity registration rejected by host.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      if (data.user && data.user.username && data.token) {
        setUser({ username: data.user.username, role: data.user.role }, data.token);
        router.push("/");
      } else {
        router.push("/auth?mode=login");
      }
    } catch {
      setError("Identity ledger server is offline.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5 font-sans">
      <div className="text-center space-y-1 select-none">
        <h2 className="text-lg font-black font-mono tracking-widest text-white uppercase">
          Enlist Identity
        </h2>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          REGISTER NEW ANALYST NODE
        </p>
      </div>

      {success ? (
        <div className="text-center py-4 bg-emerald-950/20 border border-emerald-500/10 rounded-md">
          <p className="text-xs font-mono text-emerald-450">
            ✅ Node registered. Initializing session gateway...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-mono text-slate-550 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="email"
                name="email"
                placeholder="analyst@cygnal.io"
                required
                value={form.email}
                onChange={handleChange}
                className="cyber-input pl-10"
              />
            </div>
          </div>

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
                placeholder="analyst_code_name"
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
              Security Password
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
            {loading ? "ENLISTING..." : "REGISTER IDENTITY NODE"}
          </button>
        </form>
      )}
    </div>
  );
}
