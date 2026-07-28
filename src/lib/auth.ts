"use client";

import { api } from "@/lib/api";
import type { AuthUser } from "@/stores/auth-store";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type AuthProviders = {
  google: boolean;
};

export async function getAuthProviders() {
  const { data } = await api.get("/auth/providers");
  return data.data as AuthProviders;
}

export function getGoogleLoginUrl() {
  return `${API_URL}/auth/google`;
}

export function getGoogleLinkUrl() {
  return `${API_URL}/auth/google/link`;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const { data } = await api.patch("/auth/change-password", input);
  return data as { message?: string };
}

export async function updateProfile(input: {
  fullName?: string;
  username?: string;
  avatar?: string | null;
}) {
  const { data } = await api.patch("/auth/me", input);
  return data.data as AuthUser;
}

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/auth/me/avatar", form);
  return data.data as AuthUser;
}
