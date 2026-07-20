"use client";

import { api } from "@/lib/api";

export type AttachmentFileType = "IMAGE" | "VIDEO" | "DOCUMENT";

export type TaskAttachment = {
  id: string;
  taskId?: string | null;
  commentId?: string | null;
  fileName: string;
  originalName: string;
  extension: string;
  mimeType: string;
  fileType: AttachmentFileType;
  size: number;
  url: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  uploader?: {
    id: string;
    fullName: string;
    email: string;
    avatar?: string | null;
  };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Absolute API host (no /api/v1) for /uploads and download redirects. */
export function apiOrigin() {
  try {
    const u = new URL(API_BASE);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "http://localhost:4000";
  }
}

export function attachmentPreviewUrl(attachmentId: string) {
  return `${API_BASE}/attachments/${attachmentId}/preview`;
}

export function attachmentDownloadUrl(attachmentId: string) {
  return `${API_BASE}/attachments/${attachmentId}/download`;
}

export async function fetchAttachments(taskId: string) {
  const { data } = await api.get("/attachments", { params: { taskId } });
  return data.data as { items: TaskAttachment[] };
}

export async function uploadAttachment(taskId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("taskId", taskId);
  const { data } = await api.post("/attachments", form);
  return data.data as TaskAttachment;
}

export async function deleteAttachment(attachmentId: string) {
  await api.delete(`/attachments/${attachmentId}`);
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
