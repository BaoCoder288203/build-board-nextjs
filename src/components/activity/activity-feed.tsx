"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchActivities,
  fetchActivityTimeline,
  formatActivitySummary,
  formatActivityTime,
  type ActivityItem,
} from "@/lib/activities";
import { toastFromError } from "@/lib/toast";

export function ActivityFeed({
  workspaceId,
  taskId,
  projectId,
  boardId,
  mode = "list",
  limit = 20,
  className = "",
}: {
  workspaceId: string;
  taskId?: string;
  projectId?: string;
  boardId?: string;
  mode?: "list" | "timeline";
  limit?: number;
  className?: string;
}) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        mode === "timeline"
          ? await fetchActivityTimeline({ workspaceId, limit })
          : await fetchActivities({
              workspaceId,
              taskId,
              projectId,
              boardId,
              limit,
            });
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, taskId, projectId, boardId, mode, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className={`text-sm text-bb-muted ${className}`}>Loading activity...</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className={`text-sm text-bb-muted ${className}`}>
        No activity yet.
      </p>
    );
  }

  return (
    <div className={className}>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3">
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-bb-blue" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-bb-ink">
                {formatActivitySummary(item)}
              </p>
              <p className="mt-0.5 text-xs text-bb-muted">
                {formatActivityTime(item.createdAt)}
                <span className="mx-1.5 text-bb-border">·</span>
                <span className="uppercase tracking-wide">
                  {item.entityType}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
      {total > items.length ? (
        <p className="mt-3 text-xs text-bb-muted">
          Showing {items.length} of {total}
        </p>
      ) : null}
    </div>
  );
}
