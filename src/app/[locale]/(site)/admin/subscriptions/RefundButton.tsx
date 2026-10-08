"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { refund } from "./actions";

export function RefundButton({ invoiceId, label }: { invoiceId: string; label: string }) {
  const t = useTranslations("Admin.subscriptions");
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button" disabled={pending}
        onClick={() => { if (window.confirm(t("confirmRefund", { label }))) startTransition(async () => { const res = await refund(invoiceId); if (!res.ok) setError(t("refundFailed")); router.refresh(); }); }}
        className="min-h-11 px-2 text-sm text-bad underline"
      >
        {t("refund")}
      </button>
      {error && <span role="alert" className="text-xs text-bad">{error}</span>}
    </>
  );
}
