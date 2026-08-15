import type { PublicUnoPlayer } from "../types/player.types";
import type { UnoDirection } from "../types/game.types";

export type OpponentSlot = {
  player: PublicUnoPlayer;
  left: string;
  top: string;
};

export function orderedOpponents(
  players: PublicUnoPlayer[],
  myUserId: string | null,
) {
  const seated = players
    .filter((p) => !p.isSpectator)
    .sort((a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0));
  const meIdx = seated.findIndex((p) => p.userId === myUserId);
  if (meIdx < 0) return seated;
  return [...seated.slice(meIdx + 1), ...seated.slice(0, meIdx)];
}

export function opponentSlots(
  players: PublicUnoPlayer[],
  myUserId: string | null,
): OpponentSlot[] {
  const others = orderedOpponents(players, myUserId);
  const total = others.length;
  if (total === 0) return [];
  return others.map((player, index) => {
    const mid = (total - 1) / 2;
    const t = total === 1 ? 0 : (index - mid) / Math.max(mid, 1);
    const span = total <= 2 ? 0.42 : total <= 3 ? 0.72 : 0.95;
    const theta = -Math.PI / 2 + t * (Math.PI * 0.5 * span);
    const x = 50 + 44 * Math.cos(theta);
    const y = 32 + 26 * Math.sin(theta);
    return {
      player,
      left: `${x}%`,
      top: `${Math.max(5, y)}%`,
    };
  });
}

export function nextSeatPlayerId(
  players: Array<{ playerId: string; seatIndex?: number | null }>,
  fromPlayerId: string,
  direction: UnoDirection,
  skip = 0,
) {
  const seated = [...players].sort(
    (a, b) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0),
  );
  if (seated.length === 0) return fromPlayerId;
  const i = seated.findIndex((p) => p.playerId === fromPlayerId);
  if (i < 0) return seated[0].playerId;
  const dir = direction === "CLOCKWISE" ? 1 : -1;
  const steps = skip + 1;
  return seated[(i + dir * steps + seated.length * 8) % seated.length].playerId;
}

export function fanTransform(index: number, count: number) {
  const mid = (count - 1) / 2;
  const spread = Math.min(46, 8 + count * 2.1);
  const angle =
    count <= 1 ? 0 : ((index - mid) / Math.max(mid, 1)) * (spread / 2);
  const step = Math.max(20, 54 - count * 1.85);
  const x = (index - mid) * step;
  const y = Math.abs(index - mid) * (count > 8 ? 2.4 : 1.5);
  return `translate(${x}px, ${y}px) rotate(${angle}deg)`;
}
