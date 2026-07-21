import gsap from "gsap";

const FLAG_KEY = "bb-ws-reveal";
const COVER_ID = "bb-ws-reveal-cover";

export type WorkspaceRevealPayload = {
  x: number;
  y: number;
  color: string;
  href: string;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function coverRadius(x: number, y: number) {
  const maxX = Math.max(x, window.innerWidth - x);
  const maxY = Math.max(y, window.innerHeight - y);
  return Math.ceil(Math.hypot(maxX, maxY)) + 24;
}

function markPending(payload: Omit<WorkspaceRevealPayload, "href">) {
  try {
    sessionStorage.setItem(FLAG_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function peekWorkspaceRevealPending(): Omit<
  WorkspaceRevealPayload,
  "href"
> | null {
  try {
    const raw = sessionStorage.getItem(FLAG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Omit<WorkspaceRevealPayload, "href">;
  } catch {
    return null;
  }
}

export function consumeWorkspaceRevealPending() {
  try {
    const raw = sessionStorage.getItem(FLAG_KEY);
    if (raw) sessionStorage.removeItem(FLAG_KEY);
    return raw
      ? (JSON.parse(raw) as Omit<WorkspaceRevealPayload, "href">)
      : null;
  } catch {
    return null;
  }
}

function setBodyBridgeColor(color: string | null) {
  if (typeof document === "undefined") return;
  if (color) {
    document.body.style.background = color;
    document.documentElement.style.background = color;
  } else {
    document.body.style.background = "";
    document.documentElement.style.background = "";
  }
}

function getOrCreateCover(color: string, x: number, y: number) {
  let el = document.getElementById(COVER_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = COVER_ID;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  el.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:60",
    `background:${color}`,
    "pointer-events:none",
    `clip-path:circle(0px at ${x}px ${y}px)`,
    "will-change:clip-path",
  ].join(";");
  return el;
}

/** Lock cover as a solid full-viewport veil (no clip hole). */
function lockSolidCover(cover: HTMLDivElement, color: string) {
  gsap.killTweensOf(cover);
  cover.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:60",
    `background:${color}`,
    "pointer-events:none",
    "opacity:1",
    "clip-path:none",
    "mask-image:none",
    "-webkit-mask-image:none",
  ].join(";");
  setBodyBridgeColor(color);
}

function waitTwoFrames() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Expand a workspace-colored circle from click/card origin until the
 * viewport is covered, lock solid + body color, then navigate.
 */
export async function runWorkspaceEnterReveal(options: {
  event?: { clientX: number; clientY: number } | null;
  originEl?: HTMLElement | null;
  color: string;
  navigate: () => void;
}) {
  const { event, originEl, color, navigate } = options;

  if (typeof document === "undefined" || prefersReducedMotion()) {
    navigate();
    return;
  }

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  if (event) {
    x = event.clientX;
    y = event.clientY;
  } else if (originEl) {
    const rect = originEl.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }

  const radius = coverRadius(x, y);
  markPending({ x, y, color });
  setBodyBridgeColor(color);
  const cover = getOrCreateCover(color, x, y);

  await new Promise<void>((resolve) => {
    gsap.fromTo(
      cover,
      { clipPath: `circle(0px at ${x}px ${y}px)` },
      {
        clipPath: `circle(${radius}px at ${x}px ${y}px)`,
        duration: 0.42,
        ease: "power2.inOut",
        onComplete: () => resolve(),
      },
    );
  });

  // Solid lock before route swap — prevents canvas flash under cover.
  lockSolidCover(cover, color);
  await waitTwoFrames();
  navigate();
}

/**
 * After destination paints: expand a transparent hole from the origin so
 * the color runs outward off the viewport edges.
 */
export async function finishWorkspaceEnterReveal() {
  if (typeof document === "undefined") return;

  const pending = peekWorkspaceRevealPending();
  if (!pending) {
    // Do not remove an in-flight cover — a second call after consume
    // used to kill the expand-out mid-animation.
    return;
  }

  if (prefersReducedMotion()) {
    consumeWorkspaceRevealPending();
    document.getElementById(COVER_ID)?.remove();
    setBodyBridgeColor(null);
    return;
  }

  await waitTwoFrames();

  const { x, y, color } = pending;
  const radius = coverRadius(x, y);
  let cover = document.getElementById(COVER_ID) as HTMLDivElement | null;
  if (!cover) {
    cover = document.createElement("div");
    cover.id = COVER_ID;
    cover.setAttribute("aria-hidden", "true");
    document.body.appendChild(cover);
  }

  // One atomic switch: solid full cover → mask hole ready at r=0 (still solid).
  lockSolidCover(cover, color);
  const mask = `radial-gradient(circle at ${x}px ${y}px, transparent var(--reveal-r), black var(--reveal-r))`;
  gsap.set(cover, {
    clipPath: "none",
    opacity: 1,
    background: color,
    "--reveal-r": "0px",
  });
  cover.style.maskImage = mask;
  cover.style.webkitMaskImage = mask;
  cover.style.willChange = "mask-image, -webkit-mask-image";

  consumeWorkspaceRevealPending();

  await new Promise<void>((resolve) => {
    gsap.to(cover, {
      "--reveal-r": `${radius}px`,
      duration: 0.35,
      ease: "power2.inOut",
      onComplete: () => {
        cover.remove();
        setBodyBridgeColor(null);
        resolve();
      },
    });
  });
}
