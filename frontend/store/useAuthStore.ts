import { create } from "zustand";

interface AuthState {
  user: { username: string } | null;
  token: string | null;
  setUser: (user: { username: string }, token: string) => void;
  logout: () => void;
  loadUserFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  setUser: (user, token) => {
    localStorage.setItem("cygnal_user", JSON.stringify(user));
    localStorage.setItem("cygnal_token", token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem("cygnal_user");
    localStorage.removeItem("cygnal_token");
    set({ user: null, token: null });
  },

  loadUserFromStorage: () => {
    const storedUser = localStorage.getItem("cygnal_user");
    const storedToken = localStorage.getItem("cygnal_token");
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        set({ user: parsedUser, token: storedToken });
      } catch {
        localStorage.removeItem("cygnal_user");
        localStorage.removeItem("cygnal_token");
      }
    }
  },
}));
