"use client";

import { RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Group } from "three";
import * as THREE from "three";

const BLUE = "#0C66E4";
const BLUE_LIGHT = "#579DFF";
const SKY = "#E9F2FF";
const INK = "#172B4D";
const WHITE = "#FFFFFF";
const DONE = "#DCFFF1";

const COLUMN_X = [-0.95, 0, 0.95] as const;
const CARD_W = 0.78;
const CARD_H = 0.32;
const CARD_D = 0.055;
const SLOT_GAP = 0.42;
const COL_TOP = 0.55;

type Phase = 0 | 1 | 2;

function cardPos(column: number, slot: number): [number, number, number] {
  return [COLUMN_X[column as 0 | 1 | 2], COL_TOP - slot * SLOT_GAP, 0.2];
}

function DemoCard({
  column,
  slot,
  tone,
  visible,
  reduced,
}: {
  column: 0 | 1 | 2;
  slot: number;
  tone: "blue" | "white" | "done";
  visible: boolean;
  reduced: boolean;
}) {
  const ref = useRef<Group>(null);
  const target = useRef(new THREE.Vector3(...cardPos(column, slot)));
  const scale = useRef(visible ? 1 : 0);
  const initialized = useRef(false);

  const color = tone === "blue" ? BLUE : tone === "done" ? DONE : WHITE;
  const accent = tone === "blue" ? WHITE : BLUE_LIGHT;
  const text = tone === "blue" ? WHITE : INK;
  const accentZ = CARD_D * 0.5 + 0.012;

  useLayoutEffect(() => {
    target.current.set(...cardPos(column, slot));
    if (!initialized.current && ref.current) {
      ref.current.position.copy(target.current);
      ref.current.scale.setScalar(visible ? 1 : 0.001);
      scale.current = visible ? 1 : 0;
      initialized.current = true;
    }
  }, [column, slot, visible]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const want = visible ? 1 : 0;
    if (reduced) {
      scale.current = want;
      ref.current.scale.setScalar(want < 0.01 ? 0.001 : want);
      ref.current.position.copy(target.current);
      return;
    }
    scale.current = THREE.MathUtils.damp(scale.current, want, 8, delta);
    ref.current.scale.setScalar(scale.current < 0.01 ? 0.001 : scale.current);
    ref.current.position.lerp(target.current, 1 - Math.exp(-7 * delta));
  });

  return (
    <group ref={ref}>
      <RoundedBox args={[CARD_W, CARD_H, CARD_D]} radius={0.05} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
      </RoundedBox>
      <mesh position={[-CARD_W * 0.26, CARD_H * 0.1, accentZ]}>
        <boxGeometry args={[0.24, 0.04, 0.01]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-CARD_W * 0.1, -CARD_H * 0.08, accentZ]}>
        <boxGeometry args={[0.46, 0.03, 0.01]} />
        <meshBasicMaterial
          color={text}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function ColumnShell({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0.12]}>
      <RoundedBox args={[0.9, 1.85, 0.07]} radius={0.07} smoothness={4}>
        <meshStandardMaterial
          color="#0a4fbf"
          transparent
          opacity={0.42}
          roughness={0.55}
          metalness={0.1}
        />
      </RoundedBox>
      <mesh position={[0, 0.8, 0.05]}>
        <boxGeometry args={[0.28, 0.05, 0.01]} />
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

function HowBoard({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  const boardRef = useRef<Group>(null);
  const [phase, setPhase] = useState<Phase>(0);

  useEffect(() => {
    if (!active || reduced) {
      setPhase(2);
      return;
    }

    let cancelled = false;
    const timeouts: number[] = [];

    const clearTimeouts = () => {
      for (const t of timeouts) window.clearTimeout(t);
      timeouts.length = 0;
    };

    const runCycle = () => {
      if (cancelled) return;
      setPhase(0);
      timeouts.push(window.setTimeout(() => !cancelled && setPhase(1), 1200));
      timeouts.push(window.setTimeout(() => !cancelled && setPhase(2), 2600));
    };

    runCycle();
    const loop = window.setInterval(() => {
      clearTimeouts();
      runCycle();
    }, 4800);

    return () => {
      cancelled = true;
      window.clearInterval(loop);
      clearTimeouts();
    };
  }, [active, reduced]);

  useFrame((state, delta) => {
    if (!boardRef.current) return;
    if (reduced || !active) {
      boardRef.current.position.set(0, 0, 0);
      return;
    }
    const t = state.clock.elapsedTime;
    boardRef.current.rotation.y = -0.28 + Math.sin(t * 0.45) * 0.06;
    boardRef.current.rotation.x = 0.16 + Math.cos(t * 0.35) * 0.03;
    // Subtle float around origin so the board stays vertically centered
    boardRef.current.position.y = Math.sin(t * 0.6) * 0.03;
    void delta;
  });

  const showCard = phase >= 0;
  const column: 0 | 1 | 2 = phase === 0 ? 0 : phase === 1 ? 1 : 2;
  const tone = phase === 2 ? "done" : phase === 1 ? "white" : "blue";

  return (
    <group
      ref={boardRef}
      scale={1.12}
      position={[0, 0, 0]}
      rotation={[0.16, -0.28, 0.03]}
    >
      <RoundedBox args={[3.05, 2.2, 0.11]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#0747A6" roughness={0.45} metalness={0.15} />
      </RoundedBox>
      <RoundedBox
        args={[2.88, 2.05, 0.055]}
        radius={0.09}
        smoothness={4}
        position={[0, 0, 0.075]}
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
      <DemoCard
        column={column}
        slot={0}
        tone={tone}
        visible={showCard && active}
        reduced={reduced}
      />
      {/* Static companions so the board feels inhabited */}
      <DemoCard
        column={0}
        slot={1}
        tone="white"
        visible={active}
        reduced={reduced}
      />
      <DemoCard
        column={1}
        slot={1}
        tone="blue"
        visible={active && phase >= 1}
        reduced={reduced}
      />
      <DemoCard
        column={2}
        slot={1}
        tone="done"
        visible={active && phase >= 2}
        reduced={reduced}
      />
    </group>
  );
}

export function HowItWorksScene({
  active = true,
  reducedMotion = false,
}: {
  active?: boolean;
  reducedMotion?: boolean;
}) {
  return (
    <Canvas
      className="!absolute inset-0 !block h-full w-full bg-transparent"
      style={{
        width: "100%",
        height: "100%",
        background: "transparent",
        overflow: "visible",
      }}
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 6.05], fov: 40, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(0x000000, 0);
        camera.lookAt(0, 0, 0);
      }}
      aria-hidden
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3.5, 5, 4]} intensity={1.2} />
      <directionalLight position={[-2.5, 1.5, -1.5]} intensity={0.3} color={SKY} />
      <pointLight position={[1.5, 1, 2.5]} intensity={0.45} color={BLUE_LIGHT} />
      <HowBoard active={active} reduced={reducedMotion} />
    </Canvas>
  );
}
