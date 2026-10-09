"use client";

import { useEffect } from "react";

function send(payload: object) {
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/track", blob)) {
    fetch("/api/track", { method: "POST", body: blob, keepalive: true }).catch(() => {});
  }
}

/**
 * Counts the visit once, and taps on elements marked data-track="kind" or
 * "kind:platform" (WhatsApp, email, social icons, past work) or
 * "link:<id>" / "service:<id>" (My links, My services). No cookies.
 */
export function Tracker({ username, lang }: { username: string; lang: "ar" | "en" }) {
  useEffect(() => {
    send({ type: "view", username, lang, referrer: document.referrer || null });
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track]");
      if (!el) return;
      const [kind, value] = (el.getAttribute("data-track") ?? "").split(":");
      const target = kind === "link" || kind === "service";
      send({ type: "click", username, kind, platform: target ? null : value || null, ...(target && { target: value }) });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [username, lang]);
  return null;
}
