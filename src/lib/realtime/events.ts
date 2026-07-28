export const RT_NAMESPACE = "/rt";

export const CLIENT_EVENT = {
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  TYPING_STATE: "typing:state",
  MEETING_SIGNAL_OFFER: "meeting:signal:offer",
  MEETING_SIGNAL_ANSWER: "meeting:signal:answer",
  MEETING_SIGNAL_ICE: "meeting:signal:ice",
  MEETING_MEDIA_STATE: "meeting:media:state",
} as const;

export const SERVER_EVENT = {
  ROOM_JOINED: "room:joined",
  ROOM_LEFT: "room:left",
  ROOM_PRESENCE: "room:presence",
  TYPING_STATE: "typing:state",
  SOCKET_ERROR: "socket:error",
  BOARD_CHANGED: "board:changed",
  WORKSPACE_CHANGED: "workspace:changed",
  TASK_CREATED: "task:created",
  TASK_DELETED: "task:deleted",
  TASK_MOVED: "task:moved",
  TASK_UPDATED: "task:updated",
  COMMENT_CREATED: "comment:created",
  COMMENT_UPDATED: "comment:updated",
  COMMENT_DELETED: "comment:deleted",
  COMMENT_REACTION: "comment:reaction",
  NOTIFICATION_NEW: "notification:new",
  MEETING_CREATED: "meeting:created",
  MEETING_JOINED: "meeting:joined",
  MEETING_LEFT: "meeting:left",
  MEETING_ENDED: "meeting:ended",
  MEETING_PARTICIPANTS: "meeting:participants",
  MEETING_SIGNAL_OFFER: "meeting:signal:offer",
  MEETING_SIGNAL_ANSWER: "meeting:signal:answer",
  MEETING_SIGNAL_ICE: "meeting:signal:ice",
  MEETING_MEDIA_STATE: "meeting:media:state",
} as const;

export type RoomKind = "workspace" | "board" | "task" | "meeting";
export type RoomKey = `${RoomKind}:${string}`;

export function workspaceRoom(workspaceId: string): RoomKey {
  return `workspace:${workspaceId}`;
}

export function boardRoom(boardId: string): RoomKey {
  return `board:${boardId}`;
}

export function taskRoom(taskId: string): RoomKey {
  return `task:${taskId}`;
}

export function meetingRoom(meetingId: string): RoomKey {
  return `meeting:${meetingId}`;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}

export type RoomJoinPayload = { room: RoomKey };
export type RoomLeavePayload = { room: RoomKey };
export type TypingStateInput = {
  room: RoomKey;
  taskId: string;
  isTyping: boolean;
};

export type RealtimeSocketErrorCode =
  | "BAD_PAYLOAD"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "ROOM_NOT_FOUND"
  | "INTERNAL";

export type RealtimeSocketErrorPayload = {
  code: RealtimeSocketErrorCode;
  message: string;
  event?: string;
};

export type RoomPresencePayload = {
  room: RoomKey;
  users: Array<{
    id: string;
    fullName: string;
    avatar: string | null;
  }>;
  occurredAt: string;
};

export type TypingStatePayload = {
  room: RoomKey;
  taskId: string;
  isTyping: boolean;
  user: {
    id: string;
    fullName: string;
  };
  occurredAt: string;
};

export type TaskMovedPayload = {
  taskId: string;
  boardId: string;
  workspaceId: string;
  sourceColumnId: string;
  destinationColumnId: string;
  newPosition: number;
  movedBy: string;
  occurredAt: string;
};

export type TaskUpdatedPayload = {
  task: {
    id: string;
    taskId?: string;
    boardId: string;
    workspaceId: string;
    columnId: string;
    position: number;
    [key: string]: unknown;
  };
  updatedBy: string;
  occurredAt: string;
};

export type TaskCreatedPayload = TaskUpdatedPayload;

export type TaskDeletedPayload = {
  taskId: string;
  boardId: string;
  workspaceId: string;
  deletedBy: string;
  occurredAt: string;
};

export type BoardChangedPayload = {
  boardId: string;
  workspaceId: string;
  reason:
    | "column_created"
    | "column_updated"
    | "column_reordered"
    | "column_deleted"
    | "column_copied"
    | "column_moved"
    | "column_tasks_moved"
    | "column_sorted"
    | "column_archived"
    | "column_restored"
    | "board_updated"
    | "board_archived"
    | "board_restored"
    | "board_deleted";
  actorId: string;
  occurredAt: string;
};

export type WorkspaceChangedPayload = {
  workspaceId: string;
  reason:
    | "project_created"
    | "project_updated"
    | "project_archived"
    | "project_restored"
    | "project_deleted"
    | "board_created"
    | "board_updated"
    | "board_archived"
    | "board_restored"
    | "board_deleted";
  actorId: string;
  projectId?: string;
  boardId?: string;
  occurredAt: string;
};

export type CommentRealtimePayload = {
  boardId: string;
  workspaceId: string;
  taskId: string;
  comment: {
    id: string;
    taskId: string;
    parentCommentId?: string | null;
    content: string;
    isEdited: boolean;
    editedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    replyCount: number;
    author: {
      workspaceMemberId: string;
      role?: { id: string; name: string };
      user: {
        id: string;
        fullName: string;
        email: string;
        username: string;
        avatar?: string | null;
      };
    };
    mentions: Array<{
      workspaceMemberId: string;
      user: {
        id: string;
        fullName: string;
        email: string;
        username: string;
        avatar?: string | null;
      };
    }>;
    reactions?: Array<{
      emoji: string;
      count: number;
      reactedByMe: boolean;
    }>;
  };
  actorId: string;
  occurredAt: string;
};

export type CommentDeletedPayload = {
  boardId: string;
  workspaceId: string;
  taskId: string;
  commentId: string;
  parentCommentId?: string | null;
  actorId: string;
  occurredAt: string;
};

export type NotificationRealtimeItem = {
  id: string;
  notificationId: string;
  workspaceId: string;
  recipientId: string;
  senderId: string | null;
  entityType: string;
  entityId: string;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  metadata: unknown;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    email: string;
    avatar: string | null;
  } | null;
};

export type NotificationNewPayload = {
  notification: NotificationRealtimeItem;
  occurredAt: string;
};

export type MeetingParticipant = {
  userId: string;
  fullName: string;
  avatar: string | null;
  isHost: boolean;
  joinedAt: string;
  leftAt: string | null;
};

export type MeetingItem = {
  id: string;
  meetingId?: string;
  boardId: string;
  workspaceId: string;
  createdBy: string;
  title: string | null;
  status: "ACTIVE" | "ENDED";
  startedAt: string;
  endedAt: string | null;
  participants: MeetingParticipant[];
};

export type MeetingCreatedPayload = {
  meeting: MeetingItem;
  participants: MeetingParticipant[];
  actorId: string;
  occurredAt: string;
};

export type MeetingJoinedPayload = {
  meetingId: string;
  boardId: string;
  workspaceId: string;
  participant: MeetingParticipant;
  actorId: string;
  occurredAt: string;
};

export type MeetingLeftPayload = MeetingJoinedPayload;

export type MeetingEndedPayload = {
  meetingId: string;
  boardId: string;
  workspaceId: string;
  endedBy: string;
  occurredAt: string;
};

export type MeetingParticipantsPayload = {
  meetingId: string;
  boardId: string;
  workspaceId: string;
  participants: MeetingParticipant[];
  occurredAt: string;
};

export type MeetingSignalOfferPayload = {
  meetingId: string;
  fromUserId: string;
  toUserId: string;
  sdp: string;
  occurredAt: string;
};

export type MeetingSignalAnswerPayload = MeetingSignalOfferPayload;

export type MeetingSignalIcePayload = {
  meetingId: string;
  fromUserId: string;
  toUserId: string;
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  occurredAt: string;
};

export type MeetingMediaStatePayload = {
  meetingId: string;
  user: {
    id: string;
    fullName: string;
  };
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
  occurredAt: string;
};
