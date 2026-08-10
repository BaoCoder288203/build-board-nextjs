"use client";

import {
  Image as ImageIcon,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  MoreHorizontal,
  PhoneOff,
  Video,
  VideoOff,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { buttonClassName } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import type {
  MeetingItem,
  MeetingParticipant,
  MeetingTileBgMode,
} from "@/lib/realtime/events";
import type { RemotePeer } from "@/hooks/use-meeting-webrtc";

type ActiveScreenShare = {
  userId: string;
  fullName: string;
  stream: MediaStream;
  isLocal: boolean;
};

type MeetingCallModalProps = {
  open: boolean;
  minimized: boolean;
  meName: string;
  meId: string | null;
  meeting: MeetingItem;
  localStream: MediaStream | null;
  remotePeers: RemotePeer[];
  activeScreenShare: ActiveScreenShare | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  canModerate: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onStartScreenShare: () => Promise<void>;
  onStopScreenShare: () => Promise<void>;
  onLeave: () => Promise<void>;
  onEnd?: () => Promise<void>;
  canEnd?: boolean;
  onTransferHost?: (userId: string) => Promise<void>;
  onKick?: (userId: string) => Promise<void>;
  onForceMute?: (
    userId: string,
    opts: { audioEnabled?: boolean; videoEnabled?: boolean },
  ) => void;
  onUpdateAppearance?: (input: {
    displayName?: string | null;
    tileBgMode?: MeetingTileBgMode;
  }) => Promise<void>;
  onUploadBackground?: (file: File) => Promise<void>;
  onToggleMinimize: () => void;
};

function TileMenu({
  isSelf,
  showModeration,
  busy,
  onClose,
  onEditName,
  onSetBackground,
  onUploadBackground,
  onTransferHost,
  onKick,
  onForceMute,
}: {
  isSelf: boolean;
  showModeration: boolean;
  busy?: boolean;
  onClose: () => void;
  onEditName?: () => void;
  onSetBackground?: (mode: MeetingTileBgMode) => void;
  onUploadBackground?: (file: File) => void;
  onTransferHost?: () => void;
  onKick?: () => void;
  onForceMute?: (opts: { audioEnabled?: boolean; videoEnabled?: boolean }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-2 top-9 z-20 min-w-[160px] overflow-hidden rounded-md border border-white/15 bg-black/90 py-1 text-[11px] font-semibold text-white shadow-lg"
    >
      {isSelf ? (
        <>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className="block w-full px-3 py-1.5 text-left hover:bg-white/15 disabled:opacity-50"
            onClick={() => {
              onEditName?.();
              onClose();
            }}
          >
            Edit display name
          </button>
          <div className="my-1 border-t border-white/10" />
          <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white/50">
            Background
          </p>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className="block w-full px-3 py-1.5 text-left hover:bg-white/15 disabled:opacity-50"
            onClick={() => {
              onSetBackground?.("NONE");
              onClose();
            }}
          >
            None
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className="block w-full px-3 py-1.5 text-left hover:bg-white/15 disabled:opacity-50"
            onClick={() => {
              onSetBackground?.("BLUR");
              onClose();
            }}
          >
            Blur
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className="block w-full px-3 py-1.5 text-left hover:bg-white/15 disabled:opacity-50"
            onClick={() => fileRef.current?.click()}
          >
            Upload image…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              onUploadBackground?.(file);
              onClose();
            }}
          />
        </>
      ) : null}
      {showModeration ? (
        <>
          {isSelf ? <div className="my-1 border-t border-white/10" /> : null}
          {onForceMute ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left hover:bg-white/15"
                onClick={() => {
                  onForceMute({ audioEnabled: false });
                  onClose();
                }}
              >
                Mute mic
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left hover:bg-white/15"
                onClick={() => {
                  onForceMute({ videoEnabled: false });
                  onClose();
                }}
              >
                Stop cam
              </button>
            </>
          ) : null}
          {onTransferHost ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left hover:bg-white/15"
              onClick={() => {
                onTransferHost();
                onClose();
              }}
            >
              Make host
            </button>
          ) : null}
          {onKick ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left text-rose-200 hover:bg-rose-500/30"
              onClick={() => {
                onKick();
                onClose();
              }}
            >
              Remove
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function StreamTile({
  title,
  avatar = null,
  stream,
  muted = false,
  audioEnabled = true,
  videoEnabled = true,
  screenSharing = false,
  compact = false,
  isHost = false,
  isSelf = false,
  tileBgMode = "NONE",
  tileBgUrl = null,
  showMenu = false,
  showModeration = false,
  appearanceBusy = false,
  onEditName,
  onSetBackground,
  onUploadBackground,
  onTransferHost,
  onKick,
  onForceMute,
}: {
  title: string;
  avatar?: string | null;
  stream: MediaStream | null;
  muted?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
  compact?: boolean;
  isHost?: boolean;
  isSelf?: boolean;
  tileBgMode?: MeetingTileBgMode;
  tileBgUrl?: string | null;
  showMenu?: boolean;
  showModeration?: boolean;
  appearanceBusy?: boolean;
  onEditName?: () => void;
  onSetBackground?: (mode: MeetingTileBgMode) => void;
  onUploadBackground?: (file: File) => void;
  onTransferHost?: () => void;
  onKick?: () => void;
  onForceMute?: (opts: { audioEnabled?: boolean; videoEnabled?: boolean }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const showPlaceholder = !videoEnabled;
  const hasImageBg = tileBgMode === "IMAGE" && Boolean(tileBgUrl);
  const hasBlurBg = tileBgMode === "BLUR";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (!stream) return;

    const refresh = () => {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      void video.play().catch(() => undefined);
    };
    stream.addEventListener("addtrack", refresh);
    stream.addEventListener("removetrack", refresh);
    return () => {
      stream.removeEventListener("addtrack", refresh);
      stream.removeEventListener("removetrack", refresh);
    };
  }, [stream]);

  return (
    <div
      className={`relative min-h-0 overflow-hidden rounded-xl border border-bb-border bg-black ${
        compact ? "aspect-video w-full" : "h-full min-h-[160px] w-full"
      }`}
    >
      {hasImageBg ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${tileBgUrl})` }}
          aria-hidden
        />
      ) : null}
      {hasBlurBg ? (
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950"
          aria-hidden
        >
          <div className="absolute inset-0 backdrop-blur-2xl" />
        </div>
      ) : null}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`absolute inset-0 h-full w-full bg-transparent ${
          showPlaceholder ? "opacity-0" : "object-cover object-center"
        } -scale-x-100`}
      />
      {showPlaceholder ? (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-100 ${
            hasImageBg || hasBlurBg ? "bg-black/35" : "bg-slate-900"
          }`}
        >
          <UserAvatar
            name={title.replace(/\s*\(You\)\s*$/, "")}
            avatar={avatar}
            size="xl"
            className="!h-14 !w-14 !text-sm"
            fallbackClassName="bg-slate-700/90 text-slate-100"
          />
          <span className="inline-flex items-center gap-1 text-xs text-slate-300">
            <VideoOff className="h-3.5 w-3.5" aria-hidden />
            Camera off
          </span>
          {hasImageBg ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <ImageIcon className="h-3 w-3" aria-hidden />
              Custom background
            </span>
          ) : null}
        </div>
      ) : null}
      {isHost ? (
        <span className="absolute left-2 top-2 rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bb-ink">
          Host
        </span>
      ) : null}
      {showMenu ? (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            aria-label="Tile actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-black/70 text-white hover:bg-black/90"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
          </button>
          {menuOpen ? (
            <TileMenu
              isSelf={isSelf}
              showModeration={showModeration}
              busy={appearanceBusy}
              onClose={() => setMenuOpen(false)}
              onEditName={onEditName}
              onSetBackground={onSetBackground}
              onUploadBackground={onUploadBackground}
              onTransferHost={onTransferHost}
              onKick={onKick}
              onForceMute={onForceMute}
            />
          ) : null}
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-xs text-white">
        <span className="truncate font-semibold">{title}</span>
        <span className="inline-flex items-center gap-2">
          <span
            className={audioEnabled ? "text-emerald-300" : "text-rose-300"}
            title={audioEnabled ? "Mic on" : "Mic off"}
          >
            {audioEnabled ? (
              <Mic className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <MicOff className="h-3.5 w-3.5" aria-hidden />
            )}
          </span>
          <span
            className={videoEnabled ? "text-emerald-300" : "text-rose-300"}
            title={videoEnabled ? "Camera on" : "Camera off"}
          >
            {videoEnabled ? (
              <Video className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <VideoOff className="h-3.5 w-3.5" aria-hidden />
            )}
          </span>
          {screenSharing ? (
            <span className="text-sky-300" title="Screen sharing">
              <Monitor className="h-3.5 w-3.5" aria-hidden />
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function ScreenPane({
  title,
  stream,
}: {
  title: string;
  stream: MediaStream;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (!stream) return;

    const refresh = () => {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      void video.play().catch(() => undefined);
    };
    stream.addEventListener("addtrack", refresh);
    stream.addEventListener("removetrack", refresh);
    return () => {
      stream.removeEventListener("addtrack", refresh);
      stream.removeEventListener("removetrack", refresh);
    };
  }, [stream]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl border border-bb-border bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-contain"
      />
      <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white">
        <Monitor className="h-3.5 w-3.5" aria-hidden />
        {title}
      </div>
    </div>
  );
}

function participantLook(
  participants: MeetingParticipant[],
  userId: string | null | undefined,
) {
  if (!userId) return null;
  return participants.find((p) => p.userId === userId && p.leftAt == null) ?? null;
}

export function MeetingCallModal({
  open,
  minimized,
  meName,
  meId,
  meeting,
  localStream,
  remotePeers,
  activeScreenShare,
  audioEnabled,
  videoEnabled,
  screenSharing,
  canModerate,
  onToggleAudio,
  onToggleVideo,
  onStartScreenShare,
  onStopScreenShare,
  onLeave,
  onEnd,
  canEnd = false,
  onTransferHost,
  onKick,
  onForceMute,
  onUpdateAppearance,
  onUploadBackground,
  onToggleMinimize,
}: MeetingCallModalProps) {
  const [splitRatio, setSplitRatio] = useState(0.62);
  const [dockPos, setDockPos] = useState({ x: 0, y: 0 });
  const [dockReady, setDockReady] = useState(false);
  const [appearanceBusy, setAppearanceBusy] = useState(false);
  const draggingDivider = useRef(false);
  const draggingDock = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dockRef = useRef<HTMLDivElement | null>(null);

  const totalTiles = remotePeers.length + 1;
  const gridClass = useMemo(() => {
    if (totalTiles <= 1) return "grid-cols-1";
    if (totalTiles <= 2) return "grid-cols-1 md:grid-cols-2";
    if (totalTiles <= 4) return "grid-cols-2";
    return "grid-cols-2 lg:grid-cols-3";
  }, [totalTiles]);

  const meParticipant = useMemo(
    () => participantLook(meeting.participants, meId),
    [meeting.participants, meId],
  );
  const displayMeName = meParticipant?.fullName || meName;

  useEffect(() => {
    if (!open || !minimized || dockReady) return;
    const width = 320;
    const height = 240;
    setDockPos({
      x: Math.max(16, window.innerWidth - width - 16),
      y: Math.max(16, window.innerHeight - height - 16),
    });
    setDockReady(true);
  }, [dockReady, minimized, open]);

  useEffect(() => {
    if (!minimized) setDockReady(false);
  }, [minimized]);

  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  const onDividerPointerDown = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    draggingDivider.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onDividerPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!draggingDivider.current) return;
    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const next = (e.clientX - rect.left) / rect.width;
    setSplitRatio(Math.min(0.75, Math.max(0.3, next)));
  }, []);

  const onDividerPointerUp = useCallback(() => {
    draggingDivider.current = false;
  }, []);

  const onDockPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      draggingDock.current = true;
      dragOffset.current = {
        x: e.clientX - dockPos.x,
        y: e.clientY - dockPos.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [dockPos.x, dockPos.y],
  );

  const onDockPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!draggingDock.current) return;
    const el = dockRef.current;
    const width = el?.offsetWidth ?? 320;
    const height = el?.offsetHeight ?? 240;
    const nextX = e.clientX - dragOffset.current.x;
    const nextY = e.clientY - dragOffset.current.y;
    setDockPos({
      x: Math.min(window.innerWidth - width - 8, Math.max(8, nextX)),
      y: Math.min(window.innerHeight - height - 8, Math.max(8, nextY)),
    });
  }, []);

  const onDockPointerUp = useCallback(() => {
    draggingDock.current = false;
  }, []);

  const runAppearance = useCallback(
    async (fn: () => Promise<void>) => {
      if (!onUpdateAppearance && !onUploadBackground) return;
      setAppearanceBusy(true);
      try {
        await fn();
      } finally {
        setAppearanceBusy(false);
      }
    },
    [onUpdateAppearance, onUploadBackground],
  );

  const handleEditName = useCallback(() => {
    if (!onUpdateAppearance) return;
    const current = meParticipant?.displayName ?? "";
    const next = window.prompt("Display name for this call", current);
    if (next === null) return;
    const trimmed = next.trim();
    void runAppearance(() =>
      onUpdateAppearance({
        displayName: trimmed.length === 0 ? null : trimmed,
      }),
    );
  }, [meParticipant?.displayName, onUpdateAppearance, runAppearance]);

  const handleSetBackground = useCallback(
    (mode: MeetingTileBgMode) => {
      if (!onUpdateAppearance) return;
      if (mode === "IMAGE") return;
      void runAppearance(() => onUpdateAppearance({ tileBgMode: mode }));
    },
    [onUpdateAppearance, runAppearance],
  );

  const handleUploadBackground = useCallback(
    (file: File) => {
      if (!onUploadBackground) return;
      void runAppearance(() => onUploadBackground(file));
    },
    [onUploadBackground, runAppearance],
  );

  if (!open) return null;

  const hostUserId =
    meeting.participants.find((p) => p.leftAt == null && p.isHost)?.userId ??
    null;
  const iAmHost = Boolean(meId && hostUserId === meId);

  const selfTileProps = {
    title: `${displayMeName} (You)`,
    avatar: meParticipant?.avatar ?? null,
    stream: localStream,
    muted: true as const,
    audioEnabled,
    videoEnabled,
    screenSharing,
    isHost: iAmHost,
    isSelf: true,
    tileBgMode: (meParticipant?.tileBgMode ?? "NONE") as MeetingTileBgMode,
    tileBgUrl: meParticipant?.tileBgUrl ?? null,
    showMenu: Boolean(onUpdateAppearance || onUploadBackground),
    appearanceBusy,
    onEditName: handleEditName,
    onSetBackground: handleSetBackground,
    onUploadBackground: handleUploadBackground,
  };

  const renderPeerTile = (peer: RemotePeer, compactTile: boolean) => {
    const meta = participantLook(meeting.participants, peer.userId);
    return (
      <StreamTile
        key={peer.userId}
        title={meta?.fullName || peer.fullName}
        avatar={meta?.avatar ?? null}
        stream={peer.stream}
        audioEnabled={peer.audioEnabled}
        videoEnabled={peer.videoEnabled}
        screenSharing={peer.screenSharing}
        compact={compactTile}
        isHost={peer.userId === hostUserId}
        tileBgMode={(meta?.tileBgMode ?? "NONE") as MeetingTileBgMode}
        tileBgUrl={meta?.tileBgUrl ?? null}
        showMenu={canModerate && iAmHost}
        showModeration={canModerate && iAmHost}
        onForceMute={
          canModerate && onForceMute
            ? (opts) => onForceMute(peer.userId, opts)
            : undefined
        }
        onTransferHost={
          canModerate && onTransferHost
            ? () => void onTransferHost(peer.userId)
            : undefined
        }
        onKick={
          canModerate && onKick ? () => void onKick(peer.userId) : undefined
        }
      />
    );
  };

  const participantTiles = (
    <>
      <StreamTile {...selfTileProps} />
      {remotePeers.map((peer) => renderPeerTile(peer, false))}
    </>
  );

  const sidebarTiles = (
    <>
      <StreamTile {...selfTileProps} compact />
      {remotePeers.map((peer) => renderPeerTile(peer, true))}
    </>
  );

  if (minimized) {
    return (
      <div
        ref={dockRef}
        className="fixed z-50 w-[320px] overflow-hidden rounded-xl border border-white/20 bg-bb-ink/90 shadow-bb-lg backdrop-blur"
        style={{ left: dockPos.x, top: dockPos.y }}
      >
        <div
          className="flex cursor-grab items-center justify-between border-b border-white/10 px-3 py-2 text-white active:cursor-grabbing"
          onPointerDown={onDockPointerDown}
          onPointerMove={onDockPointerMove}
          onPointerUp={onDockPointerUp}
        >
          <p className="truncate text-xs font-semibold">
            {meeting.title || "Board meeting"} ({meeting.participants.length})
          </p>
          <button
            type="button"
            onClick={onToggleMinimize}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/15"
            aria-label="Expand call"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
        <div className="p-2">
          <StreamTile
            title={`${displayMeName} (You)`}
            avatar={meParticipant?.avatar ?? null}
            stream={localStream}
            muted
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            screenSharing={screenSharing}
            isSelf
            tileBgMode={(meParticipant?.tileBgMode ?? "NONE") as MeetingTileBgMode}
            tileBgUrl={meParticipant?.tileBgUrl ?? null}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bb-ink/85 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">{meeting.title || "Board meeting"}</p>
          <p className="text-xs text-white/70">
            {meeting.participants.length} participants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMinimize}
            className={buttonClassName({
              variant: "secondary",
              size: "sm",
              className: "border-white/20 bg-white/10 text-white hover:bg-white/20",
            })}
          >
            <Minimize2 className="h-4 w-4" aria-hidden />
            Minimize
          </button>
          <button
            type="button"
            onClick={() => void onLeave()}
            className={buttonClassName({
              variant: "secondary",
              size: "sm",
              className: "border-white/20 bg-white/10 text-white hover:bg-white/20",
            })}
          >
            Leave
          </button>
          {canEnd && onEnd ? (
            <button
              type="button"
              onClick={() => void onEnd()}
              className={buttonClassName({
                variant: "secondary",
                size: "sm",
                className:
                  "border-red-300/40 bg-red-500/20 text-red-100 hover:bg-red-500/30",
              })}
            >
              <PhoneOff className="h-4 w-4" aria-hidden />
              End call
            </button>
          ) : null}
        </div>
      </div>

      {activeScreenShare ? (
        <div ref={splitContainerRef} className="flex min-h-0 flex-1">
          <div
            className="min-h-0 p-3 pr-0"
            style={{ width: `${splitRatio * 100}%` }}
          >
            <ScreenPane
              title={`${activeScreenShare.fullName}'s screen`}
              stream={activeScreenShare.stream}
            />
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize screen share"
            className="group relative z-10 w-2 shrink-0 cursor-col-resize touch-none"
            onPointerDown={onDividerPointerDown}
            onPointerMove={onDividerPointerMove}
            onPointerUp={onDividerPointerUp}
            onPointerCancel={onDividerPointerUp}
          >
            <div className="absolute inset-y-3 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white/25 transition group-hover:bg-sky-300/80" />
          </div>
          <div
            className="min-h-0 overflow-y-auto p-3 pl-0"
            style={{ width: `${(1 - splitRatio) * 100}%` }}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sidebarTiles}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`grid min-h-0 flex-1 ${gridClass} auto-rows-fr gap-3 overflow-hidden p-4`}
        >
          {participantTiles}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={onToggleAudio}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            className: audioEnabled
              ? "bg-white/90 text-bb-ink"
              : "border-red-300/40 bg-red-500/20 text-red-100",
          })}
        >
          {audioEnabled ? <Mic className="h-4 w-4" aria-hidden /> : <MicOff className="h-4 w-4" aria-hidden />}
          {audioEnabled ? "Mute" : "Unmute"}
        </button>
        <button
          type="button"
          onClick={onToggleVideo}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            className: videoEnabled
              ? "bg-white/90 text-bb-ink"
              : "border-red-300/40 bg-red-500/20 text-red-100",
          })}
        >
          {videoEnabled ? <Video className="h-4 w-4" aria-hidden /> : <VideoOff className="h-4 w-4" aria-hidden />}
          {videoEnabled ? "Camera off" : "Camera on"}
        </button>
        <button
          type="button"
          onClick={() =>
            void (screenSharing ? onStopScreenShare() : onStartScreenShare())
          }
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            className: screenSharing
              ? "border-sky-300/40 bg-sky-500/20 text-sky-100"
              : "bg-white/90 text-bb-ink",
          })}
        >
          {screenSharing ? (
            <MonitorOff className="h-4 w-4" aria-hidden />
          ) : (
            <Monitor className="h-4 w-4" aria-hidden />
          )}
          {screenSharing ? "Stop share" : "Share screen"}
        </button>
      </div>
    </div>
  );
}
