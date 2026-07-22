"use client";

import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createComment,
  deleteComment,
  fetchComments,
  fetchReplies,
  replyToComment,
  updateComment,
  type TaskComment,
} from "@/lib/comments";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { fetchMembers, type WorkspaceMember } from "@/lib/workspaces";
import { useAuthStore } from "@/stores/auth-store";

type Props = {
  taskId: string;
  workspaceId?: string | null;
  onCountChange?: (count: number) => void;
  /** sidebar = hide section title (modal column already has one) */
  variant?: "full" | "sidebar";
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function TaskCommentPanel({
  taskId,
  workspaceId,
  onCountChange,
  variant = "full",
}: Props) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [replies, setReplies] = useState<Record<string, TaskComment[]>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const load = useCallback(async () => {
    try {
      const { items } = await fetchComments(taskId);
      setComments(items);
      const count = items.reduce((n, c) => n + 1 + (c.replyCount ?? 0), 0);
      onCountChangeRef.current?.(count);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    void fetchMembers(workspaceId)
      .then((res) => {
        if (!cancelled) setMembers(res.items);
      })
      .catch(() => {
        /* mention picker optional */
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  function extractMentions(text: string) {
    if (!members.length) return [] as string[];
    const ids = new Set<string>();
    for (const m of members) {
      const uname = m.user.username?.toLowerCase();
      const name = m.user.fullName.toLowerCase();
      if (uname && text.toLowerCase().includes(`@${uname}`)) {
        ids.add(m.user.id);
      } else if (text.toLowerCase().includes(`@${name}`)) {
        ids.add(m.user.id);
      }
    }
    return [...ids];
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setBusy("create");
    try {
      await createComment({
        taskId,
        content,
        mentions: extractMentions(content),
      });
      setDraft("");
      setMentionOpen(false);
      toastSuccess("Comment added");
      await load();
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  async function onSaveEdit(commentId: string) {
    const content = editDraft.trim();
    if (!content) return;
    setBusy(commentId);
    try {
      await updateComment(commentId, {
        content,
        mentions: extractMentions(content),
      });
      setEditingId(null);
      toastSuccess("Comment updated");
      await load();
      if (replies[commentId]) {
        const { items } = await fetchReplies(commentId);
        setReplies((prev) => ({ ...prev, [commentId]: items }));
      }
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(commentId: string) {
    if (!window.confirm("Delete this comment?")) return;
    setBusy(commentId);
    try {
      await deleteComment(commentId);
      toastSuccess("Comment deleted");
      await load();
      setReplies((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  async function onToggleReplies(commentId: string) {
    if (replies[commentId]) {
      setReplies((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      return;
    }
    setBusy(`replies-${commentId}`);
    try {
      const { items } = await fetchReplies(commentId);
      setReplies((prev) => ({ ...prev, [commentId]: items }));
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  async function onReply(parentId: string) {
    const content = (replyDraft[parentId] ?? "").trim();
    if (!content) return;
    setBusy(`reply-${parentId}`);
    try {
      await replyToComment(parentId, {
        content,
        mentions: extractMentions(content),
      });
      setReplyDraft((prev) => ({ ...prev, [parentId]: "" }));
      toastSuccess("Reply added");
      await load();
      const { items } = await fetchReplies(parentId);
      setReplies((prev) => ({ ...prev, [parentId]: items }));
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
  }

  function insertMention(member: WorkspaceMember) {
    const token = `@${member.user.username || member.user.fullName}`;
    setDraft((prev) => {
      const needsSpace = prev.length > 0 && !prev.endsWith(" ");
      return `${prev}${needsSpace ? " " : ""}${token} `;
    });
    setMentionOpen(false);
  }

  function renderComment(
    comment: TaskComment,
    opts?: { nested?: boolean },
  ) {
    const isMine = user?.id && comment.author.user.id === user.id;
    const isEditing = editingId === comment.id;

    return (
      <li
        key={comment.id}
        className={`rounded-lg border border-bb-border bg-white p-3 ${
          opts?.nested ? "ml-6 border-l-2 border-l-bb-sky-deep" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bb-blue text-[10px] font-bold text-white">
            {initials(comment.author.user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-bold text-bb-ink">
                {comment.author.user.fullName}
              </span>
              <span className="text-[11px] text-bb-muted">
                {formatTime(comment.createdAt)}
                {comment.isEdited ? " · edited" : ""}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-[10px] border border-bb-border px-3 py-2 text-sm outline-none focus:border-bb-blue"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === comment.id}
                    onClick={() => void onSaveEdit(comment.id)}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-sm text-bb-ink">
                {comment.content}
              </p>
            )}

            {comment.mentions.length > 0 ? (
              <p className="mt-1 text-[11px] text-bb-muted">
                Mentioned:{" "}
                {comment.mentions.map((m) => m.user.fullName).join(", ")}
              </p>
            ) : null}

            {!opts?.nested && !isEditing ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-bb-blue hover:underline"
                  onClick={() => void onToggleReplies(comment.id)}
                >
                  {replies[comment.id]
                    ? "Hide replies"
                    : `Replies (${comment.replyCount})`}
                </button>
                {isMine ? (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-bb-muted hover:text-bb-ink"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditDraft(comment.content);
                      }}
                    >
                      <Pencil className="h-3 w-3" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy === comment.id}
                      className="inline-flex items-center gap-1 text-xs text-bb-muted hover:text-bb-danger"
                      onClick={() => void onDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}

            {replies[comment.id] ? (
              <ul className="mt-3 space-y-2">
                {replies[comment.id]!.map((r) =>
                  renderComment(r, { nested: true }),
                )}
                <li className="ml-6 flex gap-2">
                  <textarea
                    value={replyDraft[comment.id] ?? ""}
                    onChange={(e) =>
                      setReplyDraft((prev) => ({
                        ...prev,
                        [comment.id]: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder="Write a reply..."
                    className="min-w-0 flex-1 rounded-[10px] border border-bb-border px-3 py-2 text-sm outline-none focus:border-bb-blue"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === `reply-${comment.id}`}
                    onClick={() => void onReply(comment.id)}
                  >
                    Reply
                  </Button>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-bb-border bg-bb-sky/40 px-3 py-4 text-sm text-bb-muted">
        Loading comments...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {variant === "full" ? (
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-bb-muted" aria-hidden />
          <h3 className="text-sm font-bold text-bb-ink">
            Comments
            {comments.length > 0 ? (
              <span className="ml-1 font-semibold text-bb-muted">
                ({comments.length})
              </span>
            ) : null}
          </h3>
        </div>
      ) : null}

      <ul className="space-y-2">
        {comments.length === 0 ? (
          <li className="rounded-lg border border-dashed border-bb-border px-3 py-4 text-center text-sm text-bb-muted">
            No comments yet
          </li>
        ) : (
          comments.map((c) => renderComment(c))
        )}
      </ul>

      <form onSubmit={onCreate} className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Write a comment… Use @username to mention"
          className="w-full rounded-[10px] border border-bb-border px-3 py-2 text-sm outline-none focus:border-bb-blue"
          required
        />
        <div className="flex flex-wrap items-center gap-2">
          {members.length > 0 ? (
            <div className="relative">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setMentionOpen((v) => !v)}
              >
                @ Mention
              </Button>
              {mentionOpen ? (
                <ul className="absolute bottom-full left-0 z-10 mb-1 max-h-40 w-56 overflow-y-auto rounded-lg border border-bb-border bg-white py-1 shadow-bb">
                  {members.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-1.5 text-left text-sm hover:bg-bb-sky"
                        onClick={() => insertMention(m)}
                      >
                        <span className="font-semibold text-bb-ink">
                          {m.user.fullName}
                        </span>
                        <span className="ml-1 text-xs text-bb-muted">
                          @{m.user.username}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <Button type="submit" size="sm" disabled={busy === "create"}>
            {busy === "create" ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
