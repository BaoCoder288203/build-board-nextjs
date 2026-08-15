"use client";

import { type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { PublicCard } from "../types/card.types";
import { useUnoStore } from "../store/unoStore";
import { playUnoSfx } from "../sound/unoSound";
import { nextSeatPlayerId } from "../utils/seatLayout";
import { UnoCard } from "../components/UnoCard";
import { UnoCardBack } from "../components/UnoCardBack";
import {
  getUnoAnchorRect,
  handAnchorId,
  localRect,
  seatAnchorId,
  UNO_ANCHOR,
} from "./unoAnchors";
import {
  hideCardsForFx,
  onUnoFx,
  revealCardsForFx,
  type UnoFxEvent,
} from "./unoFxBus";
import {
  gsap,
  motionDuration,
  prefersReducedMotion,
  UNO_EASE,
  UNO_MOTION,
  useGSAP,
} from "./unoMotion";

function spawnNode(parent: HTMLElement) {
  const el = document.createElement("div");
  el.className = "pointer-events-none absolute left-0 top-0 z-30";
  el.style.willChange = "transform, opacity";
  parent.appendChild(el);
  return el;
}

function mountCard(el: HTMLElement, card: PublicCard | null, faceUp: boolean) {
  const root = createRoot(el);
  root.render(
    faceUp && card ? (
      <UnoCard card={card} variant="pile" />
    ) : (
      <UnoCardBack variant="pile" />
    ),
  );
  return root;
}

function unmountLater(root: Root, el: HTMLElement) {
  window.setTimeout(() => {
    root.unmount();
    el.remove();
  }, 0);
}

function flyCard({
  overlay,
  fromId,
  toId,
  card,
  faceUp,
  flip,
  onDone,
}: {
  overlay: HTMLElement;
  fromId: string;
  toId: string;
  card: PublicCard | null;
  faceUp: boolean;
  flip?: boolean;
  onDone?: () => void;
}) {
  const from = getUnoAnchorRect(fromId);
  const to = getUnoAnchorRect(toId);
  if (!from || !to) {
    onDone?.();
    return;
  }
  const start = localRect(from, overlay);
  const end = localRect(to, overlay);
  const el = spawnNode(overlay);
  const reduced = prefersReducedMotion();
  const root = mountCard(el, card, faceUp && !flip);
  const endRot = gsap.utils.random(-8, 8);

  gsap.set(el, { x: start.x, y: start.y, scale: 0.92, autoAlpha: 1 });

  if (reduced) {
    gsap.to(el, {
      x: end.x,
      y: end.y,
      autoAlpha: 0.2,
      duration: motionDuration(UNO_MOTION.fast),
      ease: UNO_EASE.out,
      onComplete: () => {
        unmountLater(root, el);
        onDone?.();
      },
    });
    return;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      unmountLater(root, el);
      onDone?.();
    },
  });
  tl.to(el, {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2 - 18,
    scale: 1.12,
    rotation: endRot * 0.4,
    duration: motionDuration(0.16),
    ease: UNO_EASE.out,
  });
  if (flip && card) {
    tl.to(el, {
      rotationY: 90,
      duration: motionDuration(0.08),
      ease: UNO_EASE.inOut,
      onComplete: () => {
        root.render(<UnoCard card={card} variant="pile" />);
      },
    });
    tl.set(el, { rotationY: -90 });
    tl.to(el, {
      rotationY: 0,
      duration: motionDuration(0.08),
      ease: UNO_EASE.out,
    });
  }
  tl.to(el, {
    x: end.x,
    y: end.y,
    scale: 1,
    rotation: endRot,
    duration: motionDuration(0.14),
    ease: UNO_EASE.settle,
  });
}

function stamp(overlay: HTMLElement, text: string, className: string) {
  const el = spawnNode(overlay);
  el.className = `pointer-events-none absolute left-1/2 top-[40%] z-40 -translate-x-1/2 -translate-y-1/2 text-5xl font-black tracking-wide ${className}`;
  el.textContent = text;
  gsap.fromTo(
    el,
    { autoAlpha: 0, scale: 0.7 },
    {
      autoAlpha: 1,
      scale: 1.08,
      duration: motionDuration(0.16),
      ease: UNO_EASE.out,
      onComplete: () => {
        gsap.to(el, {
          autoAlpha: 0,
          scale: 1,
          duration: motionDuration(0.2),
          delay: 0.12,
          onComplete: () => el.remove(),
        });
      },
    },
  );
}

function combatText(overlay: HTMLElement, text: string, toId: string) {
  const dest = getUnoAnchorRect(toId) ?? getUnoAnchorRect(UNO_ANCHOR.discard);
  const el = spawnNode(overlay);
  el.className =
    "pointer-events-none absolute z-40 text-4xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]";
  el.textContent = text;
  const start = dest
    ? localRect(dest, overlay)
    : {
        x: overlay.clientWidth / 2,
        y: overlay.clientHeight / 2,
        width: 0,
        height: 0,
      };
  gsap.fromTo(
    el,
    {
      x: overlay.clientWidth / 2 - 24,
      y: overlay.clientHeight * 0.38,
      scale: 0.7,
      autoAlpha: 1,
    },
    {
      x: start.x,
      y: start.y,
      scale: 1.15,
      autoAlpha: 0,
      duration: motionDuration(UNO_MOTION.emphasis),
      ease: UNO_EASE.out,
      onComplete: () => el.remove(),
    },
  );
}

function burstConfetti(overlay: HTMLElement) {
  if (prefersReducedMotion()) return;
  const colors = ["#E8394B", "#FFC93C", "#3CB878", "#3B82F6", "#E8C547"];
  for (let i = 0; i < 18; i += 1) {
    const bit = spawnNode(overlay);
    bit.style.width = "8px";
    bit.style.height = "12px";
    bit.style.borderRadius = "2px";
    bit.style.background = colors[i % colors.length];
    const x = overlay.clientWidth / 2 + gsap.utils.random(-40, 40);
    const y = overlay.clientHeight * 0.28;
    gsap.fromTo(
      bit,
      { x, y, rotation: 0, autoAlpha: 1, scale: 1 },
      {
        x: x + gsap.utils.random(-120, 120),
        y: y + gsap.utils.random(80, 180),
        rotation: gsap.utils.random(-180, 180),
        autoAlpha: 0,
        duration: motionDuration(0.45),
        delay: i * 0.012,
        ease: UNO_EASE.out,
        onComplete: () => bit.remove(),
      },
    );
  }
}

function destForPlayer(playerId: string, myPlayerId: string | null) {
  return playerId === myPlayerId ? UNO_ANCHOR.hand : seatAnchorId(playerId);
}

function handleEvent(
  overlay: HTMLElement,
  shake: HTMLElement | null,
  event: UnoFxEvent,
  myPlayerId: string | null,
  myUserId: string | null,
) {
  const state = useUnoStore.getState();
  const game = state.game;
  const room = state.room;

  if (event.kind === "CARD_PLAYED") {
    playUnoSfx("play");
    const specific = handAnchorId(event.card.cardId);
    const fromId =
      event.playerId === myPlayerId
        ? getUnoAnchorRect(specific)
          ? specific
          : UNO_ANCHOR.hand
        : destForPlayer(event.playerId, myPlayerId);
    flyCard({
      overlay,
      fromId,
      toId: UNO_ANCHOR.discard,
      card: event.card,
      faceUp: true,
    });
    const value = event.card.value;
    if (value === "SKIP") {
      stamp(overlay, "SKIP", "text-white");
      const skipped = game
        ? nextSeatPlayerId(game.players, event.playerId, game.direction, 0)
        : null;
      if (skipped) combatText(overlay, "SKIP", seatAnchorId(skipped));
    }
    if (value === "REVERSE") {
      stamp(overlay, "REVERSE", "text-[#FFC93C]");
      if (shake && !prefersReducedMotion()) {
        gsap.fromTo(
          shake,
          { x: -3 },
          {
            x: 3,
            duration: 0.04,
            repeat: 3,
            yoyo: true,
            onComplete: () => {
              gsap.set(shake, { x: 0 });
            },
          },
        );
      }
    }
    if (value === "DRAW_TWO") {
      playUnoSfx("warn");
      const target = game
        ? nextSeatPlayerId(game.players, event.playerId, game.direction, 0)
        : event.playerId;
      combatText(overlay, "+2", destForPlayer(target, myPlayerId));
      flyCard({
        overlay,
        fromId: UNO_ANCHOR.draw,
        toId: destForPlayer(target, myPlayerId),
        card: null,
        faceUp: false,
      });
    }
    if (value === "WILD_DRAW_FOUR") {
      playUnoSfx("warn");
      const target = game
        ? nextSeatPlayerId(game.players, event.playerId, game.direction, 0)
        : event.playerId;
      combatText(overlay, "+4", destForPlayer(target, myPlayerId));
    }
    return;
  }

  if (event.kind === "CARD_DRAWN") {
    playUnoSfx("draw");
    const mine = event.playerId === myPlayerId;
    const dest = mine ? UNO_ANCHOR.hand : seatAnchorId(event.playerId);
    const ids = event.cards?.map((c) => c.cardId) ?? [];
    if (ids.length) hideCardsForFx(ids);
    const count = Math.min(event.drawnCount, 6);
    for (let i = 0; i < count; i += 1) {
      const card = event.cards?.[i] ?? null;
      window.setTimeout(() => {
        flyCard({
          overlay,
          fromId: UNO_ANCHOR.draw,
          toId: dest,
          card,
          faceUp: Boolean(mine && card),
          flip: Boolean(mine && card),
          onDone: () => {
            if (card) revealCardsForFx([card.cardId]);
          },
        });
      }, i * UNO_MOTION.drawStagger * 1000);
    }
    if (!count && ids.length) revealCardsForFx(ids);
    return;
  }

  if (event.kind === "DEAL") {
    const players = room?.players.filter((p) => !p.isSpectator) ?? [];
    const handSize = game?.myHand.length ?? 7;
    players.forEach((player, pIndex) => {
      const dest =
        player.userId === myUserId
          ? UNO_ANCHOR.hand
          : seatAnchorId(player.playerId);
      const n = player.userId === myUserId ? handSize : Math.min(handSize, 4);
      for (let i = 0; i < n; i += 1) {
        window.setTimeout(
          () => {
            flyCard({
              overlay,
              fromId: UNO_ANCHOR.draw,
              toId: dest,
              card: null,
              faceUp: false,
            });
          },
          (pIndex * n + i) * UNO_MOTION.dealStagger * 1000,
        );
      }
    });
    return;
  }

  if (event.kind === "TURN_CHANGED") {
    if (event.currentPlayerId === myPlayerId) playUnoSfx("turn");
    const seat =
      event.currentPlayerId === myPlayerId
        ? getUnoAnchorRect(UNO_ANCHOR.hand)
        : event.currentPlayerId
          ? getUnoAnchorRect(seatAnchorId(event.currentPlayerId))
          : null;
    if (seat) {
      const local = localRect(seat, overlay);
      const pulse = spawnNode(overlay);
      pulse.className =
        "pointer-events-none absolute z-20 h-16 w-16 rounded-full border-2 border-[#FFC93C]";
      gsap.fromTo(
        pulse,
        { x: local.x - 8, y: local.y - 8, scale: 0.8, autoAlpha: 0.9 },
        {
          scale: 1.35,
          autoAlpha: 0,
          duration: motionDuration(UNO_MOTION.normal),
          ease: UNO_EASE.out,
          onComplete: () => pulse.remove(),
        },
      );
    }
    return;
  }

  if (event.kind === "UNO_CALLED") {
    playUnoSfx("uno");
    stamp(overlay, "UNO!", "text-[#E8394B]");
    return;
  }

  if (event.kind === "GAME_ENDED") {
    const mine = Boolean(
      event.winnerId &&
        (event.winnerId === myPlayerId ||
          room?.players.some(
            (p) =>
              (p.playerId === event.winnerId || p.userId === event.winnerId) &&
              p.userId === myUserId,
          )),
    );
    playUnoSfx(mine ? "win" : "lose");
    stamp(
      overlay,
      mine ? "YOU WIN" : "GAME OVER",
      mine ? "text-[#FFC93C]" : "text-white",
    );
    if (mine) burstConfetti(overlay);
    return;
  }

  if (event.kind === "INVALID_ACTION") {
    playUnoSfx("error");
    const hand = shake?.querySelector("[data-uno-hand]");
    if (hand && !prefersReducedMotion()) {
      gsap.fromTo(
        hand,
        { x: -4 },
        {
          x: 4,
          duration: 0.05,
          repeat: 3,
          yoyo: true,
          onComplete: () => gsap.set(hand, { x: 0 }),
        },
      );
    }
  }
}

export function useUnoFx(
  overlayRef: RefObject<HTMLElement | null>,
  shakeRef: RefObject<HTMLElement | null>,
  myPlayerId: string | null,
  myUserId: string | null,
) {
  useGSAP(
    (_context, contextSafe) => {
      const overlay = overlayRef.current;
      if (!overlay || !contextSafe) return;
      const onEvent = contextSafe((event: UnoFxEvent) => {
        handleEvent(overlay, shakeRef.current, event, myPlayerId, myUserId);
      });
      return onUnoFx(onEvent);
    },
    {
      scope: overlayRef,
      dependencies: [myPlayerId, myUserId],
    },
  );
}
