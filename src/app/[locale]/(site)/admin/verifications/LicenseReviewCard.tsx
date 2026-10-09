"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LICENSE_REJECT_REASONS } from "@/config/verification";
import { decideLicense } from "./actions";

export type LicenseItem = { id: string; name: string; number: string; username: string; fileUrl: string; waiting: string };

/** One license waiting for review: open the file, tick the check, approve or reject with a reason. */
export function LicenseReviewCard({ item, canDecide }: { item: LicenseItem; canDecide: boolean }) {
  const t = useTranslations("Admin.verifications");
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const decide = (approve: boolean) =>
    startTransition(async () => {
      const res = await decideLicense(item.id, approve, reason);
      setMessage(res.ok ? "" : t(`errors.${res.error ?? "failed"}`));
      router.refresh();
    });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-bold">{item.name}</span>
          <span className="text-sm text-muted"><bdi dir="ltr">{item.number}</bdi> · <bdi dir="ltr">wsool.link/{item.username}</bdi></span>
        </div>
        <span className="text-xs text-muted">{item.waiting}</span>
      </div>
      <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "self-start")}>
        <ExternalLink aria-hidden="true" size={16} /> {t("openLicense")}
      </a>
      {canDecide && (
        <>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="size-5 accent-blue" />
            {t("licenseCheck")}
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <button type="button" disabled={!checked || pending} onClick={() => decide(true)} className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-good px-5 text-sm font-bold text-white disabled:opacity-40">
              {t("approveLicense")}
            </button>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`lr-${item.id}`} className="text-xs text-muted">{t("rejectReason")}</label>
              <select id={`lr-${item.id}`} value={reason} onChange={(e) => setReason(e.target.value)} className="h-12 rounded-xl border border-navy/16 bg-white px-3 text-sm">
                <option value="">—</option>
                {LICENSE_REJECT_REASONS.map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
              </select>
            </div>
            <button type="button" disabled={!reason || pending} onClick={() => decide(false)} className="inline-flex h-12 items-center justify-center rounded-full border border-bad px-5 text-sm font-bold text-bad disabled:opacity-40">
              {t("reject")}
            </button>
          </div>
        </>
      )}
      {message && <p role="alert" className="text-sm text-bad">{message}</p>}
    </Card>
  );
}
