"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "./actions";

/** Opening the page marks everything read (the bell dot goes away). */
export function MarkRead({ unread }: { unread: number }) {
  const router = useRouter();
  useEffect(() => {
    if (unread > 0) markAllRead().then(() => router.refresh());
  }, [unread, router]);
  return null;
}
