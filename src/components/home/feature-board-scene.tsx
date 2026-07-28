"use client";

import { RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import type { Group } from "three";

const BLUE = "#0C66E4";
const BLUE_LIGHT = "#579DFF";
const SKY = "#E9F2FF";
const WHITE = "#FFFFFF";
const INK = "#172B4D";

function LiftingColumn({
  x,
  phase,
  active,
  reduced,
  children,
}: {
  x: number;
  phase: number;
  active: boolean;
  reduced: boolean;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    if (!ref.current) return;
    if (reduced || !active) {
      ref.current.position.set(x, 0, 0.12);
      return;
    }
    const t = state.clock.elapsedTime;
    const wave = Math.sin(t * 1.1 + phase) * 0.5 + 0.5;
    ref.current.position.set(x, wave * 0.12, 0.12 + wave * 0.04);
  });

  return (
    <group ref={ref} position={[x, 0, 0.12]}>
      <RoundedBox args={[0.82, 1.7, 0.065]} radius={0.065} smoothness={4}>
        <meshStandardMaterial
          color="#0a4fbf"
          transparent
          opacity={0.45}
          roughness={0.55}
          metalness={0.1}
        />
      </RoundedBox>
      <mesh position={[0, 0.72, 0.045]}>
        <boxGeometry args={[0.26, 0.045, 0.01]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      {children}
    </group>
  );
}

function MiniCard({
  y,
  color,
  accent,
}: {
  y: number;
  color: string;
  accent: string;
}) {
  return (
    <group position={[0, y, 0.1]}>
      <RoundedBox args={[0.7, 0.28, 0.05]} radius={0.045} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
      </RoundedBox>
      <mesh position={[-0.18, 0.06, 0.035]}>
        <boxGeometry args={[0.2, 0.035, 0.008]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-0.05, -0.05, 0.035]}>
        <boxGeometry args={[0.4, 0.028, 0.008]} />
        <meshBasicMaterial
          color={INK}
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function BoardSlice({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  const root = useRef<Group>(null);

  useFrame((state) => {
    if (!root.current || reduced || !active) return;
    const t = state.clock.elapsedTime;
    root.current.rotation.y = -0.35 + Math.sin(t * 0.4) * 0.05;
    root.current.rotation.x = 0.2 + Math.cos(t * 0.32) * 0.025;
  });

  return (
    <group
      ref={root}
      scale={1.1}
      rotation={[0.2, -0.35, 0.04]}
      position={[0, 0, 0]}
    >
      <RoundedBox args={[2.85, 2.05, 0.1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#0747A6" roughness={0.45} metalness={0.15} />
      </RoundedBox>
      <RoundedBox
        args={[2.68, 1.9, 0.05]}
        radius={0.085}
        smoothness={4}
        position={[0, 0, 0.07]}
      >
        <meshStandardMaterial
          color={BLUE}
          roughness={0.4}
          metalness={0.08}
          transparent
          opacity={0.92}
        />
      </RoundedBox>

      <LiftingColumn x={-0.85} phase={0} active={active} reduced={reduced}>
        <MiniCard y={0.35} color={BLUE} accent={WHITE} />
        <MiniCard y={-0.05} color={WHITE} accent={BLUE_LIGHT} />
      </LiftingColumn>
      <LiftingColumn x={0} phase={2.1} active={active} reduced={reduced}>
        <MiniCard y={0.35} color={SKY} accent={BLUE} />
        <MiniCard y={-0.05} color="#FFF7D6" accent={BLUE} />
        <MiniCard y={-0.45} color={WHITE} accent={BLUE_LIGHT} />
      </LiftingColumn>
      <LiftingColumn x={0.85} phase={4.2} active={active} reduced={reduced}>
        <MiniCard y={0.35} color="#DCFFF1" accent={BLUE} />
        <MiniCard y={-0.05} color={WHITE} accent={BLUE_LIGHT} />
      </LiftingColumn>
    </group>
  );
}

export function FeatureBoardScene({
  active = true,
  reducedMotion = false,
  dprRange = [1, 1.4],
}: {
  active?: boolean;
  reducedMotion?: boolean;
  dprRange?: [number, number];
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
      dpr={dprRange}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 6.2], fov: 36, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(0x000000, 0);
        camera.lookAt(0, 0, 0);
      }}
      aria-hidden
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 5, 4]} intensity={1.15} />
      <pointLight position={[1.2, 0.8, 2]} intensity={0.4} color={BLUE_LIGHT} />
      <BoardSlice active={active} reduced={reducedMotion} />
    </Canvas>
  );
}
