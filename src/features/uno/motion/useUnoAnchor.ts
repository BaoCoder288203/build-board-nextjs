"use client";

import { useCallback, useRef } from "react";
import { setUnoAnchor } from "./unoAnchors";

export function useUnoAnchor<T extends HTMLElement>(id: string) {
  const ref = useRef<T | null>(null);
  const setRef = useCallback(
    (el: T | null) => {
      ref.current = el;
      setUnoAnchor(id, el);
    },
    [id],
  );
  return setRef;
}
