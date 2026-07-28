"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { MentionPicker } from "@/components/board/mention-picker";
import {
  filterMembers,
  getActiveMention,
  insertMention,
  type MentionMember,
} from "@/lib/mentions";
import type { WorkspaceMember } from "@/lib/workspaces";

export type MentionTextareaHandle = {
  openMentionPicker: () => void;
  focus: () => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  members: WorkspaceMember[];
  rows?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export const MentionTextarea = forwardRef<MentionTextareaHandle, Props>(
  function MentionTextarea(
    {
      value,
      onChange,
      members,
      rows = 3,
      placeholder,
      className = "",
      disabled,
      required,
      onKeyDown,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const prevQueryRef = useRef("");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState(0);
    const [mentionQuery, setMentionQuery] = useState("");

    const memberSources = useMemo(
      () => members as MentionMember[],
      [members],
    );

    const filtered = useMemo(
      () => filterMembers(memberSources, mentionQuery),
      [memberSources, mentionQuery],
    );

    const syncMention = useCallback(
      (text: string, cursor: number) => {
        if (!members.length) {
          setPickerOpen(false);
          return;
        }
        const active = getActiveMention(text, cursor);
        if (active) {
          setPickerOpen(true);
          setMentionStart(active.start);
          if (active.query !== prevQueryRef.current) {
            setActiveIndex(0);
            prevQueryRef.current = active.query;
          }
          setMentionQuery(active.query);
        } else {
          setPickerOpen(false);
          prevQueryRef.current = "";
        }
      },
      [members.length],
    );

    useEffect(() => {
      if (!pickerOpen) return;
      function onPointerDown(event: MouseEvent) {
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (wrapRef.current?.contains(target)) return;
        setPickerOpen(false);
      }
      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [pickerOpen]);

    useEffect(() => {
      if (activeIndex >= filtered.length && filtered.length > 0) {
        setActiveIndex(filtered.length - 1);
      }
    }, [activeIndex, filtered.length]);

    function selectMember(member: MentionMember) {
      const el = textareaRef.current;
      const cursor = el?.selectionStart ?? value.length;
      const { text, cursor: nextCursor } = insertMention(
        value,
        mentionStart,
        cursor,
        member,
      );
      onChange(text);
      setPickerOpen(false);
      prevQueryRef.current = "";
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(nextCursor, nextCursor);
      });
    }

    const openMentionPicker = useCallback(() => {
      const el = textareaRef.current;
      const cursor = el?.selectionStart ?? value.length;
      const needsSpace =
        value.length > 0 &&
        cursor > 0 &&
        !/\s/.test(value[cursor - 1] ?? "");
      const prefix = needsSpace ? " @" : "@";
      const next = `${value.slice(0, cursor)}${prefix}${value.slice(cursor)}`;
      const nextCursor = cursor + prefix.length;
      onChange(next);
      setMentionStart(cursor + (needsSpace ? 1 : 0));
      setMentionQuery("");
      prevQueryRef.current = "";
      setActiveIndex(0);
      setPickerOpen(true);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(nextCursor, nextCursor);
      });
    }, [onChange, value]);

    useImperativeHandle(
      ref,
      () => ({
        openMentionPicker,
        focus: () => textareaRef.current?.focus(),
      }),
      [openMentionPicker],
    );

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
      if (pickerOpen) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (filtered.length) {
            setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
          }
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          if (filtered.length) {
            setActiveIndex((i) => Math.max(i - 1, 0));
          }
          return;
        }
        if ((event.key === "Enter" || event.key === "Tab") && filtered.length) {
          event.preventDefault();
          selectMember(filtered[activeIndex]!);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setPickerOpen(false);
          return;
        }
      }
      onKeyDown?.(event);
    }

    return (
      <div ref={wrapRef} className="relative">
        {pickerOpen ? (
          <MentionPicker
            members={filtered}
            activeIndex={Math.min(
              activeIndex,
              Math.max(filtered.length - 1, 0),
            )}
            query={mentionQuery}
            onSelect={selectMember}
            onHoverIndex={setActiveIndex}
            className="absolute bottom-full left-0 z-20 mb-1.5"
          />
        ) : null}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            const cursor = e.target.selectionStart ?? next.length;
            onChange(next);
            syncMention(next, cursor);
          }}
          onKeyDown={handleKeyDown}
          onClick={(e) =>
            syncMention(
              e.currentTarget.value,
              e.currentTarget.selectionStart ?? e.currentTarget.value.length,
            )
          }
          onKeyUp={(e) =>
            syncMention(
              e.currentTarget.value,
              e.currentTarget.selectionStart ?? e.currentTarget.value.length,
            )
          }
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={className}
          aria-autocomplete={pickerOpen ? "list" : undefined}
          aria-expanded={pickerOpen || undefined}
        />
      </div>
    );
  },
);
