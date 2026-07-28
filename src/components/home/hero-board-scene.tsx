"use client";

import { useGSAP } from "@gsap/react";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Group } from "three";
import * as THREE from "three";

gsap.registerPlugin(useGSAP);

const BLUE = "#0C66E4";
const BLUE_LIGHT = "#579DFF";
const SKY = "#E9F2FF";
const INK = "#172B4D";
const WHITE = "#FFFFFF";
const DONE = "#DCFFF1";
const AMBER = "#FFF7D6";

type CardTone = "white" | "blue" | "sky" | "done" | "amber";

type CardDef = {
  id: string;
  column: 0 | 1 | 2;
  slot: number;
  tone: CardTone;
  label: string;
};

const INITIAL_CARDS: CardDef[] = [
  { id: "c1", column: 0, slot: 0, tone: "blue", label: "Ship auth" },
  { id: "c2", column: 0, slot: 1, tone: "white", label: "Invite" },
  { id: "c3", column: 1, slot: 0, tone: "sky", label: "Layout" },
  { id: "c4", column: 1, slot: 1, tone: "white", label: "Realtime" },
  { id: "c5", column: 1, slot: 2, tone: "amber", label: "Notify" },
  { id: "c6", column: 2, slot: 0, tone: "done", label: "Launch" },
  { id: "c7", column: 2, slot: 1, tone: "white", label: "Polish" },
];

const COLUMN_X = [-1.15, 0, 1.15] as const;
const COLUMNS = [0, 1, 2] as const;
const CARD_W = 0.92;
const CARD_H = 0.38;
const CARD_D = 0.06;
const SLOT_GAP = 0.48;
const COL_TOP = 0.85;
/** Max visible cards per column so stacks stay inside the board. */
const MAX_SLOTS = 3;

function toneColor(tone: CardTone) {
  switch (tone) {
    case "blue":
      return BLUE;
    case "sky":
      return SKY;
    case "done":
      return DONE;
    case "amber":
      return AMBER;
    default:
      return WHITE;
  }
}

function cardPosition(column: number, slot: number): [number, number, number] {
  return [COLUMN_X[column as 0 | 1 | 2], COL_TOP - slot * SLOT_GAP, 0.2];
}

function countByColumn(cards: CardDef[]): [number, number, number] {
  const counts: [number, number, number] = [0, 0, 0];
  for (const c of cards) counts[c.column] += 1;
  return counts;
}

function repackColumn(
  cards: CardDef[],
  column: 0 | 1 | 2,
  movedId?: string,
): CardDef[] {
  const inCol = cards
    .filter((c) => c.column === column)
    .sort((a, b) => {
      // Newly moved card settles at the bottom of the stack
      if (movedId) {
        if (a.id === movedId) return 1;
        if (b.id === movedId) return -1;
      }
      return a.slot - b.slot;
    });
  const slotById = new Map(inCol.map((c, i) => [c.id, i]));
  return cards.map((c) => {
    const slot = slotById.get(c.id);
    if (slot === undefined || slot === c.slot) return c;
    return { ...c, slot };
  });
}

function TaskCard({
  card,
  reduced,
}: {
  card: CardDef;
  reduced: boolean;
}) {
  const ref = useRef<Group>(null);
  const target = useRef(new THREE.Vector3(...cardPosition(card.column, card.slot)));
  const initialized = useRef(false);
  // Freeze tone at mount so moves never flash a different material color
  const tone = useRef(card.tone).current;
  const color = toneColor(tone);
  const accentColor = tone === "blue" ? WHITE : BLUE_LIGHT;
  const textDark = tone === "blue" ? WHITE : INK;

  useLayoutEffect(() => {
    target.current.set(...cardPosition(card.column, card.slot));
    if (!initialized.current && ref.current) {
      ref.current.position.copy(target.current);
      initialized.current = true;
    }
  }, [card.column, card.slot]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (reduced) {
      ref.current.position.copy(target.current);
      return;
    }
    ref.current.position.lerp(target.current, 1 - Math.exp(-8 * delta));
  });

  // Slightly inset solid bars sit in front of the card face — avoids plane z-fighting
  const accentZ = CARD_D * 0.5 + 0.012;

  return (
    <group ref={ref} castShadow>
      <RoundedBox args={[CARD_W, CARD_H, CARD_D]} radius={0.06} smoothness={4}>
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.05}
        />
      </RoundedBox>
      {/* Accent bar — thin box instead of coplanar plane */}
      <mesh position={[-CARD_W * 0.28, CARD_H * 0.12, accentZ]}>
        <boxGeometry args={[0.28, 0.045, 0.01]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-CARD_W * 0.12, -CARD_H * 0.08, accentZ]}>
        <boxGeometry args={[0.55, 0.035, 0.01]} />
        <meshBasicMaterial
          color={textDark}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function ColumnShell({ x }: { x: number }) {
  // y=0 centers columns with the board; height 2.25 leaves even inset in the
  // 2.5-tall front face. z=0.12 keeps shells just in front of the face (z=0.08)
  // without extra parallax from board tilt; cards stay at z≈0.20.
  return (
    <group position={[x, 0, 0.12]}>
      <RoundedBox args={[1.05, 2.25, 0.08]} radius={0.08} smoothness={4}>
        <meshStandardMaterial
          color="#0a4fbf"
          transparent
          opacity={0.42}
          roughness={0.55}
          metalness={0.1}
        />
      </RoundedBox>
      <mesh position={[0, 0.97, 0.055]}>
        <boxGeometry args={[0.35, 0.06, 0.01]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Board({
  reduced,
  compact,
}: {
  reduced: boolean;
  compact: boolean;
}) {
  const boardRef = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [cards, setCards] = useState(INITIAL_CARDS);
  const moving = useRef(false);

  useGSAP(
    () => {
      if (!boardRef.current) return;
      gsap.fromTo(
        boardRef.current.scale,
        { x: 0.86, y: 0.86, z: 0.86 },
        {
          x: 1,
          y: 1,
          z: 1,
          duration: reduced ? 0.01 : 0.7,
          ease: "power3.out",
        },
      );
      gsap.fromTo(
        boardRef.current.rotation,
        { x: 0.35, y: -0.45 },
        {
          x: 0.18,
          y: -0.32,
          duration: reduced ? 0.01 : 0.85,
          ease: "power3.out",
        },
      );
    },
    { dependencies: [reduced] },
  );

  useEffect(() => {
    if (reduced || compact) return;

    let unlockTimer: number | undefined;

    const moveCard = () => {
      if (moving.current) return;
      moving.current = true;
      setCards((prev) => {
        const counts = countByColumn(prev);
        type Move = { id: string; from: 0 | 1 | 2; to: 0 | 1 | 2 };
        const options: Move[] = [];

        for (const card of prev) {
          for (const to of COLUMNS) {
            if (to === card.column) continue;
            if (counts[to] >= MAX_SLOTS) continue;
            options.push({ id: card.id, from: card.column, to });
          }
        }

        if (options.length === 0) {
          moving.current = false;
          return prev;
        }

        const pick = options[Math.floor(Math.random() * options.length)]!;
        // Preserve tone and other fields; only column/slot change
        let next = prev.map((c) =>
          c.id === pick.id ? { ...c, column: pick.to, slot: MAX_SLOTS } : c,
        );
        next = repackColumn(next, pick.from);
        next = repackColumn(next, pick.to, pick.id);
        return next;
      });
      unlockTimer = window.setTimeout(() => {
        moving.current = false;
      }, 900);
    };

    const first = window.setTimeout(moveCard, 4500);
    const interval = window.setInterval(moveCard, 5200);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      if (unlockTimer !== undefined) window.clearTimeout(unlockTimer);
    };
  }, [reduced, compact]);

  useFrame((state, delta) => {
    if (!boardRef.current || reduced) return;
    const t = state.clock.elapsedTime;
    const mx = state.pointer.x;
    const my = state.pointer.y;
    pointer.current.x = THREE.MathUtils.damp(pointer.current.x, mx, 4, delta);
    pointer.current.y = THREE.MathUtils.damp(pointer.current.y, my, 4, delta);

    boardRef.current.rotation.y = -0.32 + pointer.current.x * 0.22;
    boardRef.current.rotation.x = 0.18 - pointer.current.y * 0.12;
    boardRef.current.position.y = Math.sin(t * 0.7) * 0.04;
  });

  const visibleCards = compact ? cards.slice(0, 5) : cards;

  return (
    <group
      ref={boardRef}
      position={[compact ? 0 : 0.35, 0.05, 0]}
      rotation={[0.18, -0.32, 0.04]}
    >
      {/* Board backplane */}
      <RoundedBox args={[3.55, 2.7, 0.12]} radius={0.12} smoothness={4} receiveShadow>
        <meshStandardMaterial
          color="#0747A6"
          roughness={0.45}
          metalness={0.15}
        />
      </RoundedBox>
      <RoundedBox
        args={[3.35, 2.5, 0.06]}
        radius={0.1}
        smoothness={4}
        position={[0, 0, 0.08]}
      >
        <meshStandardMaterial
          color="#0C66E4"
          roughness={0.4}
          metalness={0.08}
          transparent
          opacity={0.92}
        />
      </RoundedBox>

      {COLUMN_X.map((x) => (
        <ColumnShell key={x} x={x} />
      ))}

      {visibleCards.map((card) => (
        <TaskCard key={card.id} card={card} reduced={reduced} />
      ))}
    </group>
  );
}

function SceneContent({
  reduced,
  compact,
}: {
  reduced: boolean;
  compact: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight
        castShadow
        position={[4, 6, 5]}
        intensity={1.35}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color={SKY} />
      <pointLight position={[2, 1, 3]} intensity={0.55} color={BLUE_LIGHT} />

      <Board reduced={reduced} compact={compact} />

      {!reduced ? (
        <ContactShadows
          position={[0, -1.55, 0]}
          opacity={0.35}
          scale={10}
          blur={2.4}
          far={4}
        />
      ) : null}
    </>
  );
}

export function HeroBoardScene({
  reducedMotion = false,
  compact = false,
}: {
  reducedMotion?: boolean;
  compact?: boolean;
}) {
  return (
    <Canvas
      className="h-full w-full bg-transparent"
      style={{ background: "transparent" }}
      dpr={compact ? [1, 1.5] : [1, 2]}
      camera={{ position: [0, 0.2, 6.2], fov: 38, near: 0.1, far: 40 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
      aria-hidden
    >
      <SceneContent reduced={reducedMotion} compact={compact} />
    </Canvas>
  );
}
