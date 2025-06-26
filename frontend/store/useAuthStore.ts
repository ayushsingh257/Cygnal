// /frontend/store/useAuthStore.ts
import { create } from "zustand";

interface AuthState {
  user: { username: string } | null;
  setUser: (user: { username: string }) => void;
  logout: () => void;
  loadUserFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => {
    localStorage.setItem("cygnal_user", JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem("cygnal_user");
    set({ user: null });
  },
  loadUserFromStorage: () => {
    const stored = localStorage.getItem("cygnal_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        set({ user: parsed });
      } catch {
        localStorage.removeItem("cygnal_user");
      }
    }
  },
}));
