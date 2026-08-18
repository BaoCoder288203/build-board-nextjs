"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import type { MeetingParticipant } from "@/lib/realtime/events";
import {
  CHESS_TABLE,
  CHESS_THEME,
  CHESS_TOKEN,
} from "../constants/chess.constants";
import { fenAtPly, needsPromotion, previewMove } from "../engine/preview";
import { chessActions } from "../hooks/useChessActions";
import { playChessSfx } from "../sound/chessSound";
import { useChessSound } from "../sound/useChessSound";
import { useChessStore } from "../store/chessStore";
import type { ChessPromotion } from "../types/game.types";
import { castleRookMove } from "../utils/boardUtils";
import { isChessHost, myChessPlayer, playerByColor, roomPhase } from "../utils/playerUtils";
import { preloadChessPieces } from "../utils/pieceAssets";
import { ChessBoard } from "./ChessBoard";
import { ChessLobby } from "./ChessLobby";
import { ChessMoveList } from "./ChessMoveList";
import { ChessPlayerBar } from "./ChessPlayerBar";
import { ChessResult } from "./ChessResult";

export function ChessGame({
  meId,
  participants,
  onLeaveGame,
  onInvite,
  busy,
}: {
  meId: string | null;
  participants: MeetingParticipant[];
  onLeaveGame: () => void;
  onInvite: (userIds: string[]) => void;
  busy: boolean;
}) {
  const room = useChessStore((s) => s.room);
  const game = useChessStore((s) => s.game);
  const lastError = useChessStore((s) => s.lastError);
  const previewPly = useChessStore((s) => s.previewPly);
  const optimistic = useChessStore((s) => s.optimistic);
  const boardTheme = useChessStore((s) => s.boardTheme);
  const setBoardTheme = useChessStore((s) => s.setBoardTheme);
  const setOptimistic = useChessStore((s) => s.setOptimistic);
  const setPreviewPly = useChessStore((s) => s.setPreviewPly);
  const { muted, toggleMute } = useChessSound();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const lastSeq = useRef<number>(-1);
  const lastCritical = useRef(false);

  useEffect(() => {
    void preloadChessPieces();
  }, []);

  const me = myChessPlayer(room, meId);
  const host = isChessHost(room, meId);
  const phase = roomPhase(room, game?.status);
  const myColor = me?.color ?? null;
  const spectator = Boolean(me?.isSpectator) || (!me && Boolean(room));
  const flipped = myColor === "BLACK";
  const theme = CHESS_THEME[boardTheme];

  const displayFen = useMemo(() => {
    if (!game) return null;
    if (previewPly != null) return fenAtPly(game, previewPly);
    return optimistic?.fen ?? game.fen;
  }, [game, optimistic, previewPly]);

  const displayLastMove = useMemo(() => {
    if (!game) return null;
    if (previewPly != null) {
      const move = game.moves[previewPly - 1];
      return move ? { from: move.from, to: move.to, san: move.san, captured: move.captured, promotion: move.promotion } : null;
    }
    if (optimistic) {
      return {
        from: optimistic.from,
        to: optimistic.to,
        san: "",
        captured: optimistic.captured,
      };
    }
    return game.lastMove;
  }, [game, optimistic, previewPly]);

  useEffect(() => {
    if (!game) return;
    if (game.sequence === lastSeq.current) return;
    const prev = lastSeq.current;
    lastSeq.current = game.sequence;
    if (prev < 0) return;
    const move = game.lastMove;
    if (game.status === "FINISHED" || game.status === "ABORTED") {
      if (!game.winnerColor) playChessSfx("draw");
      else if (myColor && game.winnerColor === myColor) playChessSfx("win");
      else playChessSfx("lose");
      return;
    }
    if (!move) return;
    if (castleRookMove(move.from, move.to)) playChessSfx("castle");
    else if (move.captured) playChessSfx("capture");
    else playChessSfx("move");
    if (game.inCheck) playChessSfx("check");
  }, [game, myColor]);

  const whiteTime = useChessStore((s) => s.game?.clocks.whiteTimeMs ?? 0);
  const blackTime = useChessStore((s) => s.game?.clocks.blackTimeMs ?? 0);
  useEffect(() => {
    const running = game?.clocks.runningColor;
    const ms = running === "WHITE" ? whiteTime : running === "BLACK" ? blackTime : Infinity;
    const critical = ms < 10_000 && ms > 0;
    if (critical && !lastCritical.current) playChessSfx("tick");
    lastCritical.current = critical;
  }, [blackTime, game?.clocks.runningColor, whiteTime]);

  const submitMove = useCallback(
    (from: string, to: string, promotion?: ChessPromotion) => {
      if (!game || spectator || previewPly != null) return;
      if (needsPromotion(game.fen, from, to) && !promotion) return;
      const preview = previewMove(game.fen, from, to, promotion);
      if (preview) {
        setOptimistic({
          fen: preview.fen,
          from,
          to,
          captured: preview.captured,
        });
      }
      void chessActions.move(from, to, promotion);
    },
    [game, previewPly, setOptimistic, spectator],
  );

  if (!room) return null;

  const opponentColor = myColor === "BLACK" ? "WHITE" : "BLACK";
  const youColor = myColor ?? "WHITE";
  const opponent = playerByColor(room, opponentColor);
  const you = playerByColor(room, youColor);
  const drawOffer = game?.drawOffer;
  const offeredByMe = Boolean(
    drawOffer &&
      (drawOffer.byPlayerId === me?.playerId ||
        drawOffer.byUserId === meId ||
        drawOffer.byColor === myColor),
  );
  const offeredByOpp = Boolean(drawOffer && !offeredByMe);
  const playing = phase === "playing" && game && displayFen;
  const showResult = phase === "result" && !reviewing;

  return (
    <div
      data-chess-overlay
      className="chess-overlay flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 text-white"
      style={
        {
          background: `linear-gradient(165deg, ${CHESS_TABLE.from}, ${CHESS_TABLE.to})`,
          "--chess-light": theme.light,
          "--chess-dark": theme.dark,
          "--chess-selected": CHESS_TOKEN.selected,
          "--chess-last-move": CHESS_TOKEN.lastMove,
          "--chess-dot": CHESS_TOKEN.dot,
          "--chess-check": CHESS_TOKEN.check,
        } as CSSProperties
      }
    >
      <style>{`
        @keyframes chess-clock-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.18); }
        }
        @media (prefers-reduced-motion: reduce) {
          .chess-overlay [style*="chess-clock-pulse"] { animation: none !important; }
        }
      `}</style>
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="text-sm font-semibold tracking-wide">Chess</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="onDarkGhost"
            size="sm"
            onClick={toggleMute}
            aria-label={muted ? "Unmute game sound" : "Mute game sound"}
          >
            {muted ? "SFX off" : "SFX on"}
          </Button>
          <Button type="button" variant="onDarkGhost" size="sm" onClick={onLeaveGame}>
            Leave Game
          </Button>
        </div>
      </div>
      {lastError ? (
        <p className="px-3 py-1 text-xs text-amber-200">{lastError.message}</p>
      ) : null}
      {previewPly != null ? (
        <div className="flex items-center justify-between gap-2 border-b border-amber-300/20 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-50">
          <span>Reviewing — return to live</span>
          <Button type="button" variant="onDarkGhost" size="sm" onClick={() => { setPreviewPly(null); setReviewing(false); }}>
            Live
          </Button>
        </div>
      ) : null}

      <div className={`min-h-0 flex-1 ${playing || reviewing ? "overflow-hidden" : "overflow-auto"}`}>
        {showResult ? (
          <div className="flex h-full items-center justify-center p-4">
            <ChessResult
              room={room}
              game={game}
              myColor={myColor}
              onRematch={() => void chessActions.rematch()}
              onReview={() => {
                setReviewing(true);
                setPreviewPly(game?.moves.length ?? 0);
              }}
              onLeaveGame={onLeaveGame}
            />
          </div>
        ) : playing || reviewing && game && displayFen ? (
          <div className="flex h-full min-h-0 flex-col gap-2 p-3 lg:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <ChessPlayerBar
                player={opponent}
                color={opponentColor}
                fen={displayFen!}
              />
              <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size]">
                <div
                  className="relative max-h-full max-w-full"
                  style={{
                    width: "min(100cqw, 100cqh)",
                    height: "min(100cqw, 100cqh)",
                  }}
                >
                  <ChessBoard
                    fen={displayFen!}
                    flipped={flipped}
                    myColor={spectator || previewPly != null ? null : myColor}
                    interactive={
                      Boolean(
                        interactiveTurn(
                          game?.turn,
                          myColor,
                          spectator,
                          previewPly,
                          game?.status,
                        ),
                      )
                    }
                    lastMove={displayLastMove}
                    inCheck={previewPly != null ? false : Boolean(game?.inCheck)}
                    onMove={submitMove}
                  />
                </div>
              </div>
              <ChessPlayerBar
                player={you}
                color={youColor}
                fen={displayFen!}
                you
              />
              {!spectator && previewPly == null && game?.status !== "FINISHED" ? (
                <div className="flex flex-wrap items-center gap-2">
                  {confirmResign ? (
                    <>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setConfirmResign(false);
                          void chessActions.resign();
                        }}
                      >
                        Confirm Resign
                      </Button>
                      <Button
                        type="button"
                        variant="onDarkGhost"
                        size="sm"
                        onClick={() => setConfirmResign(false)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmResign(true)}
                    >
                      Resign
                    </Button>
                  )}
                  {offeredByOpp ? (
                    <>
                      <Button
                        type="button"
                        variant="onDark"
                        size="sm"
                        onClick={() => void chessActions.respondDraw(true)}
                      >
                        Accept Draw
                      </Button>
                      <Button
                        type="button"
                        variant="onDarkGhost"
                        size="sm"
                        onClick={() => void chessActions.respondDraw(false)}
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="onDarkGhost"
                      size="sm"
                      disabled={offeredByMe}
                      onClick={() => void chessActions.offerDraw()}
                    >
                      {offeredByMe ? "Draw offered" : "Offer Draw"}
                    </Button>
                  )}
                  <div className="relative ml-auto">
                    <Button
                      type="button"
                      variant="onDarkGhost"
                      size="sm"
                      onClick={() => setSettingsOpen((v) => !v)}
                    >
                      Settings
                    </Button>
                    {settingsOpen ? (
                      <div className="absolute bottom-full right-0 z-20 mb-1 w-44 overflow-hidden rounded-lg border border-white/15 bg-black/90 p-2 shadow-lg">
                        <button
                          type="button"
                          className="block w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold hover:bg-white/10"
                          onClick={toggleMute}
                        >
                          Sound: {muted ? "Off" : "On"}
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold hover:bg-white/10"
                          onClick={() =>
                            setBoardTheme(boardTheme === "classic" ? "wood" : "classic")
                          }
                        >
                          Board: {boardTheme === "classic" ? "Classic" : "Wood"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="hidden min-h-0 w-52 shrink-0 lg:flex">
              {game ? <ChessMoveList game={game} /> : null}
            </div>
          </div>
        ) : (
          <ChessLobby
            room={room}
            isHost={host}
            meReady={Boolean(me?.isReady)}
            participants={participants}
            busy={busy}
            onInvite={onInvite}
          />
        )}
      </div>
    </div>
  );
}

function interactiveTurn(
  turn: string | undefined,
  myColor: string | null,
  spectator: boolean,
  previewPly: number | null,
  status?: string,
) {
  if (spectator || previewPly != null) return false;
  if (status && status !== "PLAYING" && status !== "WAITING_FOR_DRAW") return false;
  return Boolean(turn && myColor && turn === myColor);
}
