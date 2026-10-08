"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, Clock, ImageUp, ShieldAlert, ShieldQuestion } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PLATFORM_NAMES } from "@/config/platforms";
import { UPLOAD_KINDS } from "@/config/uploads";
import { REVIEW_HOURS, type DisplayStatus } from "@/config/verification";
import type { Platform } from "@/generated/prisma/enums";
import { toIntlLocale, type Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/format";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { cancelVerification, submitVerification } from "./actions";

export type VerifyAccount = {
  id: string;
  platform: Platform;
  handle: string;
  followers: number;
  status: DisplayStatus;
  verifiedUntil: string | null;
  /** Whole days until the verification ends (computed on the server). */
  daysLeft: number;
  /** A pending request (first check or renewal). */
  pendingSince: string | null;
  /** Reason key of the latest rejection, when the latest decision was a rejection. */
  rejectReason: string | null;
};

const chip: Record<DisplayStatus, string> = {
  none: "bg-navy/5 text-muted",
  in_review: "bg-blue/10 text-blue",
  verified: "bg-good/10 text-good",
  expiring: "bg-warn/10 text-warn",
  expired: "bg-warn/10 text-warn",
  rejected: "bg-bad/10 text-bad",
};

export function VerificationList({ accounts }: { accounts: VerifyAccount[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {accounts.map((a) => <AccountRow key={a.id} account={a} />)}
    </ul>
  );
}

function AccountRow({ account: a }: { account: VerifyAccount }) {
  const t = useTranslations("VerificationPage");
  const e = useTranslations("EditPage");
  const lang = useLocale().slice(0, 2) as Locale;
  const router = useRouter();
  const fileId = useId();
  const [busy, setBusy] = useState<"" | "upload" | "cancel">("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const date = (iso: string) => new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" }).format(new Date(iso));
  const pending = !!a.pendingSince;
  const status: DisplayStatus = pending && a.status !== "verified" && a.status !== "expiring" ? "in_review" : a.status;

  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy("upload");
    const uploaded = await uploadFile("verification", await shrinkImage(file, 2400, 0.9));
    if ("error" in uploaded) {
      setBusy("");
      return setError(e(`uploadErrors.${uploaded.error}`));
    }
    const res = await submitVerification(a.id, uploaded.path);
    setBusy("");
    if (!res.ok) return setError(e("errors.failed"));
    startTransition(() => router.refresh());
  }

  const cancel = () =>
    startTransition(async () => {
      setBusy("cancel");
      const res = await cancelVerification(a.id);
      setBusy("");
      if (!res.ok) setError(e("errors.failed"));
      router.refresh();
    });

  const Icon = status === "verified" ? BadgeCheck : status === "in_review" ? Clock : status === "none" ? ShieldQuestion : ShieldAlert;
  const canSubmit = !pending && status !== "verified";

  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformIcon platform={a.platform} />
          <span className="font-bold">{PLATFORM_NAMES[a.platform]}</span>
          <span dir="ltr" className="truncate text-sm text-muted">@{a.handle}</span>
          <span className={`ms-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${chip[status]}`}>
            <Icon aria-hidden="true" size={14} /> {t(`status.${status}`)}
          </span>
        </div>
        <p className="text-sm text-muted">{t("followers", { n: formatNumber(a.followers, lang) })}</p>

        {(status === "verified" || status === "expiring") && a.verifiedUntil && (
          <p className={`text-sm ${status === "expiring" ? "text-warn" : "text-good"}`}>
            {status === "expiring" ? t("expiresIn", { days: a.daysLeft, date: date(a.verifiedUntil) }) : t("validUntil", { date: date(a.verifiedUntil) })}
          </p>
        )}
        {status === "expired" && <p className="text-sm text-warn">{t("expiredNote")}</p>}
        {pending && (
          <p className="text-sm text-blue">
            {a.status === "verified" || a.status === "expiring" ? t("renewalPending", { hours: REVIEW_HOURS }) : t("pendingNote", { hours: REVIEW_HOURS })}
          </p>
        )}
        {/* Also after a rejected renewal, while the old verification is still valid. */}
        {!pending && a.rejectReason && (
          <p className="rounded-xl bg-bad/5 p-3 text-sm text-bad">{t("rejectedBecause")} {t(`reasons.${a.rejectReason}`)}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {(canSubmit || status === "expiring" || pending) && (
            <>
              <label htmlFor={fileId} className={`${buttonClasses(pending ? "secondary" : "primary")} cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
                <ImageUp aria-hidden="true" size={18} />
                {busy === "upload" ? e("uploading") : pending ? t("replaceScreenshot") : status === "expiring" ? t("renew") : t("sendScreenshot")}
              </label>
              <input id={fileId} type="file" accept={UPLOAD_KINDS.verification.types.join(",")} className="sr-only" disabled={!!busy} onChange={(ev) => { upload(ev.target.files?.[0]); ev.target.value = ""; }} />
            </>
          )}
          {pending && (
            <button type="button" onClick={cancel} disabled={!!busy} className="min-h-11 px-3 text-sm text-muted underline">
              {t("cancelRequest")}
            </button>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </Card>
    </li>
  );
}
