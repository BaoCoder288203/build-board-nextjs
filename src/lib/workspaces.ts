"use client";

import { api } from "@/lib/api";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  membersCount?: number;
  projectsCount?: number;
  myRole?: string | null;
  createdAt: string;
};

export type WorkspaceDetail = WorkspaceSummary & {
  owner?: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    avatar: string | null;
  };
  myMembership?: {
    memberId: string;
    roleName: string;
    permissions: string[];
    isOwner: boolean;
  } | null;
};

export type WorkspaceMember = {
  id: string;
  joinedAt: string;
  role: { id: string; name: string };
  user: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    avatar: string | null;
  };
};

export type WorkspaceRole = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  membersCount: number;
  permissions: string[];
};

export async function fetchMyWorkspaces() {
  const { data } = await api.get("/workspaces");
  return data.data as {
    items: WorkspaceSummary[];
    page: number;
    limit: number;
    total: number;
  };
}

export async function createWorkspace(input: {
  name: string;
  slug: string;
  description?: string;
}) {
  const { data } = await api.post("/workspaces", input);
  return data.data as WorkspaceSummary & { workspaceId: string };
}

export async function fetchWorkspace(workspaceId: string) {
  const { data } = await api.get(`/workspaces/${workspaceId}`);
  return data.data as WorkspaceDetail;
}

export async function fetchMembers(workspaceId: string) {
  const { data } = await api.get(`/workspaces/${workspaceId}/members`);
  return data.data as { items: WorkspaceMember[]; total: number };
}

export async function fetchRoles(workspaceId: string) {
  const { data } = await api.get(`/workspaces/${workspaceId}/roles`);
  return data.data as WorkspaceRole[];
}

export async function inviteMember(
  workspaceId: string,
  input: { email: string; roleId: string },
) {
  const { data } = await api.post(`/workspaces/${workspaceId}/invitations`, input);
  return data.data as {
    message: string;
    invitationId: string;
    debugToken?: string;
  };
}

export async function changeMemberRole(
  workspaceId: string,
  memberId: string,
  roleId: string,
) {
  const { data } = await api.patch(
    `/workspaces/${workspaceId}/members/${memberId}`,
    { roleId },
  );
  return data.data;
}

export async function removeMember(workspaceId: string, memberId: string) {
  const { data } = await api.delete(
    `/workspaces/${workspaceId}/members/${memberId}`,
  );
  return data;
}

export async function leaveWorkspace(workspaceId: string) {
  const { data } = await api.post(`/workspaces/${workspaceId}/leave`);
  return data;
}

export async function acceptInvitation(token: string) {
  const { data } = await api.post("/workspaces/invitations/accept", { token });
  return data.data as { workspaceId: string; message: string };
}

export async function rejectInvitation(token: string) {
  const { data } = await api.post("/workspaces/invitations/reject", { token });
  return data;
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}
