"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * A submit button that reacts the moment it's pressed (owner, Nov 2026: "sign out" felt stuck): while its form's
 * server action runs, the icon turns into a spinner and the button is disabled, so it can't be pressed twice.
 */
export function PendingSubmit({ icon, children, className, label }: { icon: ReactNode; children?: ReactNode; className: string; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} aria-label={label} className={className}>
      {pending ? <Loader2 aria-hidden="true" size={17} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
