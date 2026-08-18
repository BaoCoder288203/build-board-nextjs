import { CHESS_SFX_MUTE_KEY } from "../constants/chess.constants";

type SfxKind = "move" | "capture" | "castle" | "check" | "win" | "lose" | "draw" | "tick" | "error";

let ctx: AudioContext | null = null;
let muted = false;
const lastPlayed: Partial<Record<SfxKind, number>> = {};
const MIN_GAP: Record<SfxKind, number> = {
  move: 70,
  capture: 80,
  castle: 120,
  check: 180,
  win: 800,
  lose: 800,
  draw: 800,
  tick: 900,
  error: 200,
};

function loadMute() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CHESS_SFX_MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

muted = typeof window !== "undefined" ? loadMute() : false;

function ensureCtx() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isChessSfxMuted() {
  return muted;
}

export function setChessSfxMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(CHESS_SFX_MUTE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function preloadChessSfx() {
  ensureCtx();
}

export function stopChessSfx() {
  if (ctx && ctx.state === "running") void ctx.suspend();
}

function rateOk(kind: SfxKind) {
  const now = performance.now();
  const prev = lastPlayed[kind] ?? 0;
  if (now - prev < MIN_GAP[kind]) return false;
  lastPlayed[kind] = now;
  return true;
}

function noiseBuffer(audio: AudioContext, seconds: number) {
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.28));
  }
  return buffer;
}

function tone(
  audio: AudioContext,
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType = "triangle",
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}

export function playChessSfx(kind: SfxKind) {
  if (muted || typeof window === "undefined") return;
  if (!rateOk(kind)) return;
  const audio = ensureCtx();
  if (!audio || audio.state !== "running") return;

  try {
    if (kind === "move") {
      const src = audio.createBufferSource();
      src.buffer = noiseBuffer(audio, 0.07);
      const filter = audio.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1200;
      const gain = audio.createGain();
      gain.gain.value = 0.1;
      src.connect(filter).connect(gain).connect(audio.destination);
      src.start();
      return;
    }
    if (kind === "capture") {
      const src = audio.createBufferSource();
      src.buffer = noiseBuffer(audio, 0.11);
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 900;
      filter.Q.value = 0.8;
      const gain = audio.createGain();
      gain.gain.value = 0.13;
      src.connect(filter).connect(gain).connect(audio.destination);
      src.start();
      tone(audio, 220, 0.08, 0.04, "sine");
      return;
    }
    if (kind === "castle") {
      playChessSfx("move");
      window.setTimeout(() => {
        const src = audio.createBufferSource();
        src.buffer = noiseBuffer(audio, 0.06);
        const filter = audio.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 1600;
        const gain = audio.createGain();
        gain.gain.value = 0.08;
        src.connect(filter).connect(gain).connect(audio.destination);
        src.start();
      }, 90);
      return;
    }
    if (kind === "check") {
      tone(audio, 520, 0.1, 0.05, "square");
      window.setTimeout(() => tone(audio, 390, 0.12, 0.045, "square"), 80);
      return;
    }
    if (kind === "win") {
      tone(audio, 523, 0.12, 0.06, "triangle");
      window.setTimeout(() => tone(audio, 659, 0.12, 0.06, "triangle"), 90);
      window.setTimeout(() => tone(audio, 784, 0.2, 0.07, "triangle"), 180);
      return;
    }
    if (kind === "lose") {
      tone(audio, 392, 0.16, 0.05, "sine");
      window.setTimeout(() => tone(audio, 311, 0.22, 0.04, "sine"), 120);
      return;
    }
    if (kind === "draw") {
      tone(audio, 440, 0.12, 0.045, "sine");
      window.setTimeout(() => tone(audio, 440, 0.16, 0.04, "sine"), 140);
      return;
    }
    if (kind === "tick") {
      tone(audio, 880, 0.04, 0.035, "square");
      return;
    }
    if (kind === "error") {
      tone(audio, 180, 0.1, 0.05, "sawtooth");
    }
  } catch {
    /* audio must never block play */
  }
}
