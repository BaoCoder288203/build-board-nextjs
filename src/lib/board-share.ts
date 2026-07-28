import type { WorkspaceDetail, WorkspaceRole } from "@/lib/workspaces";

export function getBoardShareUrl(boardId: string): string {
  if (typeof window === "undefined") return `/boards/${boardId}`;
  return `${window.location.origin}/boards/${boardId}`;
}

export function canInviteToWorkspace(
  membership?: WorkspaceDetail["myMembership"],
): boolean {
  return Boolean(
    membership?.isOwner || membership?.permissions.includes("member:invite"),
  );
}

export function inviteRolesForWorkspace(roles: WorkspaceRole[]): WorkspaceRole[] {
  return roles.filter((role) => role.name !== "Owner");
}

export function defaultInviteRoleId(roles: WorkspaceRole[]): string {
  const inviteRoles = inviteRolesForWorkspace(roles);
  const developer = inviteRoles.find((role) => role.name === "Developer");
  const fallback = inviteRoles.find((role) => role.name !== "Owner");
  return developer?.id ?? fallback?.id ?? "";
}
