"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  castleRookMove,
  displaySquares,
  enPassantCaptureSquare,
  isLightSquare,
  pointToSquare,
  squareDeltaPx,
} from "../utils/boardUtils";
import {
  isLegalDestination,
  kingSquare,
  legalMovesFrom,
  needsPromotion,
  piecesFromFen,
} from "../engine/preview";
import {
  gsap,
  motionDuration,
  prefersReducedMotion,
  useGSAP,
} from "../motion/chessMotion";
import type { ChessColor } from "../types/player.types";
import type { ChessLastMove, ChessPieceType, ChessPromotion } from "../types/game.types";
import { ChessPiece, pieceTypeFromLetter } from "./ChessPiece";
import { ChessPromotionPicker } from "./ChessPromotionPicker";
import { ChessSquare } from "./ChessSquare";

type DragState = {
  square: string;
  x: number;
  y: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type CaptureFx = {
  key: string;
  type: ChessPieceType;
  color: ChessColor;
  captor: ChessColor;
  left: number;
  top: number;
  size: number;
};

export function ChessBoard({
  fen,
  flipped,
  myColor,
  interactive,
  lastMove,
  inCheck,
  onMove,
}: {
  fen: string;
  flipped: boolean;
  myColor: ChessColor | null;
  interactive: boolean;
  lastMove: ChessLastMove | null;
  inCheck: boolean;
  onMove: (from: string, to: string, promotion?: ChessPromotion) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const captureGhostRef = useRef<HTMLDivElement>(null);
  const animatedKey = useRef("");
  const captureKey = useRef("");
  const [selected, setSelected] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverSquare, setHoverSquare] = useState<string | null>(null);
  const [captureFx, setCaptureFx] = useState<CaptureFx | null>(null);
  const [squarePx, setSquarePx] = useState(56);

  const pieces = useMemo(() => piecesFromFen(fen), [fen]);
  const pieceMap = useMemo(() => {
    const map = new Map(pieces.map((p) => [p.square, p]));
    return map;
  }, [pieces]);
  const squares = useMemo(() => displaySquares(flipped), [flipped]);
  const legal = useMemo(
    () => (selected ? legalMovesFrom(fen, selected) : []),
    [fen, selected],
  );
  const legalTo = useMemo(() => new Set(legal.map((m) => m.to)), [legal]);
  const captureTo = useMemo(
    () => new Set(legal.filter((m) => m.captured).map((m) => m.to)),
    [legal],
  );

  const resolvedCheck = inCheck
    ? kingSquare(fen, fen.split(" ")[1] === "b" ? "BLACK" : "WHITE")
    : null;

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => setSquarePx(el.getBoundingClientRect().width / 8);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!lastMove) {
      captureKey.current = "";
      animatedKey.current = "";
      return;
    }
    if (!lastMove.captured || !boardRef.current) return;
    const key = `${lastMove.from}-${lastMove.to}-${lastMove.captured}:${fen}`;
    if (captureKey.current === key) return;
    if (prefersReducedMotion()) {
      captureKey.current = key;
      return;
    }

    const captureSquare =
      enPassantCaptureSquare(lastMove.from, lastMove.to, lastMove.captured) ?? lastMove.to;
    const squareEl = boardRef.current.querySelector<HTMLElement>(`[data-square="${captureSquare}"]`);
    if (!squareEl) return;
    const rect = squareEl.getBoundingClientRect();
    const size = rect.width * 0.86;
    const mover = pieceMap.get(lastMove.to);
    const capturedColor: ChessColor =
      mover?.color === "WHITE" ? "BLACK" : mover?.color === "BLACK" ? "WHITE" : "BLACK";

    captureKey.current = key;
    setCaptureFx({
      key,
      type: pieceTypeFromLetter(lastMove.captured),
      color: capturedColor,
      captor: capturedColor === "WHITE" ? "BLACK" : "WHITE",
      left: rect.left + (rect.width - size) / 2,
      top: rect.top + (rect.height - size) / 2,
      size,
    });
  }, [fen, lastMove, pieceMap]);

  useGSAP(
    () => {
      if (!lastMove || !boardRef.current) return;
      const key = `${lastMove.from}-${lastMove.to}-${lastMove.captured ?? ""}:${fen}`;
      if (animatedKey.current === key) return;
      animatedKey.current = key;
      if (prefersReducedMotion()) return;

      const size = boardRef.current.getBoundingClientRect().width / 8;
      const delta = squareDeltaPx(lastMove.from, lastMove.to, size, flipped);
      const mover = boardRef.current.querySelector<HTMLElement>(
        `[data-square="${lastMove.to}"] [data-chess-piece]`,
      );
      if (mover) {
        gsap.fromTo(
          mover,
          { x: -delta.x, y: -delta.y },
          { x: 0, y: 0, duration: motionDuration(0.24), ease: "power2.inOut" },
        );
      }

      const rook = castleRookMove(lastMove.from, lastMove.to);
      if (rook) {
        const rookEl = boardRef.current.querySelector<HTMLElement>(
          `[data-square="${rook.to}"] [data-chess-piece]`,
        );
        if (rookEl) {
          const rookDelta = squareDeltaPx(rook.from, rook.to, size, flipped);
          gsap.fromTo(
            rookEl,
            { x: -rookDelta.x, y: -rookDelta.y },
            { x: 0, y: 0, duration: motionDuration(0.24), ease: "power2.inOut" },
          );
        }
      }

      if (resolvedCheck) {
        const glow = boardRef.current.querySelector<HTMLElement>(
          `[data-square="${resolvedCheck}"]`,
        );
        if (glow) {
          gsap.fromTo(
            glow,
            { boxShadow: "inset 0 0 0 0 rgba(232,57,75,0)" },
            {
              boxShadow: "inset 0 0 0 3px #e8394b, 0 0 16px 3px rgba(232,57,75,0.7)",
              duration: 0.28,
              yoyo: true,
              repeat: 5,
              ease: "power1.inOut",
            },
          );
        }
      }
    },
    { dependencies: [fen, lastMove?.from, lastMove?.to, lastMove?.captured, flipped, resolvedCheck], scope: boardRef },
  );

  useGSAP(
    (_context, contextSafe) => {
      if (!captureFx) return;
      const finish = contextSafe ? contextSafe(() => setCaptureFx(null)) : () => setCaptureFx(null);

      const play = () => {
        const ghost = captureGhostRef.current;
        if (!ghost) return false;
        const tray = document.querySelector<HTMLElement>(
          `[data-chess-captured-tray="${captureFx.captor}"]`,
        );
        const from = ghost.getBoundingClientRect();
        let x = 0;
        let y = -28;
        if (tray) {
          const to = tray.getBoundingClientRect();
          x = to.left + Math.min(18, to.width / 2) - (from.left + from.width / 2);
          y = to.top + to.height / 2 - (from.top + from.height / 2);
        }
        gsap.fromTo(
          ghost,
          { opacity: 1, scale: 1, x: 0, y: 0 },
          {
            opacity: 0,
            scale: 0.35,
            x,
            y,
            duration: motionDuration(0.28),
            ease: "power2.in",
            onComplete: finish,
          },
        );
        return true;
      };

      if (play()) return;
      const frame = window.requestAnimationFrame(() => {
        if (!play()) finish();
      });
      return () => window.cancelAnimationFrame(frame);
    },
    { dependencies: [captureFx?.key], revertOnUpdate: true },
  );

  const commit = useCallback(
    (from: string, to: string) => {
      if (from === to) return;
      if (!isLegalDestination(fen, from, to)) return;
      if (needsPromotion(fen, from, to)) {
        setPromotion({ from, to });
        setSelected(null);
        return;
      }
      onMove(from, to);
      setSelected(null);
    },
    [fen, onMove],
  );

  const myTurnPiece = useCallback(
    (square: string) => {
      if (!interactive || !myColor) return false;
      const piece = pieceMap.get(square);
      return piece?.color === myColor;
    },
    [interactive, myColor, pieceMap],
  );

  const onPointerDown = useCallback(
    (square: string, event: PointerEvent<HTMLButtonElement>) => {
      if (!interactive) return;
      if (promotion) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (myTurnPiece(square)) {
        setSelected(square);
        setDrag({
          square,
          x: event.clientX,
          y: event.clientY,
          originX: event.clientX,
          originY: event.clientY,
          moved: false,
        });
        return;
      }
      if (selected && legalTo.has(square)) {
        commit(selected, square);
      } else {
        setSelected(null);
      }
    },
    [commit, interactive, legalTo, myTurnPiece, promotion, selected],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!drag) return;
      const dist = Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY);
      const nextMoved = drag.moved || dist > 6;
      setDrag({
        ...drag,
        x: event.clientX,
        y: event.clientY,
        moved: nextMoved,
      });
      if (boardRef.current) {
        setHoverSquare(
          pointToSquare(event.clientX, event.clientY, boardRef.current.getBoundingClientRect(), flipped),
        );
      }
    },
    [drag, flipped],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent) => {
      if (!drag) return;
      const target = boardRef.current
        ? pointToSquare(event.clientX, event.clientY, boardRef.current.getBoundingClientRect(), flipped)
        : null;
      if (drag.moved && target) {
        commit(drag.square, target);
      } else if (!drag.moved && target && target !== drag.square && selected && legalTo.has(target)) {
        commit(selected, target);
      }
      setDrag(null);
      setHoverSquare(null);
    },
    [commit, drag, flipped, legalTo, selected],
  );

  const dragPiece = drag ? pieceMap.get(drag.square) : null;
  const dragSize = Math.max(32, squarePx * 0.92);

  return (
    <div
      ref={boardRef}
      className="relative h-full w-full"
      style={{ touchAction: drag ? "none" : "auto" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        setDrag(null);
        setHoverSquare(null);
      }}
    >
      <div className="grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-[6px] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        {squares.map((square) => {
          const piece = pieceMap.get(square);
          const isFileEdge = flipped ? square[1] === "8" : square[1] === "1";
          const isRankEdge = flipped ? square[0] === "h" : square[0] === "a";
          const hiddenForDrag = Boolean(drag?.moved && drag.square === square);
          return (
            <ChessSquare
              key={square}
              square={square}
              isLight={isLightSquare(square)}
              selected={selected === square || (hoverSquare === square && Boolean(drag?.moved))}
              lastMove={lastMove?.from === square || lastMove?.to === square}
              legalEmpty={legalTo.has(square) && !piece}
              legalCapture={captureTo.has(square) && Boolean(piece)}
              inCheck={resolvedCheck === square}
              showFile={isFileEdge}
              showRank={isRankEdge}
              onPointerDown={(event) => onPointerDown(square, event)}
            >
              {piece && !hiddenForDrag ? (
                <ChessPiece
                  type={piece.type}
                  color={piece.color}
                  selected={selected === square}
                  dragging={drag?.square === square && drag.moved}
                />
              ) : null}
            </ChessSquare>
          );
        })}
      </div>

      {drag?.moved && dragPiece ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[70%]"
          style={{ left: drag.x, top: drag.y, width: dragSize, height: dragSize }}
        >
          <ChessPiece type={dragPiece.type} color={dragPiece.color} dragging />
        </div>
      ) : null}

      {lastMove?.captured ? (
        <span className="sr-only">Capture on {lastMove.to}</span>
      ) : null}

      {promotion ? (
        <ChessPromotionPicker
          square={promotion.to}
          color={myColor ?? "WHITE"}
          flipped={flipped}
          onPick={(piece) => {
            onMove(promotion.from, promotion.to, piece);
            setPromotion(null);
          }}
          onCancel={() => setPromotion(null)}
        />
      ) : null}

      {captureFx && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={captureGhostRef}
              data-chess-capture-ghost
              className="pointer-events-none fixed z-[90] will-change-transform"
              style={{
                left: captureFx.left,
                top: captureFx.top,
                width: captureFx.size,
                height: captureFx.size,
              }}
            >
              <ChessPiece type={captureFx.type} color={captureFx.color} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
