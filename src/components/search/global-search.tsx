"use client";

import {
  FolderKanban,
  LayoutGrid,
  MessageSquare,
  Search,
  UserRound,
  CheckSquare,
  Loader2,
} from "lucide-react";
import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import {
  globalSearch,
  type GlobalSearchResult,
  type SearchBoardHit,
  type SearchCommentHit,
  type SearchMemberHit,
  type SearchProjectHit,
  type SearchTaskHit,
} from "@/lib/search";
import { toastFromError } from "@/lib/toast";

type OriginRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function workspaceIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/workspaces\/([^/]+)/);
  return m?.[1];
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function toOrigin(el: HTMLElement | null): OriginRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
  };
}

function hrefForHit(
  hit:
    | SearchProjectHit
    | SearchBoardHit
    | SearchTaskHit
    | SearchCommentHit
    | SearchMemberHit,
): string {
  switch (hit.type) {
    case "project":
      return `/projects/${hit.id}`;
    case "board":
      return `/boards/${hit.id}`;
    case "task":
    case "comment":
      return `/boards/${hit.boardId}`;
    case "member":
      return `/workspaces/${hit.workspaceId}`;
  }
}

type FlatHit =
  | SearchProjectHit
  | SearchBoardHit
  | SearchTaskHit
  | SearchCommentHit
  | SearchMemberHit;

function flattenResults(data: GlobalSearchResult): FlatHit[] {
  return [
    ...data.tasks,
    ...data.projects,
    ...data.boards,
    ...data.comments,
    ...data.members,
  ];
}

function HitIcon({ type }: { type: FlatHit["type"] }) {
  const cls = "h-4 w-4 shrink-0 text-bb-muted";
  switch (type) {
    case "project":
      return <FolderKanban className={cls} strokeWidth={2} aria-hidden />;
    case "board":
      return <LayoutGrid className={cls} strokeWidth={2} aria-hidden />;
    case "task":
      return <CheckSquare className={cls} strokeWidth={2} aria-hidden />;
    case "comment":
      return <MessageSquare className={cls} strokeWidth={2} aria-hidden />;
    case "member":
      return <UserRound className={cls} strokeWidth={2} aria-hidden />;
  }
}

function hitTitle(hit: FlatHit): string {
  switch (hit.type) {
    case "project":
      return hit.name;
    case "board":
      return hit.name;
    case "task":
      return `${hit.code} ${hit.title}`;
    case "comment":
      return hit.content;
    case "member":
      return hit.user.fullName;
  }
}

function hitSubtitle(hit: FlatHit): string {
  switch (hit.type) {
    case "project":
      return `${hit.workspaceName} · Project`;
    case "board":
      return `${hit.projectName} · Board`;
    case "task":
      return `${hit.projectName} · ${hit.boardName}`;
    case "comment":
      return `Comment on ${hit.taskCode} ${hit.taskTitle}`;
    case "member":
      return `${hit.workspaceName} · ${hit.roleName}`;
  }
}

export function GlobalSearchButton({
  className = "",
  bindShortcut = true,
  fullWidth = false,
}: {
  className?: string;
  bindShortcut?: boolean;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<OriginRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openSearch = useCallback(() => {
    setOrigin(toOrigin(triggerRef.current));
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!bindShortcut) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openSearch, bindShortcut]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openSearch}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border border-bb-border/80 bg-bb-surface px-2.5 text-sm text-bb-muted transition hover:border-bb-blue hover:text-bb-blue sm:px-3 ${
          fullWidth ? "w-full min-w-0" : "sm:min-w-[180px]"
        } ${className}`}
        aria-label="Search"
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        <span className={fullWidth ? "truncate" : "hidden sm:inline"}>
          Search…
        </span>
        <kbd className="ml-auto hidden rounded border border-bb-border bg-bb-sky px-1.5 py-0.5 text-[10px] font-semibold text-bb-muted sm:inline">
          ⌘K
        </kbd>
      </button>
      <GlobalSearchDialog
        open={open}
        origin={origin}
        getCloseOrigin={() => toOrigin(triggerRef.current)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function GlobalSearchDialog({
  open,
  origin,
  getCloseOrigin,
  onClose,
}: {
  open: boolean;
  origin: OriginRect | null;
  getCloseOrigin?: () => OriginRect | null;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const listId = useId();
  const workspaceId = workspaceIdFromPath(pathname);

  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestId = useRef(0);

  const hits = results ? flattenResults(results) : [];

  const requestClose = useCallback(() => {
    if (closingRef.current) return;

    const backdrop = backdropRef.current;
    const ghost = ghostRef.current;
    const panel = panelRef.current;
    const content = contentRef.current;
    const target = getCloseOrigin?.() ?? origin;

    if (
      prefersReducedMotion() ||
      !backdrop ||
      !ghost ||
      !panel ||
      !target
    ) {
      onClose();
      return;
    }

    closingRef.current = true;
    const from = panel.getBoundingClientRect();

    gsap.killTweensOf([backdrop, ghost, panel, content]);
    gsap.set(content, { opacity: 0 });
    gsap.set(panel, { opacity: 0 });
    gsap.set(ghost, {
      opacity: 1,
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      borderRadius: 12,
    });

    gsap
      .timeline({
        onComplete: () => {
          closingRef.current = false;
          onClose();
        },
      })
      .to(backdrop, { opacity: 0, duration: 0.2, ease: "power2.in" }, 0)
      .to(
        ghost,
        {
          left: target.left,
          top: target.top,
          width: target.width,
          height: target.height,
          borderRadius: 8,
          duration: 0.28,
          ease: "power2.in",
        },
        0,
      );
  }, [getCloseOrigin, onClose, origin]);

  useEffect(() => {
    if (!open) return;
    setKeyword("");
    setResults(null);
    setActiveIndex(0);
    closingRef.current = false;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  useLayoutEffect(() => {
    if (!open) return;

    const backdrop = backdropRef.current;
    const ghost = ghostRef.current;
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!backdrop || !ghost || !panel || !content) return;

    const to = panel.getBoundingClientRect();
    const from =
      origin && origin.width >= 24 && origin.height >= 16
        ? origin
        : {
            left: to.left + to.width / 2 - 48,
            top: Math.max(16, to.top),
            width: 96,
            height: 36,
          };

    if (prefersReducedMotion()) {
      gsap.set(backdrop, { opacity: 1 });
      gsap.set(ghost, { opacity: 0 });
      gsap.set(panel, { opacity: 1 });
      gsap.set(content, { opacity: 1 });
      inputRef.current?.focus();
      return;
    }

    gsap.killTweensOf([backdrop, ghost, panel, content]);
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(panel, { opacity: 0 });
    gsap.set(content, { opacity: 0 });
    gsap.set(ghost, {
      opacity: 1,
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      borderRadius: 8,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        inputRef.current?.focus();
      },
    });

    tl.to(backdrop, { opacity: 1, duration: 0.22, ease: "power2.out" }, 0);
    tl.to(
      ghost,
      {
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        borderRadius: 12,
        duration: 0.38,
        ease: "power3.out",
      },
      0,
    );
    tl.set(panel, { opacity: 1 });
    tl.set(ghost, { opacity: 0 });
    tl.to(content, { opacity: 1, duration: 0.16, ease: "power2.out" });

    return () => {
      tl.kill();
    };
  }, [open, origin]);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 1) {
        setResults(null);
        setLoading(false);
        return;
      }
      const id = ++requestId.current;
      setLoading(true);
      try {
        const data = await globalSearch({
          keyword: trimmed,
          workspaceId,
          limit: 6,
        });
        if (id !== requestId.current) return;
        setResults(data);
        setActiveIndex(0);
      } catch (error) {
        if (id !== requestId.current) return;
        toastFromError(error);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [workspaceId],
  );

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      void runSearch(keyword);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [keyword, open, runSearch]);

  function go(hit: FlatHit) {
    requestClose();
    // Navigate after close morph starts — short delay keeps feel smooth
    window.setTimeout(() => {
      router.push(hrefForHit(hit));
    }, 120);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (workspaceId && keyword.trim()) {
      const q = keyword.trim();
      requestClose();
      window.setTimeout(() => {
        router.push(
          `/workspaces/${workspaceId}/search?q=${encodeURIComponent(q)}`,
        );
      }, 120);
      return;
    }
    if (hits[activeIndex]) go(hits[activeIndex]);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]">
      <button
        ref={backdropRef}
        type="button"
        className="absolute inset-0 bg-bb-ink/40 opacity-0"
        aria-label="Close search"
        onClick={requestClose}
      />
      <div
        ref={ghostRef}
        aria-hidden
        className="pointer-events-none fixed z-[11] border border-bb-border/80 bg-bb-surface shadow-bb-lg opacity-0"
        style={{ left: 0, top: 0, width: 0, height: 0 }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-[12px] border border-bb-border/80 bg-bb-surface shadow-bb-lg opacity-0"
      >
        <div ref={contentRef} className="opacity-0">
          <form
            onSubmit={onSubmit}
            className="border-b border-bb-border/80 p-3"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bb-muted"
                strokeWidth={2}
                aria-hidden
              />
              <Input
                ref={inputRef}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) =>
                      hits.length ? Math.min(i + 1, hits.length - 1) : 0,
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  }
                }}
                placeholder={
                  workspaceId
                    ? "Search tasks, projects, boards…"
                    : "Search across your workspaces…"
                }
                className="pl-9 pr-10"
                aria-controls={listId}
                aria-autocomplete="list"
              />
              {loading ? (
                <Loader2
                  className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-bb-muted"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}
            </div>
            {workspaceId ? (
              <p className="mt-2 text-xs text-bb-muted">
                Scoped to this workspace · Enter opens full search
              </p>
            ) : (
              <p className="mt-2 text-xs text-bb-muted">
                Searching all workspaces you belong to
              </p>
            )}
          </form>

          <div
            id={listId}
            role="listbox"
            className="max-h-[50vh] overflow-y-auto"
          >
            {!keyword.trim() ? (
              <p className="px-4 py-8 text-center text-sm text-bb-muted">
                Type to search projects, boards, tasks, comments, and members.
              </p>
            ) : hits.length === 0 && !loading ? (
              <p className="px-4 py-8 text-center text-sm text-bb-muted">
                No results for “{keyword.trim()}”.
              </p>
            ) : (
              <ul className="py-1">
                {hits.map((hit, index) => (
                  <li key={`${hit.type}-${hit.id}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${
                        index === activeIndex
                          ? "bg-bb-sky"
                          : "hover:bg-bb-sky/50"
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(hit)}
                    >
                      <HitIcon type={hit.type} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-bb-ink">
                          {hitTitle(hit)}
                        </span>
                        <span className="block truncate text-xs text-bb-muted">
                          {hitSubtitle(hit)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-bb-muted">
                        {hit.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
