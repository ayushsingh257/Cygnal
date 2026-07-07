"use client";

import { create } from "zustand";

interface UserProfile {
  username: string;
  role: string;
  department?: string;
  team?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  setUser: (user: UserProfile, token: string | null) => void;
  loadUserFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cygnal_token", token);
      localStorage.setItem("cygnal_user", JSON.stringify(user));
    }
    set({ token, user });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cygnal_token");
      localStorage.removeItem("cygnal_user");
    }
    set({ token: null, user: null });
  },
  setUser: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cygnal_user", JSON.stringify(user));
      if (token) localStorage.setItem("cygnal_token", token);
    }
    set((state) => ({ user, token: token || state.token }));
  },
  loadUserFromStorage: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("cygnal_token");
      const userStr = localStorage.getItem("cygnal_user");
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ token, user });
        } catch {
          // Clear corrupt keys
          localStorage.removeItem("cygnal_token");
          localStorage.removeItem("cygnal_user");
        }
      }
    }
  }
}));
