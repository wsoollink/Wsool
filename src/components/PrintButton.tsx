"use client";

import { Download } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses("primary", "print:hidden")}>
      <Download aria-hidden="true" size={18} /> {label}
    </button>
  );
}
