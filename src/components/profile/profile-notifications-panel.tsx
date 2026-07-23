"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from "@/lib/notifications";
import { toastFromError, toastSuccess } from "@/lib/toast";

const LABELS: { key: keyof NotificationSettings; label: string; hint: string }[] =
  [
    {
      key: "inAppEnabled",
      label: "In-app notifications",
      hint: "Show alerts in the notification bell",
    },
    {
      key: "emailEnabled",
      label: "Email notifications",
      hint: "Receive important updates by email",
    },
    {
      key: "pushEnabled",
      label: "Push notifications",
      hint: "Browser / device push (when configured)",
    },
    {
      key: "assignmentEnabled",
      label: "Assignments",
      hint: "When you’re assigned to a task",
    },
    {
      key: "mentionEnabled",
      label: "Mentions",
      hint: "When someone @mentions you",
    },
    {
      key: "commentEnabled",
      label: "Comments",
      hint: "Comment activity on tasks you follow",
    },
    {
      key: "dueDateEnabled",
      label: "Due dates",
      hint: "Reminders about upcoming due dates",
    },
  ];

export function ProfileNotificationsPanel() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await fetchNotificationSettings());
    } catch (error) {
      toastFromError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(key: keyof NotificationSettings) {
    setSettings((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const next = await updateNotificationSettings(settings);
      setSettings(next);
      toastSuccess("Notification settings saved");
    } catch (error) {
      toastFromError(error);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return <p className="text-center text-sm text-bb-muted">Loading settings…</p>;
  }

  return (
    <form
      onSubmit={onSave}
      className="space-y-1 rounded-[12px] border border-bb-border/80 bg-bb-surface p-4 shadow-bb"
    >
      {LABELS.map((item) => (
        <label
          key={item.key}
          className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-3 hover:bg-bb-sky/50"
        >
          <input
            type="checkbox"
            checked={settings[item.key]}
            onChange={() => toggle(item.key)}
            className="mt-1 h-4 w-4 accent-bb-blue"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-bb-ink">
              {item.label}
            </span>
            <span className="block text-xs text-bb-muted">{item.hint}</span>
          </span>
        </label>
      ))}
      <div className="pt-3">
        <Button type="submit" fullWidth disabled={saving}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
