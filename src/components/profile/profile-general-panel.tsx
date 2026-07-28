"use client";

import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GoogleOAuthButton } from "@/components/google-oauth-button";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateProfile, uploadAvatar } from "@/lib/auth";
import { toastError, toastFromError, toastSuccess } from "@/lib/toast";
import { useAuthStore } from "@/stores/auth-store";

export function ProfileGeneralPanel() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName);
    setUsername(user.username);
    setAvatar(user.avatar ?? "");
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const next = await updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
      });
      setUser(next);
      toastSuccess("Profile updated");
    } catch (error) {
      toastFromError(error);
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toastError("Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toastError("Image must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const next = await uploadAvatar(file);
      setUser(next);
      setAvatar(next.avatar ?? "");
      toastSuccess("Avatar updated");
    } catch (error) {
      toastFromError(error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[12px] border border-bb-border/80 bg-bb-surface p-6 shadow-bb"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group relative h-28 w-28 overflow-hidden rounded-full bg-bb-blue text-3xl font-bold text-white ring-4 ring-bb-sky focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-blue disabled:opacity-60"
            aria-label="Upload avatar"
            title="Upload avatar"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (fullName[0] ?? "U").toUpperCase()
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
            </span>
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0.5 right-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-bb-border bg-white text-bb-ink shadow-sm hover:bg-bb-sky disabled:opacity-60"
            aria-label="Change avatar"
            title="Change avatar"
          >
            <Camera className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void onPickAvatar(e.target.files?.[0])}
          />
        </div>
        <p className="mt-3 max-w-full truncate text-base font-bold text-bb-ink">
          {fullName || "Your name"}
        </p>
        <p className="mt-0.5 max-w-full truncate text-sm text-bb-muted">
          {user?.email}
        </p>
        <p className="mt-2 text-xs text-bb-muted">
          {uploading ? "Uploading…" : "Click the avatar to upload a photo"}
        </p>
        {!user?.googleLinked ? (
          <div className="mt-4 w-full max-w-xs">
            <GoogleOAuthButton mode="link" disabled={uploading || saving} />
            <p className="mt-2 text-xs text-bb-muted">
              Connect Google to sync your profile photo automatically on sign-in.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs font-medium text-bb-blue">
            Google account connected — avatar syncs on sign-in.
          </p>
        )}
      </div>

      <Field label="Full name">
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
        />
      </Field>
      <Field label="Username">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={100}
          pattern="^[a-zA-Z0-9._-]+$"
        />
      </Field>
      <Field label="Email">
        <Input value={user?.email ?? ""} disabled readOnly />
      </Field>
      <Button type="submit" fullWidth disabled={saving || uploading || !user}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
