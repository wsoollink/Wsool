"use client";

import { useTransition } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { completeMockPayment } from "./actions";

type Choice = { outcome: "paid" | "failed"; card: "ok" | "fail"; label: string; variant: "primary" | "secondary"; danger?: boolean };

/** Test payment outcomes; each ends with a full redirect to /billing/return, like a real provider. */
export function MockButtons({ invoiceId, choices }: { invoiceId: string; choices: Choice[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {choices.map((c) => (
        <button
          key={c.label} type="button" disabled={pending} aria-busy={pending}
          onClick={() => startTransition(async () => { const { url } = await completeMockPayment(invoiceId, c.outcome, c.card); window.location.assign(url); })}
          className={buttonClasses(c.variant, `w-full ${c.danger ? "text-bad" : ""}`)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
