"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import "../app/navbar.css"; // or move to styles if needed

export default function Navbar() {
  const { user, logout, loadUserFromStorage } = useAuthStore();

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-brand">Cygnal</div>

      <div className="navbar-links">
        {!user ? (
          <>
            <Link href="/auth?mode=login" className="navbar-link">Login</Link>
            <Link href="/auth?mode=register" className="navbar-link">Register</Link>
          </>
        ) : (
          <>
            <span className="navbar-user">👤 {user.username}</span>
            <button onClick={logout} className="navbar-logout">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
