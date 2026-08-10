"use client";

import { MessageSquare, Pencil, SmilePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommentRichContent } from "@/components/board/comment-rich-content";
import {
  RichCommentEditor,
  type RichCommentEditorHandle,
} from "@/components/board/rich-comment-editor";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  COMMENT_REACTION_EMOJIS,
  createComment,
  deleteComment,
  fetchComments,
  fetchReplies,
  replyToComment,
  toggleCommentReaction,
  updateComment,
  type TaskComment,
} from "@/lib/comments";
import {
  CLIENT_EVENT,
  SERVER_EVENT,
  boardRoom,
  type CommentDeletedPayload,
  type CommentRealtimePayload,
  type TypingStatePayload,
} from "@/lib/realtime/events";
import { connectRealtime } from "@/lib/realtime/socket-client";
import {
  extractMentionUserIdsFromComment,
  isCommentContentEmpty,
} from "@/lib/comment-content";
import { confirm } from "@/lib/confirm";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { fetchMembers, type WorkspaceMember } from "@/lib/workspaces";
import { useAuthStore } from "@/stores/auth-store";
import { useRealtimeSnapshotResync } from "@/hooks/use-realtime-snapshot-resync";

type Props = {
  taskId: string;
  boardId?: string;
  workspaceId?: string | null;
  onCountChange?: (count: number) => void;
  /** sidebar = hide section title (modal column already has one) */
  variant?: "full" | "sidebar";
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function TaskCommentPanel({
  taskId,
  boardId,
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
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(
    null,
  );
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; fullName: string }>>([]);
  const draftRef = useRef<RichCommentEditorHandle>(null);
  const typingRef = useRef(false);
  const typingStopTimerRef = useRef<number | null>(null);
  const lastTypingEmitAtRef = useRef(0);
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

  useRealtimeSnapshotResync(load);

  function notifyCount(nextComments: TaskComment[]) {
    const count = nextComments.reduce(
      (n, c) => n + 1 + (c.replyCount ?? 0),
      0,
    );
    onCountChangeRef.current?.(count);
  }

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

  useEffect(() => {
    if (!reactionPickerFor) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-reaction-picker]")) return;
      setReactionPickerFor(null);
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [reactionPickerFor]);

  useEffect(() => {
    if (!boardId) return;
    const socket = connectRealtime();
    const room = boardRoom(boardId);

    const onTyping = (payload: TypingStatePayload) => {
      if (payload.room !== room) return;
      if (payload.taskId !== taskId) return;
      if (payload.user.id === user?.id) return;
      setTypingUsers((prev) => {
        const exists = prev.some((entry) => entry.id === payload.user.id);
        if (payload.isTyping) {
          return exists ? prev : [...prev, payload.user];
        }
        return prev.filter((entry) => entry.id !== payload.user.id);
      });
    };

    const onCommentCreated = (payload: CommentRealtimePayload) => {
      if (payload.boardId !== boardId) return;
      if (payload.taskId !== taskId) return;
      setTypingUsers((prev) =>
        prev.filter((entry) => entry.id !== payload.actorId),
      );
      // Author already refreshed via REST; skip to avoid double-count.
      if (payload.actorId === user?.id) return;

      const comment = payload.comment as TaskComment;
      const parentId = comment.parentCommentId ?? null;
      if (parentId) {
        setReplies((prev) => {
          const items = prev[parentId];
          if (!items) return prev;
          if (items.some((c) => c.id === comment.id)) {
            return {
              ...prev,
              [parentId]: items.map((c) =>
                c.id === comment.id ? { ...c, ...comment } : c,
              ),
            };
          }
          return { ...prev, [parentId]: [...items, comment] };
        });
        setComments((prev) => {
          const next = prev.map((c) =>
            c.id === parentId
              ? { ...c, replyCount: (c.replyCount ?? 0) + 1 }
              : c,
          );
          notifyCount(next);
          return next;
        });
        return;
      }

      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) {
          const next = prev.map((c) =>
            c.id === comment.id ? { ...c, ...comment } : c,
          );
          notifyCount(next);
          return next;
        }
        const next = [...prev, comment];
        notifyCount(next);
        return next;
      });
    };

    const onCommentUpdated = (payload: CommentRealtimePayload) => {
      if (payload.boardId !== boardId) return;
      if (payload.taskId !== taskId) return;
      if (payload.actorId === user?.id) return;
      applyCommentUpdate(payload.comment as TaskComment);
    };

    const onCommentDeleted = (payload: CommentDeletedPayload) => {
      if (payload.boardId !== boardId) return;
      if (payload.taskId !== taskId) return;
      if (payload.actorId === user?.id) return;
      const parentId = payload.parentCommentId ?? null;
      if (parentId) {
        setReplies((prev) => {
          const items = prev[parentId];
          if (!items) return prev;
          return {
            ...prev,
            [parentId]: items.filter((c) => c.id !== payload.commentId),
          };
        });
        setComments((prev) => {
          const next = prev.map((c) =>
            c.id === parentId
              ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) }
              : c,
          );
          notifyCount(next);
          return next;
        });
        return;
      }
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== payload.commentId);
        notifyCount(next);
        return next;
      });
      setReplies((prev) => {
        const next = { ...prev };
        delete next[payload.commentId];
        return next;
      });
    };

    const onCommentReaction = (payload: CommentRealtimePayload) => {
      if (payload.boardId !== boardId) return;
      if (payload.taskId !== taskId) return;
      const incoming = payload.comment as TaskComment;
      if (payload.actorId === user?.id) {
        applyCommentUpdate(incoming);
        return;
      }
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== incoming.id) return c;
          return {
            ...c,
            ...incoming,
            reactions: (incoming.reactions ?? []).map((r) => ({
              ...r,
              reactedByMe:
                c.reactions?.find((x) => x.emoji === r.emoji)?.reactedByMe ??
                false,
            })),
          };
        }),
      );
      setReplies((prev) => {
        const next: Record<string, TaskComment[]> = {};
        for (const [pid, items] of Object.entries(prev)) {
          next[pid] = items.map((c) => {
            if (c.id !== incoming.id) return c;
            return {
              ...c,
              ...incoming,
              reactions: (incoming.reactions ?? []).map((r) => ({
                ...r,
                reactedByMe:
                  c.reactions?.find((x) => x.emoji === r.emoji)?.reactedByMe ??
                  false,
              })),
            };
          });
        }
        return next;
      });
    };

    socket.on(SERVER_EVENT.TYPING_STATE, onTyping);
    socket.on(SERVER_EVENT.COMMENT_CREATED, onCommentCreated);
    socket.on(SERVER_EVENT.COMMENT_UPDATED, onCommentUpdated);
    socket.on(SERVER_EVENT.COMMENT_DELETED, onCommentDeleted);
    socket.on(SERVER_EVENT.COMMENT_REACTION, onCommentReaction);
    return () => {
      socket.off(SERVER_EVENT.TYPING_STATE, onTyping);
      socket.off(SERVER_EVENT.COMMENT_CREATED, onCommentCreated);
      socket.off(SERVER_EVENT.COMMENT_UPDATED, onCommentUpdated);
      socket.off(SERVER_EVENT.COMMENT_DELETED, onCommentDeleted);
      socket.off(SERVER_EVENT.COMMENT_REACTION, onCommentReaction);
      setTypingUsers([]);
    };
  }, [boardId, taskId, user?.id]);

  function emitTyping(isTyping: boolean, force = false) {
    if (!boardId) return;
    const now = Date.now();
    // Throttle "still typing" heartbeats; always allow stop typing.
    if (isTyping && !force && now - lastTypingEmitAtRef.current < 2_000) {
      return;
    }
    lastTypingEmitAtRef.current = now;
    const socket = connectRealtime();
    socket.emit(CLIENT_EVENT.TYPING_STATE, {
      room: boardRoom(boardId),
      taskId,
      isTyping,
    });
  }

  useEffect(() => {
    const hasContent = !isCommentContentEmpty(draft);
    if (hasContent) {
      if (!typingRef.current) {
        typingRef.current = true;
        emitTyping(true, true);
      } else {
        emitTyping(true);
      }
    } else if (typingRef.current) {
      typingRef.current = false;
      emitTyping(false, true);
    }
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    if (hasContent) {
      typingStopTimerRef.current = window.setTimeout(() => {
        typingRef.current = false;
        emitTyping(false, true);
      }, 4000);
    }
  }, [draft, boardId, taskId]);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }
      if (typingRef.current) {
        typingRef.current = false;
        emitTyping(false, true);
      }
    };
  }, [boardId, taskId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (isCommentContentEmpty(content)) return;
    setBusy("create");
    try {
      await createComment({
        taskId,
        content,
        mentions: extractMentionUserIdsFromComment(content, members),
      });
      setDraft("");
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
    if (isCommentContentEmpty(content)) return;
    setBusy(commentId);
    try {
      await updateComment(commentId, {
        content,
        mentions: extractMentionUserIdsFromComment(content, members),
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
    const ok = await confirm({
      title: "Delete comment?",
      description: "This comment will be permanently removed.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
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
    if (isCommentContentEmpty(content)) return;
    setBusy(`reply-${parentId}`);
    try {
      await replyToComment(parentId, {
        content,
        mentions: extractMentionUserIdsFromComment(content, members),
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

  function applyCommentUpdate(updated: TaskComment) {
    setComments((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    );
    setReplies((prev) => {
      const next: Record<string, TaskComment[]> = {};
      for (const [parentId, items] of Object.entries(prev)) {
        next[parentId] = items.map((c) =>
          c.id === updated.id ? { ...c, ...updated } : c,
        );
      }
      return next;
    });
  }

  async function onToggleReaction(commentId: string, emoji: string) {
    setBusy(`react-${commentId}-${emoji}`);
    try {
      const updated = await toggleCommentReaction(commentId, emoji);
      applyCommentUpdate(updated);
      setReactionPickerFor(null);
    } catch (error) {
      toastFromError(error);
    } finally {
      setBusy(null);
    }
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
          <UserAvatar
            name={comment.author.user.fullName}
            avatar={comment.author.user.avatar}
            size="md"
          />
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
                <RichCommentEditor
                  value={editDraft}
                  onChange={setEditDraft}
                  members={members}
                  minHeightClass="min-h-[80px]"
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
              <div className="mt-1">
                <CommentRichContent
                  content={comment.content}
                  sources={[
                    ...comment.mentions,
                    ...members.map((m) => ({ user: m.user })),
                  ]}
                />
              </div>
            )}

            {!isEditing ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(comment.reactions ?? []).map((reaction) => (
                  <button
                    key={`${comment.id}-${reaction.emoji}`}
                    type="button"
                    disabled={busy === `react-${comment.id}-${reaction.emoji}`}
                    onClick={() =>
                      void onToggleReaction(comment.id, reaction.emoji)
                    }
                    className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition ${
                      reaction.reactedByMe
                        ? "border-bb-blue bg-bb-sky text-bb-ink"
                        : "border-bb-border bg-white text-bb-muted hover:border-bb-blue/40 hover:bg-bb-sky/50"
                    }`}
                    title={
                      reaction.reactedByMe
                        ? "Remove reaction"
                        : "Add reaction"
                    }
                  >
                    <span aria-hidden>{reaction.emoji}</span>
                    <span className="font-semibold">{reaction.count}</span>
                  </button>
                ))}
                <div className="relative" data-reaction-picker>
                  <button
                    type="button"
                    aria-label="Add reaction"
                    title="Add reaction"
                    onClick={() =>
                      setReactionPickerFor((id) =>
                        id === comment.id ? null : comment.id,
                      )
                    }
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-bb-border text-bb-muted hover:border-bb-blue hover:text-bb-blue"
                  >
                    <SmilePlus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  {reactionPickerFor === comment.id ? (
                    <div
                      data-reaction-picker
                      className="absolute bottom-full left-0 z-20 mb-1 flex gap-1 rounded-lg border border-bb-border bg-white p-1 shadow-bb"
                    >
                      {COMMENT_REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-bb-sky"
                          onClick={() =>
                            void onToggleReaction(comment.id, emoji)
                          }
                          aria-label={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
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
                  <RichCommentEditor
                    value={replyDraft[comment.id] ?? ""}
                    onChange={(next) =>
                      setReplyDraft((prev) => ({
                        ...prev,
                        [comment.id]: next,
                      }))
                    }
                    members={members}
                    placeholder="Write a reply… Use @ to mention"
                    minHeightClass="min-h-[56px]"
                    className="min-w-0 flex-1"
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
        {typingUsers.length > 0 ? (
          <p className="text-xs text-bb-muted">
            {typingUsers.map((entry) => entry.fullName).join(", ")} typing...
          </p>
        ) : null}
        <RichCommentEditor
          ref={draftRef}
          value={draft}
          onChange={setDraft}
          members={members}
          placeholder="Write a comment… Type @ to mention someone"
        />
        <div className="flex flex-wrap items-center gap-2">
          {members.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => draftRef.current?.openMentionPicker()}
            >
              @ Mention
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={busy === "create"}>
            {busy === "create" ? "Posting..." : "Comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
