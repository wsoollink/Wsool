"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A thin bar at the top of the page while the next page loads (owner, Nov 2026: menus felt slow to respond, because
 * dashboard pages are built on the server and nothing moved until they arrived). Starts on a click on an internal
 * link or on a form marked data-nav (e.g. sign out); ends when the address changes, or after 12 s at most.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = `${pathname}?${search}`;
  const last = useRef(location);

  useEffect(() => {
    const start = () => {
      setState("loading");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 12_000);
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page (only the #section changes): no load.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("form[data-nav]")) start();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  // The new page is on screen: finish the bar.
  useEffect(() => {
    if (last.current === location) return;
    last.current = location;
    if (timer.current) clearTimeout(timer.current);
    setState("done");
    timer.current = setTimeout(() => setState("idle"), 350);
  }, [location]);

  if (state === "idle") return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div className={`nav-progress h-full bg-gradient-to-l from-[#0060E6] to-[#22B8F0] ${state === "done" ? "nav-progress-done" : ""}`} />
    </div>
  );
}
