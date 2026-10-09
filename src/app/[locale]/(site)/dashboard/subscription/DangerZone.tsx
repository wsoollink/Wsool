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
  const [open, setOpen] = useState(false);

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
    <Card className="flex flex-col gap-3">
      <h2 className="font-bold">{t("title")}</h2>
      <p className="text-[13px] text-muted">{t("intro")}</p>
      <div className="flex flex-wrap gap-2">
        <a href="/api/account/export" download className={buttonClasses("secondary")}>
          <Download aria-hidden="true" size={18} /> {t("download")}
        </a>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-bad">
          <Trash2 aria-hidden="true" size={18} /> {t("deleteButton")}
        </button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="del-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,12,16,0.5)] p-4" onClick={(e) => e.target === e.currentTarget && setOpen(false)} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
          <div className="flex w-[min(440px,100%)] flex-col gap-4 rounded-[22px] bg-white p-5 shadow-[0_24px_60px_rgba(10,12,16,0.25)]">
            <h2 id="del-title" className="text-lg font-bold">{t("modalTitle")}</h2>
            <ul className="flex list-disc flex-col gap-1.5 ps-5 text-[13.5px] text-muted">
              <li>{t.rich("b1", { link: () => <bdi dir="ltr">wsool.link/{username}</bdi> })}</li>
              <li>{t("b2")}</li>
              <li>{t("b3")}</li>
              <li>{t("b4")}</li>
            </ul>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-username" className="text-[13px] font-medium">{t.rich("typeUsername2", { u: () => <b dir="ltr">{username}</b> })}</label>
              <input id="confirm-username" autoFocus dir="ltr" autoComplete="off" value={confirm} onChange={(ev) => { setConfirm(ev.target.value); setError(""); }} className="h-12 rounded-xl border border-navy/16 bg-white px-3 text-[15px]" />
            </div>
            {error && <p role="alert" className="text-sm text-bad">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-12 items-center justify-center rounded-full bg-navy/5 text-sm font-medium">{t("cancel")}</button>
              <button
                type="button" disabled={pending || confirm.trim().toLowerCase() !== username}
                onClick={() => startTransition(async () => { const res = await requestDeletion(confirm); if (!res.ok) setError(t("mismatch")); else setOpen(false); router.refresh(); })}
                className="inline-flex h-12 items-center justify-center rounded-full bg-bad text-sm font-bold text-white disabled:opacity-40"
              >
                {t("deleteButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
