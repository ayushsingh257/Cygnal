"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import "../app/navbar.css";

export default function Navbar() {
  const { user, logout, loadUserFromStorage } = useAuthStore();

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  return (
    <nav className="navbar glass-panel rounded-none border-t-0 border-x-0 bg-black/40 px-8 py-4">
      <div className="navbar-brand text-2xl font-bold bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] bg-clip-text text-transparent">
        Cygnal
      </div>

      <div className="navbar-links flex items-center gap-6">
        {!user ? (
          <>
            <Link href="/auth?mode=login" className="navbar-link font-medium">Login</Link>
            <Link href="/auth?mode=register" className="navbar-link font-medium">Register</Link>
          </>
        ) : (
          <>
            {/* Case Workspace for Analysts & Admins */}
            {(user.role === "admin" || user.role === "analyst") && (
              <Link href="/cases" className="navbar-link font-medium text-gray-300 hover:text-white transition">
                💼 Case Files
              </Link>
            )}

            {/* Admin-only links */}
            {user.role === "admin" && (
              <>
                <Link href="/admin/audit" className="navbar-link font-medium text-gray-300 hover:text-white transition">
                  Admin Audit
                </Link>
                <Link href="/dashboard" className="navbar-link font-medium text-gray-300 hover:text-white transition">
                  Live SOC
                </Link>
                <Link href="/admin" className="navbar-link font-medium text-gray-300 hover:text-white transition">
                  Admin Panel
                </Link>
              </>
            )}

            {/* General Home Link */}
            <Link href="/" className="navbar-link font-medium text-gray-300 hover:text-white transition">
              🔍 Scanners
            </Link>

            <span className="navbar-user font-mono text-sm bg-zinc-800 px-3 py-1 rounded-md border border-zinc-700">
              👤 {user.username} ({user.role})
            </span>
            <button onClick={logout} className="btn-cyber-danger text-xs px-3 py-1.5 rounded font-medium">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
