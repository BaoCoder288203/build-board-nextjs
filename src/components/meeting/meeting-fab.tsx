"use client";

import { LogIn, LogOut, PhoneOff, Video } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const FAB_SIZE = 52;
const EDGE_PAD = 16;
const STORAGE_KEY = "bb.meeting-fab.edge";

type EdgeSide = "left" | "right" | "top" | "bottom";

type FabEdgePos = {
  side: EdgeSide;
  /** Offset along the edge from the start (top for left/right, left for top/bottom) */
  offset: number;
};

type MeetingFabProps = {
  busy?: boolean;
  hasActiveMeeting: boolean;
  isInMeeting: boolean;
  isHost: boolean;
  participantCount?: number;
  onStart: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onEnd?: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function loadSavedPos(): FabEdgePos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { side: "right", offset: -1 };
    const parsed = JSON.parse(raw) as FabEdgePos;
    if (
      parsed &&
      (parsed.side === "left" ||
        parsed.side === "right" ||
        parsed.side === "top" ||
        parsed.side === "bottom") &&
      typeof parsed.offset === "number"
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return { side: "right", offset: -1 };
}

function edgeToXY(pos: FabEdgePos, vw: number, vh: number) {
  const maxX = Math.max(EDGE_PAD, vw - FAB_SIZE - EDGE_PAD);
  const maxY = Math.max(EDGE_PAD, vh - FAB_SIZE - EDGE_PAD);
  const defaultBottom = Math.max(EDGE_PAD, vh - FAB_SIZE - EDGE_PAD - 24);

  if (pos.side === "left") {
    const y =
      pos.offset < 0 ? defaultBottom : clamp(pos.offset, EDGE_PAD, maxY);
    return { x: EDGE_PAD, y };
  }
  if (pos.side === "right") {
    const y =
      pos.offset < 0 ? defaultBottom : clamp(pos.offset, EDGE_PAD, maxY);
    return { x: maxX, y };
  }
  if (pos.side === "top") {
    const x =
      pos.offset < 0 ? maxX : clamp(pos.offset, EDGE_PAD, maxX);
    return { x, y: EDGE_PAD };
  }
  const x = pos.offset < 0 ? maxX : clamp(pos.offset, EDGE_PAD, maxX);
  return { x, y: maxY };
}

function snapToNearestEdge(x: number, y: number, vw: number, vh: number): FabEdgePos {
  const cx = x + FAB_SIZE / 2;
  const cy = y + FAB_SIZE / 2;
  const distLeft = cx;
  const distRight = vw - cx;
  const distTop = cy;
  const distBottom = vh - cy;
  const min = Math.min(distLeft, distRight, distTop, distBottom);

  if (min === distLeft) {
    return { side: "left", offset: clamp(y, EDGE_PAD, vh - FAB_SIZE - EDGE_PAD) };
  }
  if (min === distRight) {
    return { side: "right", offset: clamp(y, EDGE_PAD, vh - FAB_SIZE - EDGE_PAD) };
  }
  if (min === distTop) {
    return { side: "top", offset: clamp(x, EDGE_PAD, vw - FAB_SIZE - EDGE_PAD) };
  }
  return { side: "bottom", offset: clamp(x, EDGE_PAD, vw - FAB_SIZE - EDGE_PAD) };
}

export function MeetingFab({
  busy = false,
  hasActiveMeeting,
  isInMeeting,
  isHost,
  participantCount = 0,
  onStart,
  onJoin,
  onLeave,
  onEnd,
}: MeetingFabProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [animate, setAnimate] = useState(false);
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    pointerId: -1,
  });
  const edgeRef = useRef<FabEdgePos>(loadSavedPos());
  const rafRef = useRef<number | null>(null);
  const pendingXY = useRef({ x: 0, y: 0 });

  const applyEdge = useCallback((edge: FabEdgePos, withAnim: boolean) => {
    edgeRef.current = edge;
    const next = edgeToXY(edge, window.innerWidth, window.innerHeight);
    setAnimate(withAnim);
    setPos(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(edge));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    applyEdge(edgeRef.current, false);
    setReady(true);
    const onResize = () => applyEdge(edgeRef.current, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [applyEdge]);

  const flushDragPos = useCallback(() => {
    rafRef.current = null;
    setPos({ ...pendingXY.current });
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      dragRef.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
        pointerId: e.pointerId,
      };
      setAnimate(false);
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pos.x, pos.y],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && dx * dx + dy * dy > 16) d.moved = true;

      const maxX = window.innerWidth - FAB_SIZE - EDGE_PAD;
      const maxY = window.innerHeight - FAB_SIZE - EDGE_PAD;
      pendingXY.current = {
        x: clamp(d.originX + dx, EDGE_PAD, maxX),
        y: clamp(d.originY + dy, EDGE_PAD, maxY),
      };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushDragPos);
      }
    },
    [flushDragPos],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;
      d.active = false;
      setDragging(false);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setPos({ ...pendingXY.current });
      }

      const snapped = snapToNearestEdge(
        pendingXY.current.x || pos.x,
        pendingXY.current.y || pos.y,
        window.innerWidth,
        window.innerHeight,
      );
      applyEdge(snapped, true);

      if (!d.moved) {
        // treat as click
        if (busy) return;
        if (!hasActiveMeeting) onStart();
        else if (!isInMeeting) onJoin();
        else onLeave();
      }
    },
    [
      applyEdge,
      busy,
      hasActiveMeeting,
      isInMeeting,
      onJoin,
      onLeave,
      onStart,
      pos.x,
      pos.y,
    ],
  );

  if (!ready) return null;

  const label = !hasActiveMeeting
    ? "Start meeting"
    : !isInMeeting
      ? "Join meeting"
      : "Leave meeting";

  const Icon = !hasActiveMeeting ? Video : !isInMeeting ? LogIn : LogOut;

  return (
    <div
      className={`pointer-events-none fixed z-[45] ${
        animate
          ? "transition-[left,top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          : ""
      }`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="pointer-events-auto relative">
        <button
          type="button"
          disabled={busy}
          aria-label={label}
          title={label}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`relative flex h-[52px] w-[52px] touch-none items-center justify-center rounded-full border shadow-bb-lg transition-[transform,box-shadow] duration-200 will-change-transform ${
            dragging ? "scale-105 cursor-grabbing shadow-xl" : "cursor-grab"
          } ${
            isInMeeting
              ? "border-emerald-300/50 bg-emerald-600 text-white"
              : hasActiveMeeting
                ? "border-bb-blue/40 bg-bb-blue text-white"
                : "border-white/20 bg-bb-ink text-white"
          } ${busy ? "opacity-60" : "hover:brightness-110"}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          {hasActiveMeeting && participantCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {participantCount > 9 ? "9+" : participantCount}
            </span>
          ) : null}
        </button>

        {isHost && isInMeeting && onEnd ? (
          <button
            type="button"
            disabled={busy}
            aria-label="End meeting for everyone"
            title="End call"
            onClick={() => onEnd()}
            className="absolute -left-1 top-full mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-red-300/60 bg-red-600 text-white shadow-md hover:brightness-110 disabled:opacity-60"
          >
            <PhoneOff className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
