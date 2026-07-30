"use client";

import { api } from "@/lib/api";
import type { MeetingItem } from "@/lib/realtime/events";

export async function startMeeting(boardId: string, title?: string) {
  const { data } = await api.post(`/boards/${boardId}/meetings`, {
    ...(title?.trim() ? { title: title.trim() } : {}),
  });
  return data.data as MeetingItem;
}

export async function fetchActiveMeeting(boardId: string) {
  const { data } = await api.get(`/boards/${boardId}/meetings/active`);
  return data.data as MeetingItem | null;
}

export async function fetchMeetingHistory(
  boardId: string,
  params?: { page?: number; limit?: number },
) {
  const { data } = await api.get(`/boards/${boardId}/meetings`, { params });
  return data.data as {
    items: MeetingItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function joinMeeting(meetingId: string) {
  const { data } = await api.post(`/meetings/${meetingId}/join`);
  return data.data as {
    meeting: MeetingItem;
    participant: MeetingItem["participants"][number];
    participants: MeetingItem["participants"];
  };
}

export async function leaveMeeting(meetingId: string) {
  const { data } = await api.post(`/meetings/${meetingId}/leave`);
  return data.data as {
    newHost: MeetingItem["participants"][number] | null;
    ended: boolean;
  };
}

export async function endMeeting(meetingId: string) {
  const { data } = await api.post(`/meetings/${meetingId}/end`);
  return data.data as MeetingItem;
}

export async function transferMeetingHost(meetingId: string, toUserId: string) {
  const { data } = await api.post(`/meetings/${meetingId}/transfer-host`, {
    toUserId,
  });
  return data.data as {
    meeting: MeetingItem;
    newHost: MeetingItem["participants"][number];
    participants: MeetingItem["participants"];
  };
}

export async function kickMeetingParticipant(meetingId: string, userId: string) {
  const { data } = await api.post(`/meetings/${meetingId}/kick`, { userId });
  return data.data as {
    meeting: MeetingItem;
    participant: MeetingItem["participants"][number];
    participants: MeetingItem["participants"];
  };
}
