"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/lib/auth";
import { setAccessToken } from "@/lib/api";
import { toastError, toastFromError, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth-store";

export function ProfileSecurityPanel() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      toastError("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toastSuccess("Password changed", "Please sign in again.");
      setAccessToken(null);
      setUser(null);
      router.replace("/login");
    } catch (error) {
      toastFromError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[12px] border border-bb-border/80 bg-bb-surface p-6 shadow-bb"
    >
      <Field label="Current password">
        <Input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </Field>
      <Field label="New password">
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm new password">
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      <p className="text-xs text-bb-muted">
        Use at least 8 characters with upper, lower, number, and a special
        character.
      </p>
      <Button type="submit" fullWidth disabled={saving}>
        {saving ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
