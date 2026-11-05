"use client";

/**
 * Cloudflare Turnstile in the browser (owner, Nov 2026): proves a form was sent by a person before the server emails
 * anyone. One helper for every form: it renders an invisible widget in a small box at the bottom of the screen
 * (`interaction-only`: shown only when Cloudflare wants a click), waits for the token and removes the widget.
 * Without NEXT_PUBLIC_TURNSTILE_SITE_KEY it returns "" and the server skips the check (TURNSTILE_SECRET_KEY unset).
 */
type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: Turnstile }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<Turnstile | null> | null = null;

function load(): Promise<Turnstile | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve(window.turnstile ?? null);
    s.onerror = () => { loading = null; resolve(null); };
    document.head.appendChild(s);
  });
  return loading;
}

/** A fresh one-time token for `action` (letters, digits, - and _), or "" when Turnstile is off or failed. */
export async function turnstileToken(action: string): Promise<string> {
  if (!SITE_KEY) return "";
  const ts = await load();
  if (!ts) return "";
  return new Promise((resolve) => {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset-inline:0;bottom:16px;display:flex;justify-content:center;z-index:2147483000;pointer-events:none";
    const inner = document.createElement("div");
    inner.style.pointerEvents = "auto";
    box.appendChild(inner);
    document.body.appendChild(box);
    let id = "";
    let finished = false;
    const done = (token: string) => {
      if (finished) return;
      finished = true;
      try { if (id) ts.remove(id); } catch { /* already gone */ }
      box.remove();
      resolve(token);
    };
    try {
      id = ts.render(inner, {
        sitekey: SITE_KEY,
        action,
        appearance: "interaction-only",
        language: document.documentElement.lang === "en" ? "en" : "ar",
        callback: (token: string) => done(token),
        "error-callback": () => done(""),
        "expired-callback": () => done(""),
        "timeout-callback": () => done(""),
      });
    } catch {
      done("");
    }
    // Never leave the form hanging.
    setTimeout(() => done(""), 90_000);
  });
}
