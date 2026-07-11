import { create } from "zustand";
import { apiClient, tokenStorage } from "../api/client";

export const useAuthStore = create((set) => ({
  isAuthenticated: Boolean(tokenStorage.getAccess()),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      // Backend: app_users/urls.py -> token_obtain_pair (SimpleJWT)
      const { data } = await apiClient.post("/api/token/", { username, password });
      tokenStorage.set(data.access, data.refresh);
      set({ isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      const message =
        err.response?.status === 401
          ? "Login yoki parol noto'g'ri"
          : "Tizimga kirishda xatolik yuz berdi";
      set({ isLoading: false, error: message });
      return false;
    }
  },

  logout: () => {
    tokenStorage.clear();
    set({ isAuthenticated: false });
  },
}));
