"use client";

import { useEffect, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function useWebGLSupport() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const supported = Boolean(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl"),
      );
      setOk(supported);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

export function useInView(threshold = 0.2) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold, rootMargin: "80px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, threshold]);

  return { ref: setNode, inView };
}

export function useIsCompact(breakpoint = 1023) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [breakpoint]);
  return compact;
}

export function useAdaptiveDpr(compact = false): [number, number] {
  const [dpr, setDpr] = useState<[number, number]>(compact ? [1, 1.25] : [1, 1.6]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hardwareConcurrency = navigator.hardwareConcurrency ?? 8;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const lowPower = hardwareConcurrency <= 4 || memory <= 4;

    if (compact) {
      setDpr(lowPower ? [1, 1.15] : [1, 1.25]);
      return;
    }
    setDpr(lowPower ? [1, 1.35] : [1, 1.7]);
  }, [compact]);

  return dpr;
}
