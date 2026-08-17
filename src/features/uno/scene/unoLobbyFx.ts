type BurstFn = (x: number, y: number, color: string) => void;

let burstFn: BurstFn | null = null;

export function bindUnoLobbyBurst(fn: BurstFn | null) {
  burstFn = fn;
}

/** Screen-normalized coords: x/y in -1..1, or omit for center. */
export function playUnoLobbyBurst(color = "#E8C547", x = 0, y = 0.15) {
  burstFn?.(x, y, color);
}
