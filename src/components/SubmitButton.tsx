"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "./ui/Button";

type Props = {
  children: ReactNode;
  pendingText: string;
  variant?: Parameters<typeof buttonClasses>[0];
  className?: string;
};

/** Submit button that shows progress and blocks double clicks while its form runs. */
export function SubmitButton({ children, pendingText, variant = "primary", className = "" }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClasses(variant, className)}>
      {pending ? pendingText : children}
    </button>
  );
}
