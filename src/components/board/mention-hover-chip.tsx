"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  parseMentionTokens,
  type MentionMember,
  type MentionUser,
} from "@/lib/mentions";
import { useAuthStore } from "@/stores/auth-store";

type Props = {
  label: string;
  user: MentionUser;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MentionHoverChip({ label, user }: Props) {
  const tipId = useId();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isSelf = currentUserId === user.id;
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  function clearClose() {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function show() {
    clearClose();
    setOpen(true);
  }

  function hideSoon() {
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    return () => clearClose();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={show}
      onBlur={hideSoon}
    >
      <button
        type="button"
        className="rounded bg-bb-sky/60 px-0.5 font-semibold text-bb-blue underline-offset-2 hover:bg-bb-sky hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bb-blue"
        aria-describedby={open ? tipId : undefined}
      >
        {label}
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          className="absolute left-0 top-full z-30 mt-1.5 w-[220px] rounded-xl border border-bb-border bg-white p-3 text-left shadow-bb-lg"
        >
          <span className="flex items-start gap-2.5">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-bb-border/60"
              />
            ) : (
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bb-blue text-xs font-bold text-white"
                aria-hidden
              >
                {initials(user.fullName)}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-bb-ink">
                {user.fullName}
              </span>
              {user.username ? (
                <span className="mt-0.5 block truncate text-xs font-semibold text-bb-blue">
                  @{user.username}
                </span>
              ) : null}
              {user.email ? (
                <span className="mt-1 block truncate text-[11px] text-bb-muted">
                  {user.email}
                </span>
              ) : null}
              {isSelf ? (
                <Link
                  href="/profile"
                  className="mt-2 inline-block text-[11px] font-semibold text-bb-blue hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View your profile
                </Link>
              ) : null}
            </span>
          </span>
        </span>
      ) : null}
    </span>
  );
}

type MentionSource = MentionMember;

/** Split comment text and wrap known @mentions with hover chips. */
export function renderCommentContent(
  content: string,
  sources: MentionSource[],
) {
  if (!content) return null;

  const tokens = parseMentionTokens(content, sources);
  if (!tokens.length) {
    return <span>{content}</span>;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.start > cursor) {
      nodes.push(
        <span key={`text-${cursor}`}>{content.slice(cursor, token.start)}</span>,
      );
    }
    if (token.user) {
      nodes.push(
        <MentionHoverChip
          key={`mention-${token.start}`}
          label={token.label}
          user={token.user}
        />,
      );
    } else {
      nodes.push(
        <span
          key={`unknown-${token.start}`}
          className="rounded bg-bb-sky/40 px-0.5 font-semibold text-bb-blue/70"
        >
          {token.label}
        </span>,
      );
    }
    cursor = token.end;
  }

  if (cursor < content.length) {
    nodes.push(<span key={`tail-${cursor}`}>{content.slice(cursor)}</span>);
  }

  return nodes;
}
