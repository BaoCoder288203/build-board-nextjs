/**
 * Opaque full-viewport veil during soft navigations so empty chrome / body
 * canvas never flash between route swaps.
 */

const COVER_ID = "bb-route-cover";
const WS_REVEAL_ID = "bb-ws-reveal-cover";
const BOARD_SWITCH_ID = "bb-board-switch-cover";

const DEFAULT_BG = "#f7f8f9";

let releaseTimer: ReturnType<typeof setTimeout> | null = null;
let pending = false;

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Skip when a stronger transition cover is already handling the swap. */
function hasPriorityCover() {
  return Boolean(
    document.getElementById(WS_REVEAL_ID) ||
      document.getElementById(BOARD_SWITCH_ID),
  );
}

export function sampleRouteCoverBackground(): string {
  if (typeof document === "undefined") return DEFAULT_BG;

  const shell = document.querySelector<HTMLElement>("[data-bb-app-shell]");
  if (shell) {
    const bg = getComputedStyle(shell).backgroundImage;
    if (bg && bg !== "none") return bg;
    const color = getComputedStyle(shell).backgroundColor;
    if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
      return color;
    }
  }

  const bodyBg = getComputedStyle(document.body).backgroundColor;
  if (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent") {
    return bodyBg;
  }

  return DEFAULT_BG;
}

export function isRouteCoverPending() {
  return pending || Boolean(document.getElementById(COVER_ID));
}

/** Show solid cover immediately (call before router.push / on link click). */
export function beginRouteCover(background?: string) {
  if (typeof document === "undefined") return null;
  if (prefersReducedMotion()) return null;
  if (hasPriorityCover()) return null;

  pending = true;
  const bg = background ?? sampleRouteCoverBackground();

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
    "z-index:55",
    `background:${bg}`,
    "pointer-events:none",
    "opacity:1",
  ].join(";");

  document.body.style.background = bg;
  document.documentElement.style.background = bg;

  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  // Safety: never leave cover stuck.
  releaseTimer = setTimeout(() => endRouteCover(true), 2500);

  return el;
}

function waitTwoFrames() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Remove cover after the destination has had a chance to paint. */
export async function endRouteCover(immediate = false) {
  if (typeof document === "undefined") return;

  pending = false;
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }

  const el = document.getElementById(COVER_ID);
  if (!el) return;

  if (!immediate) {
    await waitTwoFrames();
  }

  // Another nav may have started while we waited.
  if (pending && !immediate) return;

  el.remove();
}

/**
 * Run a programmatic navigation under the route cover.
 * No-op cover when reduced-motion or a priority cover is active.
 */
export function navigateWithCover(navigate: () => void, background?: string) {
  beginRouteCover(background);
  navigate();
}

/** True when an internal same-origin soft nav should use the cover. */
export function shouldCoverInternalHref(href: string, currentPath: string) {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname.startsWith("/login") || url.pathname.startsWith("/register")) {
      return false;
    }
    const next = `${url.pathname}${url.search}`;
    const cur = currentPath;
    return next !== cur;
  } catch {
    return false;
  }
}
