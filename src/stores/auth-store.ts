"use client";

import { create } from "zustand";
import { api, getErrorMessage, setAccessToken } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  isActive: boolean;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ message: string; debugToken?: string }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAccessToken(data.data.accessToken);
      set({ user: data.data.user, loading: false });
      toastSuccess("Welcome back", data.data.user?.fullName);
    } catch (error) {
      set({ loading: false });
      toastError(getErrorMessage(error));
      throw error;
    }
  },

  register: async (fullName, email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/register", {
        fullName,
        email,
        password,
      });
      set({ loading: false });
      const payload = data.data as { message: string; debugToken?: string };
      toastSuccess("Account created", payload.message);
      return payload;
    } catch (error) {
      set({ loading: false });
      toastError(getErrorMessage(error));
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
      toastSuccess("Signed out");
    } catch {
      // still clear local session
    } finally {
      setAccessToken(null);
      set({ user: null });
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.data, initialized: true });
    } catch {
      setAccessToken(null);
      set({ user: null, initialized: true });
    }
  },

  setUser: (user) => set({ user }),
}));
