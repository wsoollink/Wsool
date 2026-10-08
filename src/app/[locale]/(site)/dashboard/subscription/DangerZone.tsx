"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requestDeletion, undoDeletion } from "./actions";

/** Download data, then type the username to delete (30-day undo window). */
export function DangerZone({ username, deletedAt, purgeDate }: { username: string; deletedAt: boolean; purgeDate: string | null }) {
  const t = useTranslations("Billing.delete");
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  if (deletedAt) {
    return (
      <Card className="flex flex-col gap-3 border-bad/40">
        <h2 className="font-bold text-bad">{t("scheduledTitle")}</h2>
        <p className="text-sm">{t("scheduledBody", { date: purgeDate ?? "" })}</p>
        <button type="button" disabled={pending} onClick={() => startTransition(async () => { await undoDeletion(); router.refresh(); })} className={buttonClasses("primary", "self-start")}>
          {t("undo")}
        </button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-bold">{t("title")}</h2>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">{t("downloadHint")}</p>
        <a href="/api/account/export" download className={buttonClasses("secondary", "self-start")}>
          <Download aria-hidden="true" size={18} /> {t("download")}
        </a>
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <p className="text-sm text-muted">{t("deleteHint")}</p>
        <label htmlFor="confirm-username" className="text-sm font-medium">{t("typeUsername", { username })}</label>
        <input id="confirm-username" dir="ltr" autoComplete="off" value={confirm} onChange={(ev) => { setConfirm(ev.target.value); setError(""); }} className="min-h-11 rounded-xl border border-line bg-card px-3 text-base" />
        <button
          type="button" disabled={pending || confirm.trim().toLowerCase() !== username}
          onClick={() => startTransition(async () => { const res = await requestDeletion(confirm); if (!res.ok) setError(t("mismatch")); router.refresh(); })}
          className={buttonClasses("secondary", "self-start text-bad")}
        >
          <Trash2 aria-hidden="true" size={18} /> {t("deleteButton")}
        </button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </div>
    </Card>
  );
}
