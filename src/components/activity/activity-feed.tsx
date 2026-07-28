"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchActivities,
  fetchActivityTimeline,
  formatActivityDateTime,
  formatActivitySummary,
  formatActivityTime,
  searchActivities,
  type ActivitySearchFilters,
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
  filters,
  showLoadMore = false,
  showAbsoluteTime = false,
  className = "",
  refreshToken = 0,
}: {
  workspaceId: string;
  taskId?: string;
  projectId?: string;
  boardId?: string;
  mode?: "list" | "timeline";
  limit?: number;
  filters?: ActivitySearchFilters;
  showLoadMore?: boolean;
  showAbsoluteTime?: boolean;
  className?: string;
  refreshToken?: number;
}) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const requestIdRef = useRef(0);
  const hasFilters = filters !== undefined;
  const keyword = filters?.keyword;
  const entityType = filters?.entityType;
  const action = filters?.action;
  const actorId = filters?.actorId;
  const dateFrom = filters?.dateFrom;
  const dateTo = filters?.dateTo;

  const load = useCallback(async (nextPage: number, append: boolean) => {
    const requestId = ++requestIdRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const data = hasFilters
        ? await searchActivities({
            workspaceId,
            keyword,
            entityType,
            action,
            actorId,
            dateFrom,
            dateTo,
            page: nextPage,
            limit,
          })
        : mode === "timeline"
          ? await fetchActivityTimeline({
              workspaceId,
              page: nextPage,
              limit,
            })
          : await fetchActivities({
              workspaceId,
              taskId,
              projectId,
              boardId,
              page: nextPage,
              limit,
            });
      if (requestId !== requestIdRef.current) return;
      setItems((current) => append ? [...current, ...data.items] : data.items);
      setPage(data.page);
      setTotal(data.total);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      toastFromError(error);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [
    workspaceId,
    taskId,
    projectId,
    boardId,
    mode,
    limit,
    hasFilters,
    keyword,
    entityType,
    action,
    actorId,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(1, false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [load, refreshToken]);

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
                {showAbsoluteTime
                  ? formatActivityDateTime(item.createdAt)
                  : formatActivityTime(item.createdAt)}
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
        showLoadMore ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loadingMore}
              onClick={() => void load(page + 1, true)}
            >
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
            <p className="text-xs text-bb-muted">
              Showing {items.length} of {total}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-bb-muted">
            Showing {items.length} of {total}
          </p>
        )
      ) : null}
    </div>
  );
}
