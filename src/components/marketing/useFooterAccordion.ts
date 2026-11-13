"use client";

import { useEffect } from "react";

const COLUMNS = "footer :is(.mk-home-70, .mk-pricing-23) > div";
const PHONE = "(max-width: 767px)";

/**
 * Phones (owner, Nov 2026): the footer link columns (Product, Support, Legal) are stacked and collapsed; tapping a
 * column's title opens its links. The generated design markup is kept: the title gets button semantics here and
 * marketing.css hides the links of a closed column. Without JavaScript every link stays visible.
 */
export function useFooterAccordion() {
  useEffect(() => {
    const media = window.matchMedia(PHONE);
    const cleanups: (() => void)[] = [];
    document.querySelectorAll<HTMLElement>(COLUMNS).forEach((column, i) => {
      const title = column.firstElementChild as HTMLElement | null;
      if (!title) return;
      const id = `wfoot-${i}`;
      column.id ||= id;
      column.classList.add("wfoot");
      const sync = () => {
        if (media.matches) {
          title.setAttribute("role", "button");
          title.tabIndex = 0;
          title.setAttribute("aria-controls", column.id);
          title.setAttribute("aria-expanded", String(column.classList.contains("open")));
        } else {
          ["role", "tabindex", "aria-controls", "aria-expanded"].forEach((a) => title.removeAttribute(a));
        }
      };
      const toggle = () => {
        if (!media.matches) return;
        column.classList.toggle("open");
        sync();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      };
      title.addEventListener("click", toggle);
      title.addEventListener("keydown", onKey);
      media.addEventListener("change", sync);
      sync();
      cleanups.push(() => {
        title.removeEventListener("click", toggle);
        title.removeEventListener("keydown", onKey);
        media.removeEventListener("change", sync);
      });
    });
    return () => cleanups.forEach((c) => c());
  }, []);
}
