const nodes = new Map<string, HTMLElement>();
const lastRects = new Map<string, DOMRect>();

export const UNO_ANCHOR = {
  board: "uno-board",
  shake: "uno-shake",
  draw: "uno-draw",
  discard: "uno-discard",
  hand: "uno-hand",
  overlay: "uno-fx-overlay",
} as const;

export function handAnchorId(cardId: string) {
  return `uno-hand-${cardId}`;
}

export function seatAnchorId(playerId: string) {
  return `uno-seat-${playerId}`;
}

export function setUnoAnchor(id: string, el: HTMLElement | null) {
  if (el) {
    nodes.set(id, el);
    lastRects.set(id, el.getBoundingClientRect());
    return;
  }
  const prev = nodes.get(id);
  if (prev) lastRects.set(id, prev.getBoundingClientRect());
  nodes.delete(id);
}

export function getUnoAnchorRect(id: string) {
  const el = nodes.get(id);
  if (el) {
    const rect = el.getBoundingClientRect();
    lastRects.set(id, rect);
    return rect;
  }
  return lastRects.get(id) ?? null;
}

export function localRect(
  rect: DOMRect,
  overlay: HTMLElement,
) {
  const parent = overlay.getBoundingClientRect();
  return {
    x: rect.left - parent.left,
    y: rect.top - parent.top,
    width: rect.width,
    height: rect.height,
  };
}
