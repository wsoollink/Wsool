"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** A coupon code with a copy button (counted as coupon_copy by the Tracker through data-track). */
export function CopyCode({ id, code, copyLabel, copiedLabel, codeLabel }: { id: string; code: string; copyLabel: string; copiedLabel: string; codeLabel: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Older browsers: select the code so the visitor can copy it by hand.
      const range = document.createRange();
      const el = document.getElementById(`code-${id}`);
      if (el) { range.selectNodeContents(el); window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range); }
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button" onClick={copy} data-track={`coupon_copy:${id}`} aria-label={`${copyLabel}: ${codeLabel}`}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-dashed border-[var(--page-accent)] bg-[var(--page-soft)] px-4 transition-colors hover:bg-[var(--page-solid)]"
    >
      <span id={`code-${id}`} dir="ltr" className="truncate font-mono text-[17px] font-bold tracking-[0.12em]">{code}</span>
      <span aria-live="polite" className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-[var(--page-accent)]">
        {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
        {copied ? copiedLabel : copyLabel}
      </span>
    </button>
  );
}
