"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  /** Narrow portrait sheet for videos. */
  size?: "default" | "portrait";
};

/**
 * Pop-up built on the native <dialog>: focus is trapped, Esc closes it and
 * focus returns to the button that opened it.
 */
export function Modal({ open, onClose, title, closeLabel, children, size = "default" }: Props) {
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={`m-auto w-[calc(100%-2rem)] rounded-[24px] border border-[var(--page-line)] bg-[var(--page-bg)] p-0 text-[var(--page-text)] backdrop:bg-black/60 backdrop:backdrop-blur-sm ${
        size === "portrait" ? "max-w-sm" : "max-w-md"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--page-line)] px-4 py-2">
        <h2 className="truncate font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--page-surface)]"
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>
      <div className="p-4">{open && children}</div>
    </dialog>
  );
}
