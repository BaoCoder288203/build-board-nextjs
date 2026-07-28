"use client";

import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
} from "lucide-react";
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
import { isCommentContentEmpty } from "@/lib/comment-content";
import {
  filterMembers,
  getActiveMention,
  mentionLabel,
  type MentionMember,
} from "@/lib/mentions";
import type { WorkspaceMember } from "@/lib/workspaces";

export type RichCommentEditorHandle = {
  openMentionPicker: () => void;
  focus: () => void;
  isEmpty: () => boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  members: WorkspaceMember[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeightClass?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-bb-muted transition hover:border-bb-blue/40 hover:bg-bb-sky/60 hover:text-bb-ink ${
        active
          ? "border-bb-blue bg-bb-sky text-bb-blue"
          : "border-transparent bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function getActiveMentionInEditor(editor: Editor) {
  const { $from } = editor.state.selection;
  const paragraphStart = $from.start();
  const textBefore = editor.state.doc.textBetween(
    paragraphStart,
    $from.pos,
    "",
    "",
  );
  const active = getActiveMention(textBefore, textBefore.length);
  if (!active) return null;
  return {
    query: active.query,
    docStart: paragraphStart + active.start,
    docEnd: $from.pos,
  };
}

export const RichCommentEditor = forwardRef<RichCommentEditorHandle, Props>(
  function RichCommentEditor(
    {
      value,
      onChange,
      members,
      placeholder = "Write a comment…",
      className = "",
      disabled,
      minHeightClass = "min-h-[72px]",
      onKeyDown,
    },
    ref,
  ) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const prevQueryRef = useRef("");
    const editorRef = useRef<Editor | null>(null);
    const pickerOpenRef = useRef(false);
    const filteredRef = useRef<MentionMember[]>([]);
    const activeIndexRef = useRef(0);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [mentionQuery, setMentionQuery] = useState("");

    const memberSources = useMemo(
      () => members as MentionMember[],
      [members],
    );

    const filtered = useMemo(
      () => filterMembers(memberSources, mentionQuery),
      [memberSources, mentionQuery],
    );

    pickerOpenRef.current = pickerOpen;
    filteredRef.current = filtered;
    activeIndexRef.current = activeIndex;

    const syncMention = useCallback(
      (ed: Editor) => {
        if (!members.length) {
          setPickerOpen(false);
          return;
        }
        const active = getActiveMentionInEditor(ed);
        if (active) {
          setPickerOpen(true);
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

    const selectMember = useCallback((member: MentionMember) => {
      const editor = editorRef.current;
      if (!editor) return;
      const active = getActiveMentionInEditor(editor);
      if (!active) return;
      const label = mentionLabel(member.user);
      editor
        .chain()
        .focus()
        .deleteRange({ from: active.docStart, to: active.docEnd })
        .insertContent(`${label} `)
        .run();
      setPickerOpen(false);
      prevQueryRef.current = "";
    }, []);

    const editor = useEditor({
      immediatelyRender: false,
      editable: !disabled,
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: false,
          codeBlock: false,
          code: false,
          horizontalRule: false,
        }),
        LinkExtension.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: "_blank",
            class: "font-semibold text-bb-blue underline underline-offset-2",
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
      ],
      content: value || "",
      editorProps: {
        attributes: {
          class: `prose-comment px-3 py-2 text-sm text-bb-ink outline-none ${minHeightClass}`,
        },
        handleKeyDown: (_view, event) => {
          if (!pickerOpenRef.current) return false;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            const list = filteredRef.current;
            if (list.length) {
              setActiveIndex((i) => Math.min(i + 1, list.length - 1));
            }
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            const list = filteredRef.current;
            if (list.length) {
              setActiveIndex((i) => Math.max(i - 1, 0));
            }
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            const list = filteredRef.current;
            if (list.length) {
              event.preventDefault();
              const member = list[activeIndexRef.current] ?? list[0];
              if (member) {
                const ed = editorRef.current;
                if (!ed) return true;
                const active = getActiveMentionInEditor(ed);
                if (!active) return true;
                const label = mentionLabel(member.user);
                ed.chain()
                  .focus()
                  .deleteRange({ from: active.docStart, to: active.docEnd })
                  .insertContent(`${label} `)
                  .run();
                setPickerOpen(false);
                prevQueryRef.current = "";
              }
              return true;
            }
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setPickerOpen(false);
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
        syncMention(ed);
      },
      onSelectionUpdate: ({ editor: ed }) => {
        syncMention(ed);
      },
    });

    editorRef.current = editor;

    useEffect(() => {
      if (!editor) return;
      const current = editor.getHTML();
      const next = value || "";
      if (
        current !== next &&
        !(isCommentContentEmpty(current) && isCommentContentEmpty(next))
      ) {
        editor.commands.setContent(next || "<p></p>", { emitUpdate: false });
      }
    }, [editor, value]);

    useEffect(() => {
      if (!editor) return;
      editor.setEditable(!disabled);
    }, [editor, disabled]);

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

    const openMentionPicker = useCallback(() => {
      const ed = editorRef.current;
      if (!ed) return;
      ed.chain().focus().insertContent("@").run();
      setMentionQuery("");
      prevQueryRef.current = "";
      setActiveIndex(0);
      setPickerOpen(true);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        openMentionPicker,
        focus: () => editorRef.current?.commands.focus(),
        isEmpty: () =>
          isCommentContentEmpty(editorRef.current?.getHTML() ?? value),
      }),
      [openMentionPicker, value],
    );

    function setLink() {
      if (!editor) return;
      const previous = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt("Link URL", previous ?? "https://");
      if (url == null) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    }

    return (
      <div
        ref={wrapRef}
        className={`overflow-hidden rounded-[10px] border border-bb-border bg-white focus-within:border-bb-blue ${className}`}
      >
        <div className="flex flex-wrap items-center gap-0.5 border-b border-bb-border/70 bg-bb-sky/30 px-2 py-1">
          <ToolbarButton
            label="Bold"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-3.5 w-3.5" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-3.5 w-3.5" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-3.5 w-3.5" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-3.5 w-3.5" aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Link"
            active={editor?.isActive("link")}
            onClick={setLink}
          >
            <LinkIcon className="h-3.5 w-3.5" aria-hidden />
          </ToolbarButton>
        </div>

        <div className="relative">
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
          <EditorContent
            editor={editor}
            onKeyDown={onKeyDown}
            aria-autocomplete={pickerOpen ? "list" : undefined}
            aria-expanded={pickerOpen || undefined}
          />
        </div>
      </div>
    );
  },
);
