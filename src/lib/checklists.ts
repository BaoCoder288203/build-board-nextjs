"use client";

import { api } from "@/lib/api";

export type ChecklistItem = {
  id: string;
  checklistId: string;
  title: string;
  completed: boolean;
  isCompleted?: boolean;
  completedBy?: string | null;
  completedAt?: string | null;
  position: number;
};

export type Checklist = {
  id: string;
  taskId: string;
  title: string;
  position: number;
  items: ChecklistItem[];
  completed: number;
  total: number;
  progress: number;
};

export type ChecklistProgress = {
  completed: number;
  total: number;
  progress: number;
};

export async function fetchChecklists(taskId: string) {
  const { data } = await api.get("/checklists", { params: { taskId } });
  return data.data as { items: Checklist[] };
}

export async function createChecklist(input: {
  taskId: string;
  title: string;
}) {
  const { data } = await api.post("/checklists", input);
  return data.data as Checklist;
}

export async function updateChecklist(
  checklistId: string,
  input: { title: string },
) {
  const { data } = await api.patch(`/checklists/${checklistId}`, input);
  return data.data as Checklist;
}

export async function deleteChecklist(checklistId: string) {
  await api.delete(`/checklists/${checklistId}`);
}

export async function createChecklistItem(
  checklistId: string,
  input: { title: string },
) {
  const { data } = await api.post(`/checklists/${checklistId}/items`, input);
  return data.data as ChecklistItem;
}

export async function updateChecklistItem(
  itemId: string,
  input: { title?: string; completed?: boolean },
) {
  const { data } = await api.patch(`/checklists/items/${itemId}`, input);
  return data.data as ChecklistItem;
}

export async function deleteChecklistItem(itemId: string) {
  await api.delete(`/checklists/items/${itemId}`);
}

export async function reorderChecklistItems(
  checklistId: string,
  items: Array<{ id: string; position: number }>,
) {
  const { data } = await api.patch(`/checklists/${checklistId}/reorder`, {
    items,
  });
  return data.data as Checklist;
}
