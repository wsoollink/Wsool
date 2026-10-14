"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = { children: ReactNode; ariaLabel: string; seconds?: number };

/** Pause after the visitor touches or scrolls the row, before it moves again. */
const RESUME_MS = 2500;

/**
 * Auto-scrolling row that the visitor can also swipe or scroll by hand. It is
 * a normal horizontally scrollable row, moved a little each frame; touching,
 * hovering, focusing or scrolling it pauses the movement. It only moves when
 * the items are wider than the row: then they render twice and the position
 * wraps by one copy's width, so the loop never ends (the copy is hidden from
 * screen readers and keyboard). A few items that fit stay still, shown once.
 * Visitors who prefer reduced motion get a still, scrollable row. As in the
 * design it runs to the screen edges on mobile with faded ends.
 */
export function Marquee({ children, ariaLabel, seconds = 30 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const copy = useRef<HTMLUListElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [reduced, setReduced] = useState(false);
  const moving = overflows && !reduced;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    const check = () => {
      if (box.current && list.current) setOverflows(list.current.scrollWidth > box.current.clientWidth);
    };
    check();
    const observer = new ResizeObserver(check);
    if (box.current) observer.observe(box.current);
    if (list.current) observer.observe(list.current);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!moving || !el) return;
    // In RTL pages scrollLeft runs from 0 towards negative values.
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    let pos = el.scrollLeft;
    let last = 0;
    let frame = 0;
    let held = false; // finger down, pointer over, or keyboard focus inside
    let visible = true;
    let resumeAt = 0;

    /** Width of one copy of the items (where the loop wraps). */
    const period = () => (copy.current && list.current ? Math.abs(copy.current.offsetLeft - list.current.offsetLeft) : 0);
    /** Keeps the position inside one copy, in the reading direction. */
    const wrap = (p: number, size: number) => {
      if (size <= 0) return p;
      let v = p * dir;
      while (v >= size) v -= size;
      while (v < 0) v += size;
      return v * dir;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      const size = period();
      if (held || !visible || now < resumeAt || now < pageScrollUntil || size <= 0) return;
      pos = wrap(pos + dir * (size / seconds) * (dt / 1000), size);
      el.scrollLeft = pos;
    };

    /** The visitor moved the row: continue from where they left it, a bit later. */
    const pauseThenResume = () => {
      resumeAt = performance.now() + RESUME_MS;
      const size = period();
      const wrapped = wrap(el.scrollLeft, size);
      if (Math.abs(wrapped - el.scrollLeft) > 1) el.scrollLeft = wrapped;
      pos = wrapped;
    };
    const hold = () => { held = true; };
    const release = () => { held = false; pauseThenResume(); };
    const onScroll = () => {
      // Our own frame updates land within a pixel of pos; anything else is the visitor.
      if (Math.abs(el.scrollLeft - pos) > 2) pauseThenResume();
    };

    // iOS (WebKit) can cut the page's own scroll short when a nested row is
    // scrolled from script at the same time, leaving the top of the page under
    // the browser bar. So the row stands still while the page itself scrolls.
    let pageScrollUntil = 0;
    const onPageScroll = () => { pageScrollUntil = performance.now() + 400; };
    window.addEventListener("scroll", onPageScroll, { passive: true });

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(el);
    el.addEventListener("pointerenter", hold);
    el.addEventListener("pointerleave", release);
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("touchend", release);
    el.addEventListener("touchcancel", release);
    el.addEventListener("focusin", hold);
    el.addEventListener("focusout", release);
    el.addEventListener("scroll", onScroll, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("scroll", onPageScroll);
      el.removeEventListener("pointerenter", hold);
      el.removeEventListener("pointerleave", release);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("touchend", release);
      el.removeEventListener("touchcancel", release);
      el.removeEventListener("focusin", hold);
      el.removeEventListener("focusout", release);
      el.removeEventListener("scroll", onScroll);
    };
  }, [moving, seconds]);

  return (
    <div
      ref={box}
      className={`marquee -mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden ${moving ? "[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]" : ""}`}
      role="region"
      aria-label={ariaLabel}
    >
      <div className="flex w-max gap-3">
        <ul ref={list} className="flex shrink-0 gap-3">{children}</ul>
        {moving && (
          <ul ref={copy} className="flex shrink-0 gap-3" aria-hidden="true" inert>
            {children}
          </ul>
        )}
      </div>
    </div>
  );
}
