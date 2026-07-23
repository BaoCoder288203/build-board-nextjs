"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy path → Account tab. */
export default function ProfileSecurityRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/profile?tab=security");
  }, [router]);
  return null;
}
