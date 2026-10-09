"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  /**
   * "media": dark backdrop, content floats on it (videos, license files).
   * "panel": blurred backdrop with a frosted panel (audience data).
   */
  variant?: "media" | "panel";
};

/**
 * Pop-up built on the native <dialog>: focus is trapped, Esc closes it and
 * focus returns to the button that opened it. As in the design there is no
 * header bar: a round close button floats in the top corner.
 */
export function Modal({ open, onClose, title, closeLabel, children, variant = "media" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      className={`m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-[var(--page-text)] ${
        variant === "media" ? "backdrop:bg-[rgba(10,12,16,0.85)]" : "backdrop:bg-[rgba(10,12,16,0.5)] backdrop:backdrop-blur-[6px]"
      }`}
    >
      {/* Clicking outside the content closes the pop-up. */}
      <div
        className="flex min-h-full items-center justify-center px-4 pt-[72px] pb-6"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="fixed end-4 top-4 inline-flex size-11 items-center justify-center rounded-full border border-black/5 bg-white/95 text-[#12151A] backdrop-blur-md"
        >
          <X aria-hidden="true" size={20} />
        </button>
        {open && children}
      </div>
    </dialog>
  );
}
