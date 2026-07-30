"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectRealtime } from "@/lib/realtime/socket-client";
import {
  CLIENT_EVENT,
  SERVER_EVENT,
  type MeetingMediaStatePayload,
  type MeetingMediaSyncPayload,
  type MeetingModerationPayload,
  type MeetingParticipant,
  type MeetingSignalAnswerPayload,
  type MeetingSignalIcePayload,
  type MeetingSignalOfferPayload,
} from "@/lib/realtime/events";
import { toastFromError } from "@/lib/toast";

export type RemotePeer = {
  userId: string;
  fullName: string;
  stream: MediaStream;
  screenStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  screenStreamId: string | null;
};

type UseMeetingWebRtcInput = {
  meetingId: string | null;
  enabled: boolean;
  meId: string | null;
  participants: MeetingParticipant[];
};

type IceServerConfig = RTCIceServer[];

type PeerSession = {
  pc: RTCPeerConnection;
  iceQueue: RTCIceCandidateInit[];
  makingOffer: boolean;
  polite: boolean;
  chain: Promise<void>;
};

function parseIceServers(): IceServerConfig {
  const fallback: IceServerConfig = [{ urls: "stun:stun.l.google.com:19302" }];
  const raw = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed as IceServerConfig;
  } catch {
    return fallback;
  }
}

function streamHasLiveTracks(stream: MediaStream | null) {
  if (!stream) return false;
  return stream.getTracks().some((track) => track.readyState === "live");
}

const ICE_SERVERS = parseIceServers();

export function useMeetingWebRtc({
  meetingId,
  enabled,
  meId,
  participants,
}: UseMeetingWebRtcInput) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(
    null,
  );
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const sessionsRef = useRef<Map<string, PeerSession>>(new Map());
  const remoteStreamRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteScreenStreamRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteScreenIdRef = useRef<Map<string, string | null>>(new Map());
  const remoteSharingRef = useRef<Map<string, boolean>>(new Map());
  const localRef = useRef<MediaStream | null>(null);
  const localScreenRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenSenderRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const audioEnabledRef = useRef(true);
  const videoEnabledRef = useRef(true);
  const screenSharingRef = useRef(false);
  const meIdRef = useRef(meId);
  const meetingIdRef = useRef(meetingId);
  const opChainRef = useRef<Promise<void>>(Promise.resolve());

  meIdRef.current = meId;
  meetingIdRef.current = meetingId;

  const activeParticipants = useMemo(
    () => participants.filter((p) => p.leftAt == null),
    [participants],
  );

  const runSerialized = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = opChainRef.current.then(fn, fn);
    opChainRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, []);

  const emitMediaSnapshot = useCallback(() => {
    const id = meetingIdRef.current;
    if (!id) return;
    const socket = connectRealtime();
    socket.emit(CLIENT_EVENT.MEETING_MEDIA_STATE, {
      meetingId: id,
      audioEnabled: audioEnabledRef.current,
      videoEnabled: videoEnabledRef.current,
      screenSharing: screenSharingRef.current,
      screenStreamId: screenSharingRef.current
        ? (localScreenRef.current?.id ?? null)
        : null,
    });
  }, []);

  const upsertRemotePeer = useCallback(
    (
      userId: string,
      updates: Partial<Omit<RemotePeer, "userId" | "fullName">> & {
        fullName?: string;
      },
    ) => {
      setRemotePeers((prev) => {
        const current = prev.find((p) => p.userId === userId);
        if (!current) {
          const name =
            updates.fullName ??
            activeParticipants.find((p) => p.userId === userId)?.fullName ??
            "Teammate";
          const next: RemotePeer = {
            userId,
            fullName: name,
            stream:
              updates.stream ??
              remoteStreamRef.current.get(userId) ??
              new MediaStream(),
            screenStream:
              updates.screenStream !== undefined
                ? updates.screenStream
                : (remoteScreenStreamRef.current.get(userId) ?? null),
            audioEnabled: updates.audioEnabled ?? true,
            videoEnabled: updates.videoEnabled ?? true,
            screenSharing: updates.screenSharing ?? false,
            screenStreamId:
              updates.screenStreamId !== undefined
                ? updates.screenStreamId
                : (remoteScreenIdRef.current.get(userId) ?? null),
          };
          return [...prev, next];
        }
        return prev.map((peer) =>
          peer.userId === userId
            ? {
                ...peer,
                fullName: updates.fullName ?? peer.fullName,
                stream: updates.stream ?? peer.stream,
                screenStream:
                  updates.screenStream !== undefined
                    ? updates.screenStream
                    : peer.screenStream,
                audioEnabled: updates.audioEnabled ?? peer.audioEnabled,
                videoEnabled: updates.videoEnabled ?? peer.videoEnabled,
                screenSharing: updates.screenSharing ?? peer.screenSharing,
                screenStreamId:
                  updates.screenStreamId !== undefined
                    ? updates.screenStreamId
                    : peer.screenStreamId,
              }
            : peer,
        );
      });
    },
    [activeParticipants],
  );

  const applyMediaFlags = useCallback(
    (
      userId: string,
      flags: {
        fullName?: string;
        audioEnabled: boolean;
        videoEnabled: boolean;
        screenSharing: boolean;
        screenStreamId?: string | null;
      },
    ) => {
      const screenStreamId = flags.screenStreamId ?? null;
      remoteScreenIdRef.current.set(userId, screenStreamId);
      remoteSharingRef.current.set(userId, flags.screenSharing);
      if (!flags.screenSharing) {
        remoteScreenStreamRef.current.delete(userId);
        upsertRemotePeer(userId, {
          fullName: flags.fullName,
          audioEnabled: flags.audioEnabled,
          videoEnabled: flags.videoEnabled,
          screenSharing: false,
          screenStreamId: null,
          screenStream: null,
        });
        return;
      }
      upsertRemotePeer(userId, {
        fullName: flags.fullName,
        audioEnabled: flags.audioEnabled,
        videoEnabled: flags.videoEnabled,
        screenSharing: true,
        screenStreamId,
      });
    },
    [upsertRemotePeer],
  );

  const flushIce = useCallback(async (session: PeerSession) => {
    if (!session.pc.remoteDescription) return;
    const queued = session.iceQueue.splice(0, session.iceQueue.length);
    for (const candidate of queued) {
      try {
        await session.pc.addIceCandidate(candidate);
      } catch {
        // ignore stale candidates
      }
    }
  }, []);

  const enqueuePeer = useCallback((userId: string, task: () => Promise<void>) => {
    const session = sessionsRef.current.get(userId);
    if (!session) return Promise.resolve();
    const next = session.chain.then(task, task);
    session.chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (localRef.current && streamHasLiveTracks(localRef.current)) {
      return localRef.current;
    }
    if (localRef.current) {
      for (const track of localRef.current.getTracks()) {
        track.stop();
      }
      localRef.current = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const [videoTrack] = stream.getVideoTracks();
    if (videoTrack) {
      videoTrack.contentHint = "motion";
      videoTrack.enabled = videoEnabledRef.current;
    }
    for (const audioTrack of stream.getAudioTracks()) {
      audioTrack.enabled = audioEnabledRef.current;
    }
    cameraTrackRef.current = videoTrack ?? null;
    localRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const classifyRemoteVideo = useCallback(
    (userId: string, _track: MediaStreamTrack, inbound: MediaStream | null) => {
      const knownScreenId = remoteScreenIdRef.current.get(userId);
      if (knownScreenId && inbound?.id === knownScreenId) {
        return "screen" as const;
      }
      const cameraStream = remoteStreamRef.current.get(userId);
      const cameraHasVideo = Boolean(cameraStream?.getVideoTracks().length);
      const inboundHasAudio = Boolean(inbound?.getAudioTracks().length);
      if (inboundHasAudio) return "camera" as const;
      if (!cameraHasVideo) return "camera" as const;
      // Camera already present: extra video is screen when sharing or different stream
      if (remoteSharingRef.current.get(userId)) return "screen" as const;
      if (inbound && cameraStream && inbound.id !== cameraStream.id) {
        return "screen" as const;
      }
      return "screen" as const;
    },
    [],
  );

  const handleRemoteTrack = useCallback(
    (userId: string, event: RTCTrackEvent) => {
      const track = event.track;
      const inbound = event.streams[0] ?? null;

      if (track.kind === "audio") {
        let cameraStream = remoteStreamRef.current.get(userId);
        if (!cameraStream) {
          cameraStream = inbound ?? new MediaStream();
          remoteStreamRef.current.set(userId, cameraStream);
        }
        if (!cameraStream.getAudioTracks().some((t) => t.id === track.id)) {
          cameraStream.addTrack(track);
        }
        upsertRemotePeer(userId, { stream: cameraStream });
        return;
      }

      if (track.kind !== "video") return;

      const kind = classifyRemoteVideo(userId, track, inbound);
      if (kind === "screen") {
        let screenStream = remoteScreenStreamRef.current.get(userId);
        if (!screenStream) {
          screenStream = inbound ? new MediaStream([track]) : new MediaStream([track]);
          // Prefer keeping inbound identity when available for msid match
          if (inbound) {
            screenStream = inbound;
            if (!inbound.getVideoTracks().some((t) => t.id === track.id)) {
              inbound.addTrack(track);
            }
          }
          remoteScreenStreamRef.current.set(userId, screenStream);
          remoteScreenIdRef.current.set(userId, screenStream.id);
        } else if (!screenStream.getTracks().some((t) => t.id === track.id)) {
          screenStream.addTrack(track);
        }
        upsertRemotePeer(userId, {
          screenStream,
          screenSharing: true,
          screenStreamId: screenStream.id,
        });
        track.onended = () => {
          remoteScreenStreamRef.current.delete(userId);
          remoteScreenIdRef.current.set(userId, null);
          upsertRemotePeer(userId, {
            screenStream: null,
            screenSharing: false,
            screenStreamId: null,
          });
        };
        return;
      }

      let cameraStream = remoteStreamRef.current.get(userId);
      if (!cameraStream) {
        cameraStream = inbound ?? new MediaStream();
        remoteStreamRef.current.set(userId, cameraStream);
      }
      if (!cameraStream.getVideoTracks().some((t) => t.id === track.id)) {
        cameraStream.addTrack(track);
      }
      upsertRemotePeer(userId, { stream: cameraStream });

      track.onmute = () => {
        // Soft signal — authoritative flags still come from media:state
      };
    },
    [classifyRemoteVideo, upsertRemotePeer],
  );

  const attachScreenTrackToPeer = useCallback(
    async (targetUserId: string, screenTrack: MediaStreamTrack) => {
      const session = sessionsRef.current.get(targetUserId);
      if (!session || !localScreenRef.current) return;
      const existing = screenSenderRef.current.get(targetUserId);
      if (existing) {
        await existing.replaceTrack(screenTrack);
        return;
      }
      const sender = session.pc.addTrack(screenTrack, localScreenRef.current);
      screenSenderRef.current.set(targetUserId, sender);
    },
    [],
  );

  const detachScreenTrackFromPeer = useCallback((targetUserId: string) => {
    const session = sessionsRef.current.get(targetUserId);
    const sender = screenSenderRef.current.get(targetUserId);
    if (session && sender) {
      try {
        session.pc.removeTrack(sender);
      } catch {
        // ignore
      }
    }
    screenSenderRef.current.delete(targetUserId);
  }, []);

  const createOfferFor = useCallback(
    async (targetUserId: string) => {
      const session = sessionsRef.current.get(targetUserId);
      const id = meetingIdRef.current;
      if (!session || !id) return;
      if (session.pc.signalingState !== "stable") return;
      try {
        session.makingOffer = true;
        const offer = await session.pc.createOffer();
        if (session.pc.signalingState !== "stable") return;
        await session.pc.setLocalDescription(offer);
        if (!offer.sdp) return;
        const socket = connectRealtime();
        socket.emit(CLIENT_EVENT.MEETING_SIGNAL_OFFER, {
          meetingId: id,
          toUserId: targetUserId,
          sdp: offer.sdp,
        });
      } finally {
        session.makingOffer = false;
      }
    },
    [],
  );

  const recoverPeer = useCallback(
    async (targetUserId: string) => {
      await enqueuePeer(targetUserId, async () => {
        const session = sessionsRef.current.get(targetUserId);
        const self = meIdRef.current;
        if (!session || !self) return;
        try {
          session.pc.restartIce();
        } catch {
          // ignore
        }
        if (self.localeCompare(targetUserId) < 0) {
          await createOfferFor(targetUserId);
        }
      });
    },
    [createOfferFor, enqueuePeer],
  );

  const ensurePeerSession = useCallback(
    async (targetUserId: string) => {
      const existing = sessionsRef.current.get(targetUserId);
      if (existing) return existing;

      const selfId = meIdRef.current;
      if (!selfId) throw new Error("Missing local user id");

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const session: PeerSession = {
        pc,
        iceQueue: [],
        makingOffer: false,
        polite: selfId.localeCompare(targetUserId) > 0,
        chain: Promise.resolve(),
      };
      sessionsRef.current.set(targetUserId, session);

      const local = await ensureLocalStream();
      for (const track of local.getTracks()) {
        pc.addTrack(track, local);
      }
      if (screenTrackRef.current && localScreenRef.current) {
        const sender = pc.addTrack(screenTrackRef.current, localScreenRef.current);
        screenSenderRef.current.set(targetUserId, sender);
      }

      pc.ontrack = (event) => {
        handleRemoteTrack(targetUserId, event);
      };

      pc.onicecandidate = (event) => {
        const id = meetingIdRef.current;
        if (!event.candidate || !id) return;
        const socket = connectRealtime();
        socket.emit(CLIENT_EVENT.MEETING_SIGNAL_ICE, {
          meetingId: id,
          toUserId: targetUserId,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? null,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          void recoverPeer(targetUserId);
        }
      };

      return session;
    },
    [ensureLocalStream, handleRemoteTrack, recoverPeer],
  );

  const removePeer = useCallback((userId: string) => {
    const session = sessionsRef.current.get(userId);
    if (session) {
      session.pc.ontrack = null;
      session.pc.onicecandidate = null;
      session.pc.onconnectionstatechange = null;
      session.pc.close();
      sessionsRef.current.delete(userId);
    }
    screenSenderRef.current.delete(userId);
    remoteStreamRef.current.delete(userId);
    remoteScreenStreamRef.current.delete(userId);
    remoteScreenIdRef.current.delete(userId);
    remoteSharingRef.current.delete(userId);
    setRemotePeers((prev) => prev.filter((peer) => peer.userId !== userId));
  }, []);

  const renegotiateAll = useCallback(async () => {
    const peerIds = [...sessionsRef.current.keys()];
    for (const peerId of peerIds) {
      await enqueuePeer(peerId, async () => {
        await createOfferFor(peerId);
      });
    }
  }, [createOfferFor, enqueuePeer]);

  const toggleAudio = useCallback(() => {
    const local = localRef.current;
    if (!local) return;
    const currentlyOn = local.getAudioTracks().some((track) => track.enabled);
    const next = !currentlyOn;
    for (const track of local.getAudioTracks()) {
      track.enabled = next;
    }
    audioEnabledRef.current = next;
    setAudioEnabled(next);
    emitMediaSnapshot();
  }, [emitMediaSnapshot]);

  const toggleVideo = useCallback(() => {
    const cameraTrack = cameraTrackRef.current;
    if (!cameraTrack || cameraTrack.readyState === "ended") return;
    const next = !cameraTrack.enabled;
    cameraTrack.enabled = next;
    videoEnabledRef.current = next;
    setVideoEnabled(next);
    emitMediaSnapshot();
  }, [emitMediaSnapshot]);

  const applyForcedMedia = useCallback(
    (opts: { audioEnabled?: boolean; videoEnabled?: boolean }) => {
      if (opts.audioEnabled !== undefined) {
        const local = localRef.current;
        if (local) {
          for (const track of local.getAudioTracks()) {
            track.enabled = opts.audioEnabled;
          }
        }
        audioEnabledRef.current = opts.audioEnabled;
        setAudioEnabled(opts.audioEnabled);
      }
      if (opts.videoEnabled !== undefined) {
        const cameraTrack = cameraTrackRef.current;
        if (cameraTrack && cameraTrack.readyState !== "ended") {
          cameraTrack.enabled = opts.videoEnabled;
        }
        videoEnabledRef.current = opts.videoEnabled;
        setVideoEnabled(opts.videoEnabled);
      }
      emitMediaSnapshot();
    },
    [emitMediaSnapshot],
  );

  const requestForceMute = useCallback(
    (targetUserId: string, opts: { audioEnabled?: boolean; videoEnabled?: boolean }) => {
      const id = meetingIdRef.current;
      if (!id) return;
      const socket = connectRealtime();
      socket.emit(CLIENT_EVENT.MEETING_MODERATION, {
        meetingId: id,
        targetUserId,
        ...opts,
      });
    },
    [],
  );

  const stopScreenShare = useCallback(async () => {
    await runSerialized(async () => {
      const screenTrack = screenTrackRef.current;
      if (!screenTrack) return;

      for (const userId of [...sessionsRef.current.keys()]) {
        detachScreenTrackFromPeer(userId);
      }

      screenTrack.stop();
      screenTrackRef.current = null;
      localScreenRef.current = null;
      setLocalScreenStream(null);
      screenSharingRef.current = false;
      setScreenSharing(false);
      emitMediaSnapshot();
      await renegotiateAll();
    });
  }, [
    detachScreenTrackFromPeer,
    emitMediaSnapshot,
    renegotiateAll,
    runSerialized,
  ]);

  const startScreenShare = useCallback(async () => {
    await runSerialized(async () => {
      if (screenSharingRef.current) return;
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const [track] = display.getVideoTracks();
      if (!track) return;
      track.contentHint = "detail";
      screenTrackRef.current = track;
      const screenStream = new MediaStream([track]);
      localScreenRef.current = screenStream;
      setLocalScreenStream(screenStream);

      screenSharingRef.current = true;
      setScreenSharing(true);
      // Announce screenStreamId before renegotiation so remotes can classify tracks
      emitMediaSnapshot();

      for (const userId of [...sessionsRef.current.keys()]) {
        await attachScreenTrackToPeer(userId, track);
      }

      track.onended = () => {
        void stopScreenShare();
      };

      await renegotiateAll();
    });
  }, [
    attachScreenTrackToPeer,
    emitMediaSnapshot,
    renegotiateAll,
    runSerialized,
    stopScreenShare,
  ]);

  useEffect(() => {
    if (!enabled || !meetingId || !meId) return;
    const socket = connectRealtime();
    void ensureLocalStream()
      .then(() => emitMediaSnapshot())
      .catch((error) => {
        toastFromError(error, "Cannot access camera/microphone");
      });

    const onOffer = (payload: MeetingSignalOfferPayload) => {
      if (payload.toUserId !== meId || payload.meetingId !== meetingId) return;
      void enqueuePeer(payload.fromUserId, async () => {
        const session = await ensurePeerSession(payload.fromUserId);
        const offerCollision =
          session.makingOffer || session.pc.signalingState !== "stable";
        if (offerCollision) {
          if (!session.polite) return;
          try {
            await session.pc.setLocalDescription({ type: "rollback" });
          } catch {
            // ignore
          }
        }
        await session.pc.setRemoteDescription({
          type: "offer",
          sdp: payload.sdp,
        });
        await flushIce(session);
        const answer = await session.pc.createAnswer();
        await session.pc.setLocalDescription(answer);
        if (!answer.sdp) return;
        socket.emit(CLIENT_EVENT.MEETING_SIGNAL_ANSWER, {
          meetingId,
          toUserId: payload.fromUserId,
          sdp: answer.sdp,
        });
      });
    };

    const onAnswer = (payload: MeetingSignalAnswerPayload) => {
      if (payload.toUserId !== meId || payload.meetingId !== meetingId) return;
      void enqueuePeer(payload.fromUserId, async () => {
        const session = sessionsRef.current.get(payload.fromUserId);
        if (!session) return;
        if (session.pc.signalingState !== "have-local-offer") return;
        await session.pc.setRemoteDescription({
          type: "answer",
          sdp: payload.sdp,
        });
        await flushIce(session);
      });
    };

    const onIce = (payload: MeetingSignalIcePayload) => {
      if (payload.toUserId !== meId || payload.meetingId !== meetingId) return;
      void (async () => {
        const session = await ensurePeerSession(payload.fromUserId);
        const candidate: RTCIceCandidateInit = {
          candidate: payload.candidate,
          sdpMid: payload.sdpMid ?? undefined,
          sdpMLineIndex: payload.sdpMLineIndex ?? undefined,
        };
        if (!session.pc.remoteDescription) {
          session.iceQueue.push(candidate);
          return;
        }
        try {
          await session.pc.addIceCandidate(candidate);
        } catch {
          // ignore
        }
      })();
    };

    const onMediaState = (payload: MeetingMediaStatePayload) => {
      if (payload.meetingId !== meetingId || payload.user.id === meId) return;
      applyMediaFlags(payload.user.id, {
        fullName: payload.user.fullName,
        audioEnabled: payload.audioEnabled,
        videoEnabled: payload.videoEnabled,
        screenSharing: payload.screenSharing,
        screenStreamId: payload.screenStreamId,
      });
    };

    const onMediaSync = (payload: MeetingMediaSyncPayload) => {
      if (payload.meetingId !== meetingId) return;
      for (const state of payload.states) {
        if (state.user.id === meId) continue;
        applyMediaFlags(state.user.id, {
          fullName: state.user.fullName,
          audioEnabled: state.audioEnabled,
          videoEnabled: state.videoEnabled,
          screenSharing: state.screenSharing,
          screenStreamId: state.screenStreamId,
        });
      }
      // Late joiner announces own state after receiving sync
      emitMediaSnapshot();
    };

    const onModeration = (payload: MeetingModerationPayload) => {
      if (payload.meetingId !== meetingId || payload.targetUserId !== meId) return;
      applyForcedMedia({
        audioEnabled: payload.audioEnabled,
        videoEnabled: payload.videoEnabled,
      });
    };

    socket.on(SERVER_EVENT.MEETING_SIGNAL_OFFER, onOffer);
    socket.on(SERVER_EVENT.MEETING_SIGNAL_ANSWER, onAnswer);
    socket.on(SERVER_EVENT.MEETING_SIGNAL_ICE, onIce);
    socket.on(SERVER_EVENT.MEETING_MEDIA_STATE, onMediaState);
    socket.on(SERVER_EVENT.MEETING_MEDIA_SYNC, onMediaSync);
    socket.on(SERVER_EVENT.MEETING_MODERATION, onModeration);

    return () => {
      socket.off(SERVER_EVENT.MEETING_SIGNAL_OFFER, onOffer);
      socket.off(SERVER_EVENT.MEETING_SIGNAL_ANSWER, onAnswer);
      socket.off(SERVER_EVENT.MEETING_SIGNAL_ICE, onIce);
      socket.off(SERVER_EVENT.MEETING_MEDIA_STATE, onMediaState);
      socket.off(SERVER_EVENT.MEETING_MEDIA_SYNC, onMediaSync);
      socket.off(SERVER_EVENT.MEETING_MODERATION, onModeration);
    };
  }, [
    applyForcedMedia,
    applyMediaFlags,
    emitMediaSnapshot,
    enabled,
    enqueuePeer,
    ensureLocalStream,
    ensurePeerSession,
    flushIce,
    meetingId,
    meId,
  ]);

  useEffect(() => {
    if (!enabled || !meetingId || !meId) return;
    const activeRemote = activeParticipants
      .map((participant) => participant.userId)
      .filter((id) => id !== meId);

    for (const remoteUserId of activeRemote) {
      const participant = activeParticipants.find((p) => p.userId === remoteUserId);
      if (participant) {
        upsertRemotePeer(remoteUserId, {
          fullName: participant.fullName,
        });
      }
      const shouldInitiate = meId.localeCompare(remoteUserId) < 0;
      void ensurePeerSession(remoteUserId)
        .then(async () => {
          if (shouldInitiate) {
            await enqueuePeer(remoteUserId, async () => {
              await createOfferFor(remoteUserId);
            });
          }
          emitMediaSnapshot();
        })
        .catch(() => null);
    }

    const activeSet = new Set(activeRemote);
    for (const userId of [...sessionsRef.current.keys()]) {
      if (!activeSet.has(userId)) {
        removePeer(userId);
      }
    }
  }, [
    activeParticipants,
    createOfferFor,
    emitMediaSnapshot,
    enabled,
    enqueuePeer,
    ensurePeerSession,
    meetingId,
    meId,
    removePeer,
    upsertRemotePeer,
  ]);

  useEffect(() => {
    if (enabled) return;
    for (const userId of [...sessionsRef.current.keys()]) {
      removePeer(userId);
    }
    sessionsRef.current.clear();
    screenSenderRef.current.clear();
    remoteStreamRef.current.clear();
    remoteScreenStreamRef.current.clear();
    remoteScreenIdRef.current.clear();
    remoteSharingRef.current.clear();
    setRemotePeers([]);

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    localScreenRef.current = null;
    setLocalScreenStream(null);

    if (localRef.current) {
      for (const track of localRef.current.getTracks()) {
        track.stop();
      }
      localRef.current = null;
    }
    cameraTrackRef.current = null;
    setLocalStream(null);
    audioEnabledRef.current = true;
    videoEnabledRef.current = true;
    screenSharingRef.current = false;
    setAudioEnabled(true);
    setVideoEnabled(true);
    setScreenSharing(false);
  }, [enabled, removePeer]);

  const activeScreenShare = useMemo(() => {
    if (screenSharing && localScreenStream) {
      return {
        userId: meId ?? "me",
        fullName: "You",
        stream: localScreenStream,
        isLocal: true,
      };
    }
    const remote = remotePeers.find(
      (peer) => peer.screenSharing && peer.screenStream,
    );
    if (remote?.screenStream) {
      return {
        userId: remote.userId,
        fullName: remote.fullName,
        stream: remote.screenStream,
        isLocal: false,
      };
    }
    // No camera-stream fallback — wait until real screen track arrives
    return null;
  }, [localScreenStream, meId, remotePeers, screenSharing]);

  return {
    localStream,
    localScreenStream,
    remotePeers,
    activeScreenShare,
    audioEnabled,
    videoEnabled,
    screenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    requestForceMute,
  };
}
