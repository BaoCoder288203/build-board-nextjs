"use client";

import { useEffect, useRef } from "react";
import { fenAtPly, pairedMoves, recordsFromPgn } from "../engine/preview";
import { useChessStore } from "../store/chessStore";
import type { PublicChessGame } from "../types/game.types";

export function ChessMoveList({ game }: { game: PublicChessGame }) {
  const previewPly = useChessStore((s) => s.previewPly);
  const setPreviewPly = useChessStore((s) => s.setPreviewPly);
  const scroller = useRef<HTMLDivElement>(null);
  const records = game.moves.length ? game.moves : recordsFromPgn(game.pgn);
  const rows = pairedMoves(records);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [records.length]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-lg border border-white/10 bg-black/25">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="text-xs font-bold uppercase tracking-wide text-white/70">Moves</p>
        {previewPly != null ? (
          <button
            type="button"
            className="text-[11px] font-semibold text-amber-200 hover:underline"
            onClick={() => setPreviewPly(null)}
          >
            Return to live
          </button>
        ) : null}
      </div>
      {previewPly != null ? (
        <p className="px-3 py-1 text-[11px] text-amber-100">
          Reviewing ply {previewPly} — {fenAtPly(game, previewPly).split(" ")[0]}
        </p>
      ) : null}
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-1 py-1">
        {rows.length === 0 ? (
          <p className="px-2 py-3 text-xs text-white/50">No moves yet.</p>
        ) : (
          <ol className="text-sm text-white">
            {rows.map((row) => (
              <li key={row.number} className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-1 rounded px-1 py-0.5 hover:bg-white/5">
                <span className="text-xs text-white/50">{row.number}.</span>
                {row.white ? (
                  <button
                    type="button"
                    className={`rounded px-1 text-left font-medium ${
                      previewPly === row.white.ply ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                    onClick={() => setPreviewPly(row.white!.ply)}
                  >
                    {row.white.san}
                  </button>
                ) : (
                  <span />
                )}
                {row.black ? (
                  <button
                    type="button"
                    className={`rounded px-1 text-left font-medium ${
                      previewPly === row.black.ply ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                    onClick={() => setPreviewPly(row.black!.ply)}
                  >
                    {row.black.san}
                  </button>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
