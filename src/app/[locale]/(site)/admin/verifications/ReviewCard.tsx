"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/creator/Modal";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
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

/** One pending request: screenshot, what the creator claims, three checks, approve or reject. */
export function ReviewCard({ item, canDecide }: { item: ReviewItem; canDecide: boolean }) {
  const t = useTranslations("Admin.verifications");
  const router = useRouter();
  const [checks, setChecks] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [zoom, setZoom] = useState(false);
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
    <Card className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        {item.screenshotUrl ? (
          <button type="button" onClick={() => setZoom(true)} aria-label={t("zoom")} className="block w-full overflow-hidden rounded-xl border border-line bg-navy/5">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private file */}
            <img src={item.screenshotUrl} alt={t("screenshotOf", { handle: item.handle })} className="max-h-96 w-full object-contain" />
          </button>
        ) : (
          <p className="text-sm text-bad">{t("noScreenshot")}</p>
        )}
        {item.screenshotUrl && (
          <Modal open={zoom} onClose={() => setZoom(false)} title={`@${item.handle}`} closeLabel={t("close")}>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL of a private file */}
            <img src={item.screenshotUrl} alt={t("screenshotOf", { handle: item.handle })} className="w-full rounded-xl" />
          </Modal>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformIcon platform={item.platform} />
          <span className="font-bold">{PLATFORM_NAMES[item.platform]}</span>
          <a href={item.profileUrl} target="_blank" rel="noopener noreferrer" dir="ltr" className="inline-flex min-h-11 items-center gap-1 text-sm text-blue underline">
            @{item.handle} <ExternalLink aria-hidden="true" size={14} />
          </a>
          {item.renewal && <span className="rounded-full bg-blue/10 px-2 py-0.5 text-xs font-semibold text-blue">{t("renewal")}</span>}
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-xs text-muted">{t("claimedFollowers")}</dt><dd className="font-numbers text-xl font-bold">{item.followers}</dd></div>
          <div><dt className="text-xs text-muted">{t("page")}</dt><dd><a href={`/${item.username}`} target="_blank" rel="noopener noreferrer" dir="ltr" className="text-blue underline">/{item.username}</a></dd></div>
          <div className="col-span-2"><dt className="text-xs text-muted">{t("waiting")}</dt><dd className={item.overdue ? "font-semibold text-bad" : ""}>{item.waiting}</dd></div>
        </dl>

        {canDecide ? (
          <>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-bold">{t("checksTitle")}</legend>
              {REVIEW_CHECKS.map((c) => (
                <label key={c} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox" className="size-5 accent-blue" checked={checks.includes(c)}
                    onChange={(ev) => setChecks(ev.target.checked ? [...checks, c] : checks.filter((x) => x !== c))}
                  />
                  {t(`checks.${c}`)}
                </label>
              ))}
            </fieldset>
            <button type="button" disabled={!allChecked || pending} onClick={() => decide(() => approveVerification(item.id, checks))} className={buttonClasses("primary", "self-start bg-good hover:bg-good/90")}>
              {t("approve")}
            </button>

            <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor={`reason-${item.id}`} className="text-sm font-medium">{t("rejectReason")}</label>
                <select id={`reason-${item.id}`} value={reason} onChange={(ev) => setReason(ev.target.value)} className="min-h-11 rounded-xl border border-line bg-card px-3 text-base">
                  <option value="">{t("chooseReason")}</option>
                  {REJECT_REASONS.map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
                </select>
              </div>
              <button type="button" disabled={!reason || pending} onClick={() => decide(() => rejectVerification(item.id, reason))} className={buttonClasses("secondary", "text-bad")}>
                {t("reject")}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{t("viewOnly")}</p>
        )}
        {message && <p role="alert" className="text-sm text-bad">{message}</p>}
      </div>
    </Card>
  );
}
