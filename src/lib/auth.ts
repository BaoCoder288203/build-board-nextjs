"use client";

import { api } from "@/lib/api";
import type { AuthUser } from "@/stores/auth-store";

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
