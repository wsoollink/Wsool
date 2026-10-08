"use client";

import { Printer } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses("secondary", "print:hidden")}>
      <Printer aria-hidden="true" size={18} /> {label}
    </button>
  );
}
