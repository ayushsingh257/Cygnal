"use client";

import { useState } from "react";
import "../app/auth/auth.css"; // Import the new CSS file

export default function LoginForm() {
  const [form, setForm] = useState({ username: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Logging in:", form);
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
      </form>
    </div>
  );
}