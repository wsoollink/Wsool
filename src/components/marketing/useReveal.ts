"use client";

import { useEffect } from "react";

/**
 * Soft entrance (owner, Nov 2026): each matching box fades and rises into place when it scrolls into view, one after
 * another in a row. Boxes already on screen when the page opens stay as they are; without JavaScript or with Reduce
 * Motion nothing is hidden. Styles: `.wsr` / `.wsr-in` in marketing.css.
 */
export function useReveal(selector: string) {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const boxes = [...document.querySelectorAll<HTMLElement>(selector)].filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    if (boxes.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      let i = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.style.transitionDelay = `${Math.min(i++, 3) * 90}ms`;
        el.classList.add("wsr-in");
        observer.unobserve(el);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    for (const el of boxes) { el.classList.add("wsr"); observer.observe(el); }
    return () => observer.disconnect();
  }, [selector]);
}
