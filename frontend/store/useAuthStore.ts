import { create } from "zustand";

interface User {
  id?: number; // ✅ Optional to prevent issues if backend doesn't send it
  username: string;
  role: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
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
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser.username && parsedUser.role) {
        // 🛠 Ensure ID is numeric
        parsedUser.id = parsedUser.id ? Number(parsedUser.id) : undefined;
        set({ user: parsedUser, token: storedToken });
      } else {
        throw new Error("Invalid user data");
      }
    } catch {
      localStorage.removeItem("cygnal_user");
      localStorage.removeItem("cygnal_token");
    }
  }
},
}));
