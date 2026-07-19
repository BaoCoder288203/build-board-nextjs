"use client";

import { api } from "@/lib/api";

export type CommentAuthor = {
  workspaceMemberId: string;
  role?: { id: string; name: string };
  user: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    avatar?: string | null;
  };
};

export type TaskComment = {
  id: string;
  taskId: string;
  parentCommentId?: string | null;
  content: string;
  isEdited: boolean;
  editedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  author: CommentAuthor;
  mentions: Array<{
    workspaceMemberId: string;
    user: CommentAuthor["user"];
  }>;
};

export async function fetchComments(taskId: string) {
  const { data } = await api.get("/comments", { params: { taskId } });
  return data.data as {
    items: TaskComment[];
    total: number;
    page: number;
    limit: number;
  };
}

export async function createComment(input: {
  taskId: string;
  content: string;
  mentions?: string[];
}) {
  const { data } = await api.post("/comments", input);
  return data.data as TaskComment;
}

export async function updateComment(
  commentId: string,
  input: { content: string; mentions?: string[] },
) {
  const { data } = await api.patch(`/comments/${commentId}`, input);
  return data.data as TaskComment;
}

export async function deleteComment(commentId: string) {
  await api.delete(`/comments/${commentId}`);
}

export async function replyToComment(
  commentId: string,
  input: { content: string; mentions?: string[] },
) {
  const { data } = await api.post(`/comments/${commentId}/replies`, input);
  return data.data as TaskComment;
}

export async function fetchReplies(commentId: string) {
  const { data } = await api.get(`/comments/${commentId}/replies`);
  return data.data as { items: TaskComment[] };
}
