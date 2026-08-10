"use client";

import {
  FilesetResolver,
  ImageSegmenter,
  type ImageSegmenterResult,
} from "@mediapipe/tasks-vision";
import type { MeetingTileBgMode } from "@/lib/realtime/events";

const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm";
const SELFIE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

export type VirtualBackgroundOptions = {
  mode: MeetingTileBgMode;
  imageUrl?: string | null;
};

/**
 * Client-side Meet-style virtual background:
 * raw camera → MediaPipe selfie mask → canvas composite → captureStream track.
 */
export class VirtualBackgroundProcessor {
  private segmenter: ImageSegmenter | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private outCanvas: HTMLCanvasElement | null = null;
  private personCanvas: HTMLCanvasElement | null = null;
  private maskCanvas: HTMLCanvasElement | null = null;
  private blurCanvas: HTMLCanvasElement | null = null;
  private maskTiny: HTMLCanvasElement | null = null;
  private bgImage: HTMLImageElement | null = null;
  private rawStream: MediaStream | null = null;
  private outputStream: MediaStream | null = null;
  private rafId: number | null = null;
  private running = false;
  private lastTimestamp = -1;
  private mode: MeetingTileBgMode = "NONE";
  private initPromise: Promise<void> | null = null;

  get videoTrack(): MediaStreamTrack | null {
    return this.outputStream?.getVideoTracks()[0] ?? null;
  }

  get isRunning() {
    return this.running;
  }

  async ensureSegmenter() {
    if (this.segmenter) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
        try {
          this.segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: SELFIE_MODEL,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            outputCategoryMask: true,
            outputConfidenceMasks: true,
          });
        } catch {
          this.segmenter = await ImageSegmenter.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: SELFIE_MODEL,
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            outputCategoryMask: true,
            outputConfidenceMasks: true,
          });
        }
      })().catch((error) => {
        this.initPromise = null;
        throw error;
      });
    }
    await this.initPromise;
  }

  async start(rawStream: MediaStream, options: VirtualBackgroundOptions) {
    if (options.mode === "NONE") {
      await this.stop();
      return null;
    }
    if (options.mode === "IMAGE" && !options.imageUrl) {
      throw new Error("IMAGE mode requires an image URL");
    }

    await this.ensureSegmenter();
    this.mode = options.mode;
    this.rawStream = rawStream;

    if (this.mode === "IMAGE" && options.imageUrl) {
      await this.loadBackgroundImage(options.imageUrl);
    } else {
      this.bgImage = null;
    }

    const [rawVideo] = rawStream.getVideoTracks();
    if (!rawVideo) throw new Error("No camera video track");

    if (!this.videoEl) {
      this.videoEl = document.createElement("video");
      this.videoEl.playsInline = true;
      this.videoEl.muted = true;
      this.videoEl.autoplay = true;
    }
    this.videoEl.srcObject = new MediaStream([rawVideo]);
    await this.videoEl.play().catch(() => undefined);

    if (!this.outCanvas) this.outCanvas = document.createElement("canvas");
    if (!this.personCanvas) this.personCanvas = document.createElement("canvas");
    if (!this.maskCanvas) this.maskCanvas = document.createElement("canvas");
    if (!this.blurCanvas) this.blurCanvas = document.createElement("canvas");
    if (!this.maskTiny) this.maskTiny = document.createElement("canvas");

    if (!this.outputStream || this.outputStream.getVideoTracks()[0]?.readyState === "ended") {
      this.outputStream = this.outCanvas.captureStream(30);
    }

    if (!this.running) {
      this.running = true;
      this.loop();
    }

    return this.videoTrack;
  }

  async stop() {
    this.running = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.mode = "NONE";
    this.bgImage = null;
    this.rawStream = null;

    if (this.outputStream) {
      for (const track of this.outputStream.getTracks()) {
        track.stop();
      }
      this.outputStream = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
  }

  dispose() {
    void this.stop();
    this.segmenter?.close();
    this.segmenter = null;
    this.initPromise = null;
    this.videoEl = null;
    this.outCanvas = null;
    this.personCanvas = null;
    this.maskCanvas = null;
    this.blurCanvas = null;
    this.maskTiny = null;
  }

  private async loadBackgroundImage(url: string) {
    if (this.bgImage?.src === url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load background image"));
      img.src = url;
    });
    this.bgImage = img;
  }

  private loop = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const video = this.videoEl;
    const segmenter = this.segmenter;
    const out = this.outCanvas;
    if (!video || !segmenter || !out) return;
    if (video.readyState < 2 || video.videoWidth === 0) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    this.ensureSize(w, h);

    const now = performance.now();
    if (now === this.lastTimestamp) return;
    this.lastTimestamp = now;

    try {
      segmenter.segmentForVideo(video, now, (result) => {
        this.composite(video, result, w, h);
      });
    } catch {
      // Drop frame on transient segmenter errors
    }
  };

  private ensureSize(w: number, h: number) {
    const canvases = [
      this.outCanvas,
      this.personCanvas,
      this.maskCanvas,
      this.blurCanvas,
    ];
    for (const c of canvases) {
      if (c && (c.width !== w || c.height !== h)) {
        c.width = w;
        c.height = h;
      }
    }
  }

  private composite(
    video: HTMLVideoElement,
    result: ImageSegmenterResult,
    w: number,
    h: number,
  ) {
    const out = this.outCanvas;
    const personCanvas = this.personCanvas;
    const maskCanvas = this.maskCanvas;
    const blurCanvas = this.blurCanvas;
    const maskTiny = this.maskTiny;
    if (!out || !personCanvas || !maskCanvas || !blurCanvas || !maskTiny) return;

    const outCtx = out.getContext("2d");
    const personCtx = personCanvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    const blurCtx = blurCanvas.getContext("2d");
    if (!outCtx || !personCtx || !maskCtx || !blurCtx) return;

    const personAlpha = buildPersonAlphaMask(result, maskTiny);
    if (!personAlpha) return;

    maskCtx.clearRect(0, 0, w, h);
    maskCtx.imageSmoothingEnabled = true;
    maskCtx.drawImage(personAlpha, 0, 0, w, h);

    // Background (behind person)
    outCtx.clearRect(0, 0, w, h);
    if (this.mode === "IMAGE" && this.bgImage) {
      drawCover(outCtx, this.bgImage, w, h);
    } else {
      const scale = 0.4;
      const bw = Math.max(2, Math.floor(w * scale));
      const bh = Math.max(2, Math.floor(h * scale));
      blurCtx.clearRect(0, 0, w, h);
      blurCtx.filter = "blur(10px)";
      blurCtx.drawImage(video, 0, 0, bw, bh);
      blurCtx.filter = "none";
      outCtx.filter = "blur(8px)";
      outCtx.drawImage(blurCanvas, 0, 0, bw, bh, 0, 0, w, h);
      outCtx.filter = "none";
    }

    // Person (sharp) on top — destination-in keeps only person alpha
    personCtx.clearRect(0, 0, w, h);
    personCtx.globalCompositeOperation = "source-over";
    personCtx.drawImage(video, 0, 0, w, h);
    personCtx.globalCompositeOperation = "destination-in";
    personCtx.drawImage(maskCanvas, 0, 0, w, h);
    personCtx.globalCompositeOperation = "source-over";

    outCtx.drawImage(personCanvas, 0, 0, w, h);
  }
}

/**
 * Build a tiny canvas where alpha = person opacity.
 * selfie_segmenter on web often encodes category 0 = person, non-zero = background.
 * When confidence masks exist: index 0 = background, index 1 = person (if length >= 2).
 */
function buildPersonAlphaMask(
  result: ImageSegmenterResult,
  maskTiny: HTMLCanvasElement,
): HTMLCanvasElement | null {
  const confidenceMasks = result.confidenceMasks;
  const personConfidence =
    confidenceMasks && confidenceMasks.length >= 2
      ? confidenceMasks[1]
      : null;

  if (personConfidence) {
    const maskW = personConfidence.width;
    const maskH = personConfidence.height;
    const data = personConfidence.getAsFloat32Array();
    if (maskTiny.width !== maskW || maskTiny.height !== maskH) {
      maskTiny.width = maskW;
      maskTiny.height = maskH;
    }
    const tinyCtx = maskTiny.getContext("2d");
    if (!tinyCtx) {
      closeAllMasks(result);
      return null;
    }
    const image = tinyCtx.createImageData(maskW, maskH);
    for (let i = 0; i < data.length; i++) {
      const person = Math.max(0, Math.min(1, data[i]));
      const a = Math.round(person * 255);
      const o = i * 4;
      image.data[o] = 255;
      image.data[o + 1] = 255;
      image.data[o + 2] = 255;
      image.data[o + 3] = a;
    }
    tinyCtx.putImageData(image, 0, 0);
    closeAllMasks(result);
    return maskTiny;
  }

  // Single confidence channel: treat as person probability
  if (confidenceMasks?.[0] && !result.categoryMask) {
    const confidence = confidenceMasks[0];
    const maskW = confidence.width;
    const maskH = confidence.height;
    const data = confidence.getAsFloat32Array();
    if (maskTiny.width !== maskW || maskTiny.height !== maskH) {
      maskTiny.width = maskW;
      maskTiny.height = maskH;
    }
    const tinyCtx = maskTiny.getContext("2d");
    if (!tinyCtx) {
      closeAllMasks(result);
      return null;
    }
    const image = tinyCtx.createImageData(maskW, maskH);
    for (let i = 0; i < data.length; i++) {
      const a = Math.round(Math.max(0, Math.min(1, data[i])) * 255);
      const o = i * 4;
      image.data[o] = 255;
      image.data[o + 1] = 255;
      image.data[o + 2] = 255;
      image.data[o + 3] = a;
    }
    tinyCtx.putImageData(image, 0, 0);
    closeAllMasks(result);
    return maskTiny;
  }

  const categoryMask = result.categoryMask;
  if (!categoryMask) {
    closeAllMasks(result);
    return null;
  }

  const maskW = categoryMask.width;
  const maskH = categoryMask.height;
  const maskData = categoryMask.getAsUint8Array();

  if (maskTiny.width !== maskW || maskTiny.height !== maskH) {
    maskTiny.width = maskW;
    maskTiny.height = maskH;
  }
  const tinyCtx = maskTiny.getContext("2d");
  if (!tinyCtx) {
    closeAllMasks(result);
    return null;
  }

  // Invert: 0 = person → opaque, non-zero = background → transparent
  const image = tinyCtx.createImageData(maskW, maskH);
  for (let i = 0; i < maskData.length; i++) {
    const v = maskData[i] === 0 ? 255 : 0;
    const o = i * 4;
    image.data[o] = 255;
    image.data[o + 1] = 255;
    image.data[o + 2] = 255;
    image.data[o + 3] = v;
  }
  tinyCtx.putImageData(image, 0, 0);
  closeAllMasks(result);
  return maskTiny;
}

function closeAllMasks(result: ImageSegmenterResult) {
  result.categoryMask?.close();
  for (const m of result.confidenceMasks ?? []) {
    m.close();
  }
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth || w;
  const ih = img.naturalHeight || h;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}
