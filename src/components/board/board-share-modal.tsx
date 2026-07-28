"use client";

import { Check, Copy, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  canInviteToWorkspace,
  defaultInviteRoleId,
  getBoardShareUrl,
  inviteRolesForWorkspace,
} from "@/lib/board-share";
import { toastError, toastFromError, toastSuccess } from "@/lib/toast";
import {
  inviteMember,
  type WorkspaceDetail,
  type WorkspaceRole,
} from "@/lib/workspaces";
import {
  getWorkspacePageCache,
  prefetchWorkspacePage,
} from "@/stores/entity-cache";

type Props = {
  open: boolean;
  onClose: () => void;
  boardId: string;
  boardName: string;
  workspaceId: string;
};

export function BoardShareModal({
  open,
  onClose,
  boardId,
  boardName,
  workspaceId,
}: Props) {
  const shareUrl = useMemo(() => getBoardShareUrl(boardId), [boardId]);

  const [loading, setLoading] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [roles, setRoles] = useState<WorkspaceRole[]>([]);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const inviteRoles = useMemo(() => inviteRolesForWorkspace(roles), [roles]);
  const canInvite = canInviteToWorkspace(workspace?.myMembership);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setDebugToken(null);
  }, [open, boardId]);

  useEffect(() => {
    if (!open || !workspaceId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const cached = getWorkspacePageCache(workspaceId);
        if (cached?.workspace?.myMembership && cached.roles.length > 0) {
          if (cancelled) return;
          setWorkspace(cached.workspace);
          setRoles(cached.roles);
          setRoleId(defaultInviteRoleId(cached.roles));
          return;
        }

        const page = await prefetchWorkspacePage(workspaceId);
        if (cancelled) return;
        setWorkspace(page.workspace);
        setRoles(page.roles);
        setRoleId(defaultInviteRoleId(page.roles));
      } catch (error) {
        if (!cancelled) toastFromError(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toastSuccess("Link copied");
    } catch {
      toastError("Could not copy link");
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!canInvite || !roleId) return;

    setInviting(true);
    setDebugToken(null);
    try {
      const result = await inviteMember(workspaceId, { email, roleId });
      toastSuccess("Invitation sent", email);
      if (result.debugToken) setDebugToken(result.debugToken);
      setEmail("");
    } catch (error) {
      toastFromError(error);
    } finally {
      setInviting(false);
    }
  }

  const busy = inviting || loading;

  return (
    <Modal
      open={open}
      onClose={inviting ? () => {} : onClose}
      title={`Share “${boardName}”`}
    >
      <p className="mb-4 text-sm text-bb-muted">
        Copy a direct link for workspace members, or invite someone by email.
        Invited people join the workspace first, then can open this board.
      </p>

      <Field label="Board link">
        <div className="flex gap-2">
          <Input
            readOnly
            value={shareUrl}
            aria-label="Board link"
            className="min-w-0 flex-1"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void onCopyLink()}
            aria-label={copied ? "Link copied" : "Copy board link"}
            title={copied ? "Copied" : "Copy link"}
            className="shrink-0 px-3"
          >
            {copied ? (
              <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={2} aria-hidden />
            )}
          </Button>
        </div>
      </Field>

      {canInvite ? (
        <form onSubmit={onInvite} className="mt-6 border-t border-bb-border/70 pt-6">
          <h3 className="text-sm font-bold text-bb-ink">Invite by email</h3>
          <p className="mt-1 mb-4 text-sm text-bb-muted">
            Send a workspace invite with a role. After they accept, they can use
            the board link above.
          </p>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy || inviteRoles.length === 0}
              autoComplete="email"
            />
          </Field>
          <Field label="Role">
            <select
              className="h-11 w-full rounded-[10px] border border-bb-border bg-white px-3 text-sm text-bb-ink disabled:opacity-60"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              disabled={busy || inviteRoles.length === 0}
            >
              {inviteRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </Field>
          <Button
            type="submit"
            fullWidth
            disabled={busy || inviteRoles.length === 0}
            className="mt-4"
          >
            {inviting ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
                Send invite
              </>
            )}
          </Button>
          {debugToken ? (
            <Alert tone="info" className="mt-4 mb-0">
              Dev:{" "}
              <Link
                className="font-semibold text-bb-blue underline"
                href={`/workspaces/invitations?token=${debugToken}`}
              >
                open invite
              </Link>
            </Alert>
          ) : null}
        </form>
      ) : loading ? (
        <p className="mt-6 border-t border-bb-border/70 pt-6 text-sm text-bb-muted">
          Checking invite permissions...
        </p>
      ) : (
        <p className="mt-6 border-t border-bb-border/70 pt-6 text-sm text-bb-muted">
          You can share the link with existing workspace members. Ask a workspace
          admin if you need to invite someone new.
        </p>
      )}
    </Modal>
  );
}
