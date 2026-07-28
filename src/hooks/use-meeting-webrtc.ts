"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connectRealtime } from "@/lib/realtime/socket-client";
import {
  CLIENT_EVENT,
  SERVER_EVENT,
  type MeetingMediaStatePayload,
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
};

type UseMeetingWebRtcInput = {
  meetingId: string | null;
  enabled: boolean;
  meId: string | null;
  participants: MeetingParticipant[];
};

type IceServerConfig = RTCIceServer[];

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

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteScreenStreamRef = useRef<Map<string, MediaStream>>(new Map());
  const localRef = useRef<MediaStream | null>(null);
  const localScreenRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenSenderIdsRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const audioEnabledRef = useRef(true);
  const videoEnabledRef = useRef(true);
  const screenSharingRef = useRef(false);

  const activeParticipants = useMemo(
    () => participants.filter((p) => p.leftAt == null),
    [participants],
  );

  const emitMediaSnapshot = useCallback(() => {
    if (!meetingId) return;
    const socket = connectRealtime();
    socket.emit(CLIENT_EVENT.MEETING_MEDIA_STATE, {
      meetingId,
      audioEnabled: audioEnabledRef.current,
      videoEnabled: videoEnabledRef.current,
      screenSharing: screenSharingRef.current,
    });
  }, [meetingId]);

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
              updates.screenStream ??
              remoteScreenStreamRef.current.get(userId) ??
              null,
            audioEnabled: updates.audioEnabled ?? true,
            videoEnabled: updates.videoEnabled ?? true,
            screenSharing: updates.screenSharing ?? false,
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
              }
            : peer,
        );
      });
    },
    [activeParticipants],
  );

  const removePeer = useCallback((userId: string) => {
    const pc = pcsRef.current.get(userId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
      pcsRef.current.delete(userId);
    }
    screenSenderIdsRef.current.delete(userId);
    remoteStreamRef.current.delete(userId);
    remoteScreenStreamRef.current.delete(userId);
    setRemotePeers((prev) => prev.filter((peer) => peer.userId !== userId));
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

  const attachScreenTrackToPeer = useCallback(
    async (targetUserId: string, screenTrack: MediaStreamTrack) => {
      const pc = pcsRef.current.get(targetUserId);
      if (!pc || !localScreenRef.current) return;
      const existing = screenSenderIdsRef.current.get(targetUserId);
      if (existing) {
        await existing.replaceTrack(screenTrack);
        return;
      }
      const sender = pc.addTrack(screenTrack, localScreenRef.current);
      screenSenderIdsRef.current.set(targetUserId, sender);
    },
    [],
  );

  const detachScreenTrackFromPeer = useCallback((targetUserId: string) => {
    const pc = pcsRef.current.get(targetUserId);
    const sender = screenSenderIdsRef.current.get(targetUserId);
    if (pc && sender) {
      try {
        pc.removeTrack(sender);
      } catch {
        // ignore
      }
    }
    screenSenderIdsRef.current.delete(targetUserId);
  }, []);

  const createPeerConnection = useCallback(
    async (targetUserId: string) => {
      const existing = pcsRef.current.get(targetUserId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcsRef.current.set(targetUserId, pc);

      const local = await ensureLocalStream();
      for (const track of local.getTracks()) {
        pc.addTrack(track, local);
      }

      if (screenTrackRef.current && localScreenRef.current) {
        const sender = pc.addTrack(screenTrackRef.current, localScreenRef.current);
        screenSenderIdsRef.current.set(targetUserId, sender);
      }

      pc.ontrack = (event) => {
        const track = event.track;
        const inbound = event.streams[0] ?? null;
        const cameraStream = remoteStreamRef.current.get(targetUserId);
        const cameraHasVideo = Boolean(cameraStream?.getVideoTracks().length);
        const differentFromCamera =
          Boolean(cameraStream && inbound && inbound.id !== cameraStream.id);
        // Screen share is a second video track (often its own stream). contentHint
        // may not survive the wire, so prefer stream/id heuristics.
        const isScreenVideo =
          track.kind === "video" &&
          Boolean(cameraStream) &&
          (differentFromCamera ||
            cameraHasVideo ||
            track.contentHint === "detail");

        if (isScreenVideo) {
          let screenStream = remoteScreenStreamRef.current.get(targetUserId);
          if (!screenStream) {
            screenStream = inbound ? new MediaStream(inbound.getTracks()) : new MediaStream();
            remoteScreenStreamRef.current.set(targetUserId, screenStream);
          }
          if (!screenStream.getTracks().some((t) => t.id === track.id)) {
            screenStream.addTrack(track);
          }
          upsertRemotePeer(targetUserId, {
            screenStream,
            screenSharing: true,
          });
          track.onended = () => {
            remoteScreenStreamRef.current.delete(targetUserId);
            upsertRemotePeer(targetUserId, {
              screenStream: null,
              screenSharing: false,
            });
          };
          return;
        }

        let nextCamera = cameraStream;
        if (!nextCamera) {
          nextCamera = inbound ?? new MediaStream();
          remoteStreamRef.current.set(targetUserId, nextCamera);
        }
        if (
          track.kind === "video" &&
          !nextCamera.getVideoTracks().some((t) => t.id === track.id)
        ) {
          nextCamera.addTrack(track);
        }
        if (
          track.kind === "audio" &&
          !nextCamera.getAudioTracks().some((t) => t.id === track.id)
        ) {
          nextCamera.addTrack(track);
        }
        upsertRemotePeer(targetUserId, { stream: nextCamera });
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate || !meetingId) return;
        const socket = connectRealtime();
        socket.emit(CLIENT_EVENT.MEETING_SIGNAL_ICE, {
          meetingId,
          toUserId: targetUserId,
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid ?? null,
          sdpMLineIndex: event.candidate.sdpMLineIndex ?? null,
        });
      };

      return pc;
    },
    [ensureLocalStream, meetingId, upsertRemotePeer],
  );

  const createOfferFor = useCallback(
    async (targetUserId: string) => {
      const pc = await createPeerConnection(targetUserId);
      if (pc.signalingState !== "stable") return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (!meetingId || !offer.sdp) return;
      const socket = connectRealtime();
      socket.emit(CLIENT_EVENT.MEETING_SIGNAL_OFFER, {
        meetingId,
        toUserId: targetUserId,
        sdp: offer.sdp,
      });
    },
    [createPeerConnection, meetingId],
  );

  const renegotiateAll = useCallback(async () => {
    const peerIds = [...pcsRef.current.keys()];
    await Promise.all(
      peerIds.map(async (peerId) => {
        try {
          await createOfferFor(peerId);
        } catch {
          // ignore per-peer failures
        }
      }),
    );
  }, [createOfferFor]);

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

  const stopScreenShare = useCallback(async () => {
    const screenTrack = screenTrackRef.current;
    if (!screenTrack) return;

    for (const userId of [...pcsRef.current.keys()]) {
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
  }, [detachScreenTrackFromPeer, emitMediaSnapshot, renegotiateAll]);

  const startScreenShare = useCallback(async () => {
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

    for (const userId of [...pcsRef.current.keys()]) {
      await attachScreenTrackToPeer(userId, track);
    }

    track.onended = () => {
      void stopScreenShare();
    };

    screenSharingRef.current = true;
    setScreenSharing(true);
    emitMediaSnapshot();
    await renegotiateAll();
  }, [
    attachScreenTrackToPeer,
    emitMediaSnapshot,
    renegotiateAll,
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

    const onOffer = async (payload: MeetingSignalOfferPayload) => {
      if (payload.toUserId !== meId || payload.meetingId !== meetingId) return;
      const pc = await createPeerConnection(payload.fromUserId);
      if (pc.signalingState !== "stable") {
        try {
          await pc.setLocalDescription({ type: "rollback" });
        } catch {
          // ignore rollback failures
        }
      }
      await pc.setRemoteDescription({
        type: "offer",
        sdp: payload.sdp,
      });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (!answer.sdp) return;
      socket.emit(CLIENT_EVENT.MEETING_SIGNAL_ANSWER, {
        meetingId,
        toUserId: payload.fromUserId,
        sdp: answer.sdp,
      });
    };

    const onAnswer = async (payload: MeetingSignalAnswerPayload) => {
      if (payload.toUserId !== meId || payload.meetingId !== meetingId) return;
      const pc = pcsRef.current.get(payload.fromUserId);
      if (!pc) return;
      await pc.setRemoteDescription({
        type: "answer",
        sdp: payload.sdp,
      });
    };

    const onIce = async (payload: MeetingSignalIcePayload) => {
      if (payload.toUserId !== meId || payload.meetingId !== meetingId) return;
      const pc = await createPeerConnection(payload.fromUserId);
      await pc.addIceCandidate(
        new RTCIceCandidate({
          candidate: payload.candidate,
          sdpMid: payload.sdpMid ?? null,
          sdpMLineIndex: payload.sdpMLineIndex ?? null,
        }),
      );
    };

    const onMediaState = (payload: MeetingMediaStatePayload) => {
      if (payload.meetingId !== meetingId || payload.user.id === meId) return;
      upsertRemotePeer(payload.user.id, {
        fullName: payload.user.fullName,
        audioEnabled: payload.audioEnabled,
        videoEnabled: payload.videoEnabled,
        screenSharing: payload.screenSharing,
        ...(payload.screenSharing === false ? { screenStream: null } : {}),
      });
      if (payload.screenSharing === false) {
        remoteScreenStreamRef.current.delete(payload.user.id);
      }
    };

    socket.on(SERVER_EVENT.MEETING_SIGNAL_OFFER, onOffer);
    socket.on(SERVER_EVENT.MEETING_SIGNAL_ANSWER, onAnswer);
    socket.on(SERVER_EVENT.MEETING_SIGNAL_ICE, onIce);
    socket.on(SERVER_EVENT.MEETING_MEDIA_STATE, onMediaState);

    return () => {
      socket.off(SERVER_EVENT.MEETING_SIGNAL_OFFER, onOffer);
      socket.off(SERVER_EVENT.MEETING_SIGNAL_ANSWER, onAnswer);
      socket.off(SERVER_EVENT.MEETING_SIGNAL_ICE, onIce);
      socket.off(SERVER_EVENT.MEETING_MEDIA_STATE, onMediaState);
    };
  }, [
    createPeerConnection,
    emitMediaSnapshot,
    enabled,
    ensureLocalStream,
    meetingId,
    meId,
    upsertRemotePeer,
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
      void createPeerConnection(remoteUserId)
        .then(async () => {
          if (shouldInitiate) await createOfferFor(remoteUserId);
          emitMediaSnapshot();
        })
        .catch(() => null);
    }

    const activeSet = new Set(activeRemote);
    for (const userId of [...pcsRef.current.keys()]) {
      if (!activeSet.has(userId)) {
        removePeer(userId);
      }
    }
  }, [
    activeParticipants,
    createOfferFor,
    createPeerConnection,
    emitMediaSnapshot,
    enabled,
    meetingId,
    meId,
    removePeer,
    upsertRemotePeer,
  ]);

  useEffect(() => {
    if (enabled) return;
    for (const pc of pcsRef.current.values()) {
      pc.close();
    }
    pcsRef.current.clear();
    screenSenderIdsRef.current.clear();
    remoteStreamRef.current.clear();
    remoteScreenStreamRef.current.clear();
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
  }, [enabled]);

  const activeScreenShare = useMemo(() => {
    if (screenSharing && localScreenStream) {
      return {
        userId: meId ?? "me",
        fullName: "You",
        stream: localScreenStream,
        isLocal: true,
      };
    }
    const remote = remotePeers.find((peer) => peer.screenSharing && peer.screenStream);
    if (remote?.screenStream) {
      return {
        userId: remote.userId,
        fullName: remote.fullName,
        stream: remote.screenStream,
        isLocal: false,
      };
    }
    // Fallback: peer marked sharing but screen track not separated yet
    const fallback = remotePeers.find((peer) => peer.screenSharing);
    if (fallback) {
      return {
        userId: fallback.userId,
        fullName: fallback.fullName,
        stream: fallback.stream,
        isLocal: false,
      };
    }
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
  };
}
