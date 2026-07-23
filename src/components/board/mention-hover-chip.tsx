"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CommentAuthor } from "@/lib/comments";

type MentionUser = CommentAuthor["user"];

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
  const wrapRef = useRef<HTMLSpanElement>(null);
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
      ref={wrapRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={show}
      onBlur={hideSoon}
    >
      <button
        type="button"
        className="rounded px-0.5 font-semibold text-bb-blue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bb-blue"
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
              <span className="mt-0.5 block truncate text-xs font-semibold text-bb-blue">
                @{user.username}
              </span>
              {user.email ? (
                <span className="mt-1 block truncate text-[11px] text-bb-muted">
                  {user.email}
                </span>
              ) : null}
            </span>
          </span>
        </span>
      ) : null}
    </span>
  );
}

type MentionSource = {
  user: MentionUser;
};

/** Split comment text and wrap known @mentions with hover chips. */
export function renderCommentContent(
  content: string,
  sources: MentionSource[],
) {
  const byUsername = new Map<string, MentionUser>();
  const byFullName = new Map<string, MentionUser>();
  for (const s of sources) {
    if (s.user.username) {
      byUsername.set(s.user.username.toLowerCase(), s.user);
    }
    byFullName.set(s.user.fullName.toLowerCase(), s.user);
  }

  const parts = content.split(/(@[\w.-]+)/g);
  return parts.map((part, i) => {
    if (!part.startsWith("@") || part.length < 2) {
      return <span key={i}>{part}</span>;
    }
    const token = part.slice(1).toLowerCase();
    const user = byUsername.get(token) ?? byFullName.get(token);
    if (!user) {
      return (
        <span key={i} className="font-semibold text-bb-blue/70">
          {part}
        </span>
      );
    }
    return <MentionHoverChip key={i} label={part} user={user} />;
  });
}
