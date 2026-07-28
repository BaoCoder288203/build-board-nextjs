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
  await api.post(`/meetings/${meetingId}/leave`);
}

export async function endMeeting(meetingId: string) {
  const { data } = await api.post(`/meetings/${meetingId}/end`);
  return data.data as MeetingItem;
}
