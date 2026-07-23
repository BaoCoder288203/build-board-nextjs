"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ProfileGeneralPanel } from "@/components/profile/profile-general-panel";
import { ProfileNotificationsPanel } from "@/components/profile/profile-notifications-panel";
import { ProfileSecurityPanel } from "@/components/profile/profile-security-panel";

export type ProfileTab = "profile" | "security" | "notifications";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
];

function parseTab(raw: string | null): ProfileTab {
  if (raw === "security" || raw === "notifications") return raw;
  return "profile";
}

function ProfileAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = useCallback(
    (next: ProfileTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "profile") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `/profile?${qs}` : "/profile", { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <AppShell
      title="Account"
      subtitle="Manage your profile, security, and notification preferences."
    >
      <nav
        className="mb-6 flex flex-wrap justify-center gap-2"
        aria-label="Account sections"
      >
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={active}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                active
                  ? "bg-bb-blue text-white"
                  : "bg-bb-sky text-bb-blue hover:bg-bb-sky-deep/30"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mx-auto w-full max-w-lg">
        {tab === "profile" ? <ProfileGeneralPanel /> : null}
        {tab === "security" ? <ProfileSecurityPanel /> : null}
        {tab === "notifications" ? <ProfileNotificationsPanel /> : null}
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <AppShell title="Account">
          <p className="text-center text-sm text-bb-muted">Loading…</p>
        </AppShell>
      }
    >
      <ProfileAccountContent />
    </Suspense>
  );
}
