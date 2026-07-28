"use client";

import { RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh } from "three";

const BLUE = "#0C66E4";
const BLUE_LIGHT = "#579DFF";
const SKY = "#E9F2FF";
const WHITE = "#FFFFFF";
const INK = "#172B4D";

function ReactionOrb({
  offset,
  color,
  phase,
  active,
  reduced,
}: {
  offset: [number, number, number];
  color: string;
  phase: number;
  active: boolean;
  reduced: boolean;
}) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    if (reduced || !active) {
      ref.current.position.set(...offset);
      ref.current.scale.setScalar(1);
      return;
    }
    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 1.8 + phase) * 0.08;
    const pulse = 0.85 + Math.sin(t * 2.4 + phase) * 0.15;
    ref.current.position.set(offset[0], offset[1] + bob, offset[2]);
    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref} position={offset}>
      <sphereGeometry args={[0.09, 16, 16]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.1}
        emissive={color}
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

function CollabBoard({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  const root = useRef<Group>(null);
  const bubble = useRef<Group>(null);

  useFrame((state) => {
    if (!root.current) return;
    if (!reduced && active) {
      const t = state.clock.elapsedTime;
      root.current.rotation.y = -0.22 + Math.sin(t * 0.35) * 0.04;
      root.current.rotation.x = 0.14 + Math.cos(t * 0.28) * 0.02;
    }
    if (bubble.current && !reduced && active) {
      const t = state.clock.elapsedTime;
      bubble.current.position.y = 0.55 + Math.sin(t * 1.4) * 0.05;
      bubble.current.scale.setScalar(0.95 + Math.sin(t * 1.6) * 0.05);
    }
  });

  return (
    <group ref={root} scale={1.18} position={[0, 0, 0]} rotation={[0.14, -0.22, 0.02]}>
      {/* Task card */}
      <RoundedBox args={[1.6, 1.05, 0.08]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color={WHITE} roughness={0.35} metalness={0.05} />
      </RoundedBox>
      <mesh position={[-0.35, 0.28, 0.05]}>
        <boxGeometry args={[0.55, 0.07, 0.012]} />
        <meshBasicMaterial color={BLUE} />
      </mesh>
      <mesh position={[-0.15, 0.08, 0.05]}>
        <boxGeometry args={[0.95, 0.05, 0.01]} />
        <meshBasicMaterial color={INK} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh position={[-0.25, -0.08, 0.05]}>
        <boxGeometry args={[0.75, 0.045, 0.01]} />
        <meshBasicMaterial color={INK} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      {/* Assignees */}
      <mesh position={[-0.45, -0.32, 0.05]}>
        <circleGeometry args={[0.1, 24]} />
        <meshBasicMaterial color={BLUE} />
      </mesh>
      <mesh position={[-0.28, -0.32, 0.055]}>
        <circleGeometry args={[0.1, 24]} />
        <meshBasicMaterial color={BLUE_LIGHT} />
      </mesh>

      {/* Comment bubble */}
      <group ref={bubble} position={[0.95, 0.55, 0.35]}>
        <RoundedBox args={[1.05, 0.55, 0.06]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color={SKY} roughness={0.4} metalness={0.05} />
        </RoundedBox>
        <mesh position={[-0.2, 0.08, 0.04]}>
          <boxGeometry args={[0.5, 0.04, 0.01]} />
          <meshBasicMaterial color={INK} transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <mesh position={[-0.1, -0.06, 0.04]}>
          <boxGeometry args={[0.7, 0.035, 0.01]} />
          <meshBasicMaterial color={INK} transparent opacity={0.22} depthWrite={false} />
        </mesh>
        {/* Tail */}
        <mesh position={[-0.35, -0.28, 0]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.18, 0.12, 0.04]} />
          <meshStandardMaterial color={SKY} roughness={0.4} />
        </mesh>
      </group>

      <ReactionOrb
        offset={[0.55, -0.15, 0.45]}
        color="#FF8F73"
        phase={0}
        active={active}
        reduced={reduced}
      />
      <ReactionOrb
        offset={[0.78, 0.05, 0.5]}
        color="#F5CD47"
        phase={1.2}
        active={active}
        reduced={reduced}
      />
      <ReactionOrb
        offset={[1.05, -0.2, 0.42]}
        color={BLUE_LIGHT}
        phase={2.4}
        active={active}
        reduced={reduced}
      />
    </group>
  );
}

export function FeatureCollabScene({
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
      camera={{ position: [0, 0, 4.85], fov: 38, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(0x000000, 0);
        camera.lookAt(0, 0, 0);
      }}
      aria-hidden
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <pointLight position={[2, 1, 2]} intensity={0.4} color={BLUE_LIGHT} />
      <CollabBoard active={active} reduced={reducedMotion} />
    </Canvas>
  );
}
