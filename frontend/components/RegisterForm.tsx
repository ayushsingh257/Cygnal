"use client";

import { useState } from "react";
import "../app/auth/auth.css"; // Import the new CSS file

export default function RegisterForm() {
  const [form, setForm] = useState({ email: "", username: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Registering:", form);
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title text-2xl font-bold">📝 Register</h2>
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
      </form>
    </div>
  );
}