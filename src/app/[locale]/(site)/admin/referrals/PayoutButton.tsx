"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { recordBankPayout } from "./actions";

/** "Transferred": asks for the bank transfer reference, then records the payout of the whole balance. */
export function PayoutButton({ userId, who, amount }: { userId: string; who: string; amount: string }) {
  const t = useTranslations("Admin.referrals");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button" disabled={pending}
        onClick={() => {
          const reference = window.prompt(t("confirmPayout", { amount, who }));
          if (reference === null) return;
          startTransition(async () => {
            const res = await recordBankPayout({ userId, reference });
            setError(res.error ? t(`error.${res.error}`) : "");
            router.refresh();
          });
        }}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-good/10 px-3.5 text-[13px] font-bold whitespace-nowrap text-good hover:bg-good/15"
      >
        <Check aria-hidden="true" size={15} /> {pending ? t("saving") : t("markPaid")}
      </button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </span>
  );
}
