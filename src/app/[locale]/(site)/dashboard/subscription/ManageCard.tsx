"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { changeCycle, toggleAutoRenew } from "./actions";

/** Auto-renew on/off and the cycle for the next renewal (active subscriptions). */
export function ManageCard({ autoRenew, cycle, hasCard }: { autoRenew: boolean; cycle: "monthly" | "yearly"; hasCard: boolean }) {
  const t = useTranslations("Billing");
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? t("saved") : t("errors.failed"));
      router.refresh();
    });

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-bold">{t("manage")}</h2>
      <div className="flex flex-col gap-2">
        <p className="text-sm">{autoRenew ? t("autoRenewOn") : t("autoRenewOff")}</p>
        <button
          type="button" disabled={pending || (!autoRenew && !hasCard)}
          onClick={() => { if (!autoRenew || window.confirm(t("confirmCancel"))) run(() => toggleAutoRenew(!autoRenew)); }}
          className={buttonClasses("secondary", `self-start ${autoRenew ? "text-bad" : ""}`)}
        >
          {autoRenew ? t("cancelRenew") : t("resumeRenew")}
        </button>
      </div>
      {autoRenew && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm">{t("nextCycle", { cycle: t(cycle) })}</p>
          <button type="button" disabled={pending} onClick={() => run(() => changeCycle(cycle === "monthly" ? "yearly" : "monthly"))} className={buttonClasses("secondary", "self-start")}>
            {cycle === "monthly" ? t("switchToYearly") : t("switchToMonthly")}
          </button>
        </div>
      )}
      {message && <p role="status" className="text-sm text-good">{message}</p>}
    </Card>
  );
}
