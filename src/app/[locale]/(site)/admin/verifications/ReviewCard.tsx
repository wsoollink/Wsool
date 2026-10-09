"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/creator/Modal";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { Card } from "@/components/ui/Card";
import { PLATFORM_NAMES } from "@/config/platforms";
import { REJECT_REASONS, REVIEW_CHECKS } from "@/config/verification";
import type { Platform } from "@/generated/prisma/enums";
import { approveVerification, rejectVerification } from "./actions";

export type ReviewItem = {
  id: string;
  platform: Platform;
  handle: string;
  followers: string;
  profileUrl: string;
  username: string;
  screenshotUrl: string | null;
  waiting: string;
  overdue: boolean;
  renewal: boolean;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy/6 py-2.5 last:border-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-end text-sm font-bold">{children}</dd>
    </div>
  );
}

/** Detail panel of the queue: screenshot next to what the creator entered, three checks, approve or reject. */
export function ReviewCard({ item, canDecide }: { item: ReviewItem; canDecide: boolean }) {
  const t = useTranslations("Admin.verifications");
  const router = useRouter();
  const [checks, setChecks] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [zoom, setZoom] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const allChecked = REVIEW_CHECKS.every((c) => checks.includes(c));

  const decide = (fn: () => Promise<{ ok?: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) return router.refresh();
      setMessage(t(`errors.${res.error ?? "failed"}`));
      if (res.error === "already_decided") router.refresh();
    });

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-navy/5"><PlatformIcon platform={item.platform} size={22} /></span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-lg font-black">{PLATFORM_NAMES[item.platform]} <bdi dir="ltr" className="font-bold text-muted">@{item.handle}</bdi></h2>
          <span className={`text-xs ${item.overdue ? "font-bold text-bad" : "text-muted"}`}>{t("waiting")} {item.waiting}</span>
        </div>
        {item.renewal && <span className="rounded-full bg-blue/10 px-2.5 py-1 text-xs font-bold text-blue">{t("renewal")}</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-bold text-muted">{t("screenshot")}</h3>
          {item.screenshotUrl ? (
            <button type="button" onClick={() => setZoom(true)} aria-label={t("zoom")} className="block w-full overflow-hidden rounded-2xl border border-navy/8 bg-navy/5">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private file */}
              <img src={item.screenshotUrl} alt={t("screenshotOf", { handle: item.handle })} className="max-h-[520px] w-full object-contain" />
            </button>
          ) : (
            <p className="rounded-2xl bg-bad/5 p-4 text-sm text-bad">{t("noScreenshot")}</p>
          )}
          {item.screenshotUrl && (
            <Modal open={zoom} onClose={() => setZoom(false)} title={`@${item.handle}`} closeLabel={t("close")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private file */}
              <img src={item.screenshotUrl} alt={t("screenshotOf", { handle: item.handle })} className="w-full rounded-xl" />
            </Modal>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <h3 className="text-[13px] font-bold text-muted">{t("entered")}</h3>
            <dl>
              <Field label={t("account")}>
                <a href={item.profileUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex min-h-11 items-center gap-1 text-blue">
                  @{item.handle} <ExternalLink aria-hidden="true" size={14} />
                </a>
              </Field>
              <Field label={t("claimedFollowers")}><span className="font-numbers text-lg">{item.followers}</span></Field>
              <Field label={t("page")}>
                <a href={`/${item.username}`} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex min-h-11 items-center text-blue">wsool.link/{item.username}</a>
              </Field>
            </dl>
          </div>

          {canDecide ? (
            <>
              <fieldset className="flex flex-col gap-1 rounded-2xl bg-navy/[0.03] p-3">
                <legend className="sr-only">{t("checksTitle")}</legend>
                <p aria-hidden="true" className="mb-1 text-[13px] font-bold">{t("checksTitle")}</p>
                {REVIEW_CHECKS.map((c) => (
                  <label key={c} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox" className="size-5 shrink-0 accent-good" checked={checks.includes(c)}
                      onChange={(ev) => setChecks(ev.target.checked ? [...checks, c] : checks.filter((x) => x !== c))}
                    />
                    {t(`checks.${c}`)}
                  </label>
                ))}
              </fieldset>

              {rejecting ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-bad/30 p-3">
                  <label htmlFor={`reason-${item.id}`} className="text-sm font-bold">{t("rejectReason")}</label>
                  <select id={`reason-${item.id}`} value={reason} onChange={(ev) => setReason(ev.target.value)} className="h-12 rounded-xl border border-navy/16 bg-white px-3 text-[15px]">
                    <option value="">{t("chooseReason")}</option>
                    {REJECT_REASONS.map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
                  </select>
                  <p className="text-xs text-muted">{t("reasonSent")}</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={!reason || pending} onClick={() => decide(() => rejectVerification(item.id, reason))} className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-bad px-5 text-sm font-bold text-white disabled:opacity-40">
                      {t("confirmReject")}
                    </button>
                    <button type="button" onClick={() => { setRejecting(false); setReason(""); }} className="inline-flex h-12 items-center justify-center rounded-full bg-navy/5 px-5 text-sm font-bold">
                      {t("back")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" disabled={!allChecked || pending} onClick={() => decide(() => approveVerification(item.id, checks))} className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-good px-5 text-sm font-bold text-white disabled:opacity-40">
                    {t("approve")}
                  </button>
                  <button type="button" disabled={pending} onClick={() => setRejecting(true)} className="inline-flex h-12 flex-1 items-center justify-center rounded-full border-[1.5px] border-bad px-5 text-sm font-bold text-bad disabled:opacity-40">
                    {t("reject")}
                  </button>
                </div>
              )}
              {!allChecked && !rejecting && <p className="text-xs text-muted">{t("errors.checks")}</p>}
            </>
          ) : (
            <p className="text-sm text-muted">{t("viewOnly")}</p>
          )}
          {message && <p role="alert" className="text-sm text-bad">{message}</p>}
        </div>
      </div>
    </Card>
  );
}
