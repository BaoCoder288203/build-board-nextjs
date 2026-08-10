"use client";

import { useEffect, useRef } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { MentionMember } from "@/lib/mentions";

type Props = {
  members: MentionMember[];
  activeIndex: number;
  query: string;
  onSelect: (member: MentionMember) => void;
  onHoverIndex?: (index: number) => void;
  className?: string;
};

export function MentionPicker({
  members,
  activeIndex,
  query,
  onSelect,
  onHoverIndex,
  className = "",
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const item = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!members.length) {
    return (
      <div
        className={`rounded-lg border border-bb-border bg-white px-3 py-2 text-xs text-bb-muted shadow-bb ${className}`}
        role="listbox"
        aria-label="Mention suggestions"
      >
        {query ? `No members match “${query}”` : "No members to mention"}
      </div>
    );
  }

  return (
    <ul
      ref={listRef}
      className={`max-h-44 w-64 overflow-y-auto rounded-lg border border-bb-border bg-white py-1 shadow-bb ${className}`}
      role="listbox"
      aria-label="Mention suggestions"
    >
      {members.map((m, index) => {
        const active = index === activeIndex;
        return (
          <li key={m.user.id} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={active}
              className={`flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition ${
                active ? "bg-bb-sky text-bb-ink" : "text-bb-ink hover:bg-bb-sky/70"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(m);
              }}
              onMouseEnter={() => onHoverIndex?.(index)}
            >
              <UserAvatar
                name={m.user.fullName}
                avatar={m.user.avatar}
                size="md"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{m.user.fullName}</span>
                {m.user.username ? (
                  <span className="block truncate text-xs text-bb-muted">
                    @{m.user.username}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
