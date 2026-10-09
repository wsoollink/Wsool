"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CANCEL_REASONS, type CancelReason } from "@/config/plans";
import { changeCycle, toggleAutoRenew } from "./actions";

const soft = "inline-flex h-11 items-center justify-center rounded-full bg-navy/5 px-4 text-[13.5px] font-medium";

/**
 * Cancel / resume and the next-renewal cycle (design: inline "are you sure?"
 * box). Cancelling asks why (owner decision: cancellation survey).
 */
export function ManageCard({ autoRenew, cycle, hasCard, endDate }: { autoRenew: boolean; cycle: "monthly" | "yearly"; hasCard: boolean; endDate: string }) {
  const t = useTranslations("Billing");
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<CancelReason | "">("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? "" : t("errors.failed"));
      setAsking(false);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      {autoRenew && !asking && (
        <button type="button" onClick={() => setAsking(true)} className={`${soft} text-bad`}>{t("cancelSub")}</button>
      )}

      {asking && (
        <div role="alertdialog" aria-labelledby="cx-title" aria-describedby="cx-body" className="flex flex-col gap-3 rounded-[14px] border border-bad/20 bg-bad/4 p-4">
          <h3 id="cx-title" className="text-sm font-bold">{t("cancelSure")}</h3>
          <p id="cx-body" className="text-[12.5px] text-muted">{t("cancelBody", { date: endDate })}</p>
          <fieldset className="flex min-w-0 flex-col gap-1">
            <legend className="mb-1 text-[13px] font-medium">{t("whyCancel")}</legend>
            {CANCEL_REASONS.map((r) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-blue" />
                {t(`cancelReasons.${r}`)}
              </label>
            ))}
          </fieldset>
          <label htmlFor="cx-note" className="sr-only">{t("cancelNote")}</label>
          <textarea id="cx-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t("cancelNote")} className="min-h-20 rounded-xl border border-navy/16 bg-white p-3 text-[15px]" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAsking(false)} className="inline-flex h-11 items-center justify-center rounded-full bg-blue text-[13.5px] font-bold text-white">{t("keepPlan")}</button>
            <button
              type="button" disabled={pending}
              onClick={() => run(() => toggleAutoRenew(false, reason ? { reason, note } : undefined))}
              className={`${soft} text-bad`}
            >
              {t("confirmCancelBtn")}
            </button>
          </div>
        </div>
      )}

      {!autoRenew && (
        <p className="text-[13px] text-warn">
          {t("cancelled", { date: endDate })}{" "}
          {hasCard && (
            <button type="button" disabled={pending} onClick={() => run(() => toggleAutoRenew(true))} className="inline-flex min-h-11 items-center font-bold text-blue">
              {t("resume")}
            </button>
          )}
        </p>
      )}

      {autoRenew && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy/8 pt-3">
          <p className="text-[13px] text-muted">{t("nextCycle", { cycle: t(cycle) })}</p>
          <button type="button" disabled={pending} onClick={() => run(() => changeCycle(cycle === "monthly" ? "yearly" : "monthly"))} className={soft}>
            {cycle === "monthly" ? t("switchToYearly") : t("switchToMonthly")}
          </button>
        </div>
      )}
      {message && <p role="alert" className="text-sm text-bad">{message}</p>}
    </div>
  );
}
