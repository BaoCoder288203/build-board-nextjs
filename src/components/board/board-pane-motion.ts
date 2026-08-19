"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState, type RefObject } from "react";
import { prefersReducedMotion } from "@/lib/board-transition";
import type { BoardPaneState } from "./board-panes";

gsap.registerPlugin(useGSAP);

export const PANE_MOTION = {
  duration: 0.42,
  ease: "power3.inOut",
} as const;

type SplitLayout = { planner: number; board: number };

export function chromeCoverFor(panes: BoardPaneState) {
  return panes.board && !panes.planner ? 1 : 0;
}

export function layoutFromPanes(
  panes: BoardPaneState,
  lastSplit: SplitLayout | null,
): SplitLayout {
  if (panes.planner && panes.board) {
    if (
      lastSplit &&
      lastSplit.planner > 8 &&
      lastSplit.board > 8
    ) {
      return lastSplit;
    }
    return { planner: 50, board: 50 };
  }
  if (panes.planner) return { planner: 100, board: 0 };
  return { planner: 0, board: 100 };
}

export function isUsableSplit(layout: { [id: string]: number } | undefined) {
  const planner = layout?.planner ?? 0;
  const board = layout?.board ?? 0;
  return planner > 8 && board > 8;
}

function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

export function themeClipPath(
  shell: DOMRect,
  board: DOMRect,
  chromeCover: number,
) {
  const left = lerp(Math.max(0, board.left - shell.left), 0, chromeCover);
  const top = lerp(Math.max(0, board.top - shell.top), 0, chromeCover);
  const right = lerp(Math.max(0, shell.right - board.right), 0, chromeCover);
  const bottom = lerp(Math.max(0, shell.bottom - board.bottom), 0, chromeCover);
  return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
}

export function applyThemeClip(
  theme: HTMLElement,
  shell: HTMLElement,
  board: HTMLElement,
  chromeCover: number,
) {
  theme.style.clipPath = themeClipPath(
    shell.getBoundingClientRect(),
    board.getBoundingClientRect(),
    chromeCover,
  );
}

type GroupHandle = {
  getLayout: () => { [panelId: string]: number };
  setLayout: (layout: { [panelId: string]: number }) => unknown;
};

export function useBoardPaneMotion({
  panes,
  boardId,
  active,
  groupRef,
  shellRef,
  themeRef,
  boardPanelRef,
  savedSplitLayout,
}: {
  panes: BoardPaneState;
  boardId: string;
  active: boolean;
  groupRef: RefObject<GroupHandle | null>;
  shellRef: RefObject<HTMLElement | null>;
  themeRef: RefObject<HTMLElement | null>;
  boardPanelRef: RefObject<HTMLElement | null>;
  savedSplitLayout?: { [id: string]: number };
}) {
  const [layoutAnimating, setLayoutAnimating] = useState(false);
  const lastSplitRef = useRef<SplitLayout | null>(
    isUsableSplit(savedSplitLayout)
      ? {
          planner: savedSplitLayout!.planner,
          board: savedSplitLayout!.board,
        }
      : null,
  );
  const chromeCoverRef = useRef(chromeCoverFor(panes));
  const readyRef = useRef(false);
  const boardIdRef = useRef(boardId);
  const splitOpenRef = useRef(Boolean(panes.planner && panes.board));
  const [splitOpen, setSplitOpen] = useState(() =>
    Boolean(panes.planner && panes.board),
  );

  function noteLayout(layout: { [id: string]: number } | undefined) {
    const open = isUsableSplit(layout);
    if (open !== splitOpenRef.current) {
      splitOpenRef.current = open;
      setSplitOpen(open);
    }
  }

  function syncThemeClip(chrome = chromeCoverRef.current) {
    const theme = themeRef.current;
    const shell = shellRef.current;
    const board = boardPanelRef.current;
    if (!theme || !shell || !board) return;
    applyThemeClip(theme, shell, board, chrome);
  }

  useGSAP(
    () => {
      if (!active) return;
      const board = boardPanelRef.current;
      const shell = shellRef.current;
      if (!board) return;
      const ro = new ResizeObserver(() => syncThemeClip());
      ro.observe(board);
      if (shell) ro.observe(shell);
      return () => ro.disconnect();
    },
    { dependencies: [active, boardId] },
  );

  useGSAP(
    (_context) => {
      if (!active) return;

      if (boardIdRef.current !== boardId) {
        boardIdRef.current = boardId;
        readyRef.current = false;
      }

      if (isUsableSplit(savedSplitLayout) && !lastSplitRef.current) {
        lastSplitRef.current = {
          planner: savedSplitLayout!.planner,
          board: savedSplitLayout!.board,
        };
      }

      const group = groupRef.current;
      const theme = themeRef.current;
      const shell = shellRef.current;
      const boardEl = boardPanelRef.current;
      if (!group || !theme || !shell || !boardEl) return;

      const startAnim = () => setLayoutAnimating(true);
      const stopAnim = () => setLayoutAnimating(false);

      const current = group.getLayout();
      const fromPlanner = Number.isFinite(current.planner)
        ? current.planner
        : layoutFromPanes(panes, lastSplitRef.current).planner;
      const to = layoutFromPanes(panes, lastSplitRef.current);
      const chromeTo = chromeCoverFor(panes);

      const apply = (planner: number, chrome: number) => {
        const next = group.setLayout({ planner, board: 100 - planner }) as
          | { [id: string]: number }
          | undefined;
        const applied = {
          planner: next?.planner ?? planner,
          board: next?.board ?? 100 - planner,
        };
        noteLayout(applied);
        chromeCoverRef.current = chrome;
        applyThemeClip(theme, shell, boardEl, chrome);
      };

      const skipTween = !readyRef.current || prefersReducedMotion();
      readyRef.current = true;

      if (skipTween) {
        apply(to.planner, chromeTo);
        stopAnim();
        return;
      }

      startAnim();
      const proxy = { planner: fromPlanner, chrome: chromeCoverRef.current };
      const tween = gsap.to(proxy, {
        planner: to.planner,
        chrome: chromeTo,
        duration: PANE_MOTION.duration,
        ease: PANE_MOTION.ease,
        onUpdate: () => apply(proxy.planner, proxy.chrome),
        onComplete: () => {
          apply(to.planner, chromeTo);
          stopAnim();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => syncThemeClip(chromeTo));
          });
        },
      });

      const onResize = () => syncThemeClip();
      window.addEventListener("resize", onResize);

      return () => {
        tween.kill();
        window.removeEventListener("resize", onResize);
      };
    },
    { dependencies: [panes.planner, panes.board, boardId, active] },
  );

  return {
    layoutAnimating,
    lastSplitRef,
    syncThemeClip,
    splitOpen,
    noteLayout,
    prepareMotion: () => setLayoutAnimating(true),
  };
}
