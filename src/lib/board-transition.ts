import gsap from "gsap";

const FLAG_KEY = "bb-board-switch";
const COVER_ID = "bb-board-switch-cover";
/** Matches board page shell — never flash canvas white between boards. */
export const BOARD_SHELL_BG = "#0079BF";

let coverReleaseTimer: ReturnType<typeof setTimeout> | null = null;

export function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function markBoardSwitchPending() {
  try {
    sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    // ignore
  }
}

export function peekBoardSwitchPending() {
  try {
    return sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function consumeBoardSwitchPending() {
  try {
    const v = sessionStorage.getItem(FLAG_KEY);
    if (v) sessionStorage.removeItem(FLAG_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

/** Full-viewport board-colored veil that survives route remounts. */
export function ensureBoardSwitchCover() {
  if (typeof document === "undefined") return null;

  let el = document.getElementById(COVER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = COVER_ID;
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:45",
      `background:${BOARD_SHELL_BG}`,
      "pointer-events:none",
      "opacity:1",
    ].join(";");
    document.body.appendChild(el);
  } else {
    gsap.killTweensOf(el);
    gsap.set(el, { opacity: 1 });
  }

  if (coverReleaseTimer) clearTimeout(coverReleaseTimer);
  coverReleaseTimer = setTimeout(() => {
    releaseBoardSwitchCover();
  }, 2800);

  return el;
}

export function releaseBoardSwitchCover(immediate = false) {
  if (typeof document === "undefined") return;
  if (coverReleaseTimer) {
    clearTimeout(coverReleaseTimer);
    coverReleaseTimer = null;
  }

  const el = document.getElementById(COVER_ID);
  if (!el) return;

  if (immediate || prefersReducedMotion()) {
    gsap.killTweensOf(el);
    el.remove();
    return;
  }

  gsap.to(el, {
    opacity: 0,
    duration: 0.22,
    ease: "power2.out",
    onComplete: () => el.remove(),
  });
}

function getBoardSwitchCover(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(COVER_ID);
}

/** Collapse outgoing board layer (clone). Resolves when complete. */
export function animateBoardExit(
  el: HTMLElement,
  opts?: { onAlmostDone?: () => void },
): Promise<void> {
  if (prefersReducedMotion()) {
    opts?.onAlmostDone?.();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => resolve(),
    });

    // Fade onto the blue cover — never expose body canvas white.
    tl.to(
      el,
      {
        opacity: 0,
        scale: 0.97,
        y: -12,
        filter: "blur(2px)",
        duration: 0.36,
        transformOrigin: "50% 0%",
      },
      0,
    );

    tl.call(() => opts?.onAlmostDone?.(), [], 0.16);
  });
}

/** Open incoming board canvas + stagger columns. */
export function animateBoardEnter(
  canvas: HTMLElement,
  columns: HTMLElement[],
): Promise<void> {
  if (coverReleaseTimer) {
    clearTimeout(coverReleaseTimer);
    coverReleaseTimer = null;
  }

  const cover = getBoardSwitchCover();

  if (prefersReducedMotion()) {
    gsap.set(canvas, { clearProps: "all" });
    gsap.set(columns, { clearProps: "all" });
    releaseBoardSwitchCover(true);
    return Promise.resolve();
  }

  gsap.set(canvas, {
    opacity: 0,
    scale: 0.98,
    y: 16,
    filter: "blur(2px)",
    transformOrigin: "50% 0%",
  });
  gsap.set(columns, { opacity: 0, y: 12 });

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        gsap.set(canvas, { clearProps: "filter" });
        cover?.remove();
        resolve();
      },
    });

    // Crossfade cover ↔ canvas so the veil never drops onto white.
    tl.to(
      canvas,
      {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.4,
      },
      0,
    );

    if (cover) {
      gsap.killTweensOf(cover);
      tl.to(
        cover,
        {
          opacity: 0,
          duration: 0.32,
          ease: "power2.out",
        },
        0.04,
      );
    }

    if (columns.length) {
      tl.to(
        columns,
        {
          opacity: 1,
          y: 0,
          duration: 0.34,
          stagger: 0.03,
        },
        0.06,
      );
    }
  });
}

/**
 * Pin a board-colored cover + clone, exit the clone, navigate mid-exit.
 * Cover stays until the next board's enter releases it.
 */
export async function runBoardSwitchTransition(options: {
  sourceEl: HTMLElement | null;
  navigate: () => void;
}) {
  const { sourceEl, navigate } = options;
  markBoardSwitchPending();
  ensureBoardSwitchCover();

  if (!sourceEl || prefersReducedMotion()) {
    navigate();
    return;
  }

  const rect = sourceEl.getBoundingClientRect();
  const clone = sourceEl.cloneNode(true) as HTMLElement;
  clone.setAttribute("aria-hidden", "true");
  clone.style.position = "fixed";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.margin = "0";
  clone.style.zIndex = "50";
  clone.style.pointerEvents = "none";
  clone.style.overflow = "hidden";
  clone.style.borderRadius = getComputedStyle(sourceEl).borderRadius;
  document.body.appendChild(clone);

  // Hide original immediately so layout can swap underneath without flicker.
  gsap.set(sourceEl, { opacity: 0, visibility: "hidden" });

  let navigated = false;
  const go = () => {
    if (navigated) return;
    navigated = true;
    navigate();
  };

  try {
    await animateBoardExit(clone, { onAlmostDone: go });
    go();
  } finally {
    clone.remove();
  }
}
