"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import type { PlayerGameView, PublicUnoRoom } from "../types/game.types";
import { opponentSlots } from "../utils/seatLayout";
import { seatAnchorId } from "../motion/unoAnchors";
import { UnoCardBack } from "./UnoCardBack";

export function OpponentArea({
  room,
  game,
  myUserId,
}: {
  room: PublicUnoRoom;
  game: PlayerGameView;
  myUserId: string | null;
}) {
  const slots = opponentSlots(room.players, myUserId);

  return (
    <>
      {slots.map((slot) => {
        const view = game.players.find((p) => p.playerId === slot.player.playerId);
        const isTurn = game.currentPlayerId === slot.player.playerId;
        const count = view?.cardCount ?? 0;
        const stack = Math.min(count, 3);
        return (
          <div
            key={slot.player.playerId}
            className="absolute z-[5] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: slot.left, top: slot.top }}
          >
            <div
              data-uno-seat={slot.player.playerId}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2.5 py-1.5 ${
                isTurn
                  ? "bg-white/10 ring-2 ring-[#FFC93C] ring-offset-2 ring-offset-transparent"
                  : "bg-black/20"
              }`}
              style={
                isTurn
                  ? { boxShadow: "0 0 18px rgba(255, 201, 60, 0.45)" }
                  : undefined
              }
            >
              <div className="flex items-center gap-1.5">
                <UserAvatar
                  name={slot.player.displayName}
                  avatarUrl={slot.player.avatarUrl}
                  size="sm"
                  fallbackClassName="bg-[#3B82F6] text-white"
                />
                <p className="max-w-[88px] truncate text-[11px] font-bold text-white">
                  {slot.player.displayName}
                  {view?.calledUno ? " · UNO" : ""}
                </p>
              </div>
              <div className="relative h-[3.5rem] w-[2.8rem]">
                {stack === 0 ? (
                  <UnoCardBack
                    variant="opponent"
                    count={0}
                    anchorId={seatAnchorId(slot.player.playerId)}
                  />
                ) : (
                  Array.from({ length: stack }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 top-0"
                      style={{
                        transform: `translate(${i * 3}px, ${i * -3}px)`,
                        zIndex: i,
                      }}
                    >
                      <UnoCardBack
                        variant="opponent"
                        count={i === stack - 1 ? count : undefined}
                        anchorId={
                          i === stack - 1
                            ? seatAnchorId(slot.player.playerId)
                            : undefined
                        }
                      />
                    </div>
                  ))
                )}
              </div>
              {slot.player.connectionStatus === "DISCONNECTED" ? (
                <p className="text-[10px] text-amber-200">Reconnecting…</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
