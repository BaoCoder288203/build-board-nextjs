"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { bindUnoLobbyBurst } from "./unoLobbyFx";

const AMBIENT_COUNT = 420;
const BURST_COUNT = 96;
const TOTAL = AMBIENT_COUNT + BURST_COUNT;

function createCircleTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function ParticleField({
  reduced,
  lowPower,
}: {
  reduced: boolean;
  lowPower: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const { camera } = useThree();
  const ambient = lowPower ? 220 : AMBIENT_COUNT;
  const burst = lowPower ? 48 : BURST_COUNT;
  const total = ambient + burst;

  const { positions, velocities, lives, colors, geometry, material } = useMemo(() => {
    const positions = new Float32Array(total * 3);
    const velocities = new Float32Array(total * 3);
    const lives = new Float32Array(total);
    const colors = new Float32Array(total * 3);
    const palette = [
      new THREE.Color("#7DD3FC"),
      new THREE.Color("#FDE68A"),
      new THREE.Color("#FCA5A5"),
      new THREE.Color("#C4B5FD"),
      new THREE.Color("#FFFFFF"),
    ];

    for (let i = 0; i < total; i += 1) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 14;
      positions[i3 + 1] = (Math.random() - 0.5) * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 6;
      if (i < ambient) {
        velocities[i3] = (Math.random() - 0.5) * 0.12;
        velocities[i3 + 1] = 0.04 + Math.random() * 0.08;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.04;
        lives[i] = -1;
      } else {
        lives[i] = 0;
        positions[i3] = 40;
      }
      const tint = palette[i % palette.length]!;
      colors[i3] = tint.r;
      colors[i3 + 1] = tint.g;
      colors[i3 + 2] = tint.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const map = createCircleTexture();
    const material = new THREE.PointsMaterial({
      size: 0.085,
      map: map ?? undefined,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    });
    return { positions, velocities, lives, colors, geometry, material };
  }, [ambient, total]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const spawn = (x: number, y: number, hex: string) => {
      const color = new THREE.Color(hex);
      let spawned = 0;
      for (let i = ambient; i < total && spawned < 28; i += 1) {
        if ((lives[i] ?? 0) > 0) continue;
        const i3 = i * 3;
        positions[i3] = x * 4.5;
        positions[i3 + 1] = y * 3.2;
        positions[i3 + 2] = 0.4;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.4 + Math.random() * 2.2;
        velocities[i3] = Math.cos(angle) * speed;
        velocities[i3 + 1] = Math.sin(angle) * speed;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.8;
        lives[i] = 0.7 + Math.random() * 0.45;
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
        spawned += 1;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    };
    bindUnoLobbyBurst(spawn);
    return () => bindUnoLobbyBurst(null);
  }, [ambient, colors, geometry, lives, positions, total, velocities]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!reduced) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, mouse.current.x * 0.55, 3, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, mouse.current.y * 0.32, 3, dt);
      camera.lookAt(0, 0, 0);
    }

    for (let i = 0; i < ambient; i += 1) {
      const i3 = i * 3;
      if (reduced) continue;
      positions[i3] += (velocities[i3] ?? 0) * dt;
      positions[i3 + 1] += (velocities[i3 + 1] ?? 0) * dt;
      positions[i3 + 2] += (velocities[i3 + 2] ?? 0) * dt;
      if ((positions[i3 + 1] ?? 0) > 5.2) positions[i3 + 1] = -5.2;
      if ((positions[i3] ?? 0) > 7.5) positions[i3] = -7.5;
      if ((positions[i3] ?? 0) < -7.5) positions[i3] = 7.5;
    }

    for (let i = ambient; i < total; i += 1) {
      const life = lives[i] ?? 0;
      if (life <= 0) {
        positions[i * 3] = 40;
        continue;
      }
      const i3 = i * 3;
      lives[i] = life - dt;
      positions[i3] += (velocities[i3] ?? 0) * dt;
      positions[i3 + 1] += (velocities[i3 + 1] ?? 0) * dt;
      positions[i3 + 2] += (velocities[i3 + 2] ?? 0) * dt;
      velocities[i3 + 1] = (velocities[i3 + 1] ?? 0) - 1.8 * dt;
      if ((lives[i] ?? 0) <= 0) positions[i3] = 40;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      material.map?.dispose();
    };
  }, [geometry, material]);

  return <points ref={points} geometry={geometry} material={material} />;
}

function LobbyLights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 1.4, 3]} intensity={1.15} color="#93C5FD" distance={12} />
      <pointLight position={[-2.4, -1.2, 2]} intensity={0.55} color="#FDE68A" distance={8} />
    </>
  );
}

export function UnoLobbyScene() {
  const [reduced, setReduced] = useState(false);
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    setLowPower((navigator.hardwareConcurrency ?? 8) <= 4);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Canvas
      className="pointer-events-none !absolute inset-0 !block h-full w-full"
      style={{ background: "transparent" }}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 6.2], fov: 50 }}
      frameloop={reduced ? "demand" : "always"}
    >
      <LobbyLights />
      <ParticleField reduced={reduced} lowPower={lowPower} />
    </Canvas>
  );
}
