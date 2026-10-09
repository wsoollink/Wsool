"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, FileBadge, ImageUp } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { Card } from "@/components/ui/Card";
import { PLATFORM_NAMES } from "@/config/platforms";
import { UPLOAD_KINDS } from "@/config/uploads";
import { REVIEW_HOURS, type DisplayStatus } from "@/config/verification";
import type { Platform } from "@/generated/prisma/enums";
import { fromIntlLocale, toIntlLocale } from "@/i18n/config";
import { formatNumber } from "@/lib/format";
import { shrinkImage, uploadFile } from "@/lib/upload-client";
import { cancelLicense, cancelVerification, submitLicense, submitVerification } from "./actions";

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

export type VerifyLicense = { id: string; name: string; number: string; hasFile: boolean; status: "none" | "in_review" | "verified" | "rejected"; rejectReason: string | null };

const pill: Record<DisplayStatus, string> = {
  none: "bg-navy/5 text-muted",
  in_review: "bg-warn/10 text-warn",
  verified: "bg-good/10 text-good",
  expiring: "bg-warn/10 text-warn",
  expired: "bg-warn/10 text-warn",
  rejected: "bg-bad/8 text-bad",
};

function StatusPill({ status, label }: { status: DisplayStatus; label: string }) {
  return (
    <span className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold ${pill[status]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> {label}
    </span>
  );
}

/** Summary + one card per account + licenses (dashboard design). */
export function VerificationList({ accounts, licenses }: { accounts: VerifyAccount[]; licenses: VerifyLicense[] }) {
  const t = useTranslations("VerificationPage");
  const ok = accounts.filter((a) => a.status === "verified" || a.status === "expiring").length;
  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">{t("summaryTitle")}</h2>
            <p className="text-xs text-muted">{t("summaryHint")}</p>
          </div>
          <span dir="ltr" className="font-numbers text-[28px] font-black">{ok}/{accounts.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-navy/5">
          <div className="h-full rounded-full bg-blue" style={{ width: `${accounts.length ? Math.round((ok / accounts.length) * 100) : 0}%` }} />
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-bold">{t("accountsTitle")}</h2>
        <ul className="flex flex-col gap-3">
          {accounts.map((a) => <AccountRow key={a.id} account={a} />)}
        </ul>
      </section>

      <Card className="flex flex-col gap-1">
        <h2 className="mb-1 font-bold">{t("licensesTitle")}</h2>
        {licenses.length === 0 ? (
          <p className="text-sm text-muted">
            {t("noLicenses")} <Link href="/dashboard/edit" className="font-bold text-blue">{t("addLicense")}</Link>
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-navy/6">
            {licenses.map((l) => <LicenseRow key={l.id} license={l} />)}
          </ul>
        )}
      </Card>
    </>
  );
}

function AccountRow({ account: a }: { account: VerifyAccount }) {
  const t = useTranslations("VerificationPage");
  const e = useTranslations("EditPage");
  const lang = fromIntlLocale(useLocale());
  const router = useRouter();
  const fileId = useId();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"" | "upload" | "cancel">("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();
  const date = (iso: string) => new Intl.DateTimeFormat(toIntlLocale(lang), { dateStyle: "medium" }).format(new Date(iso));
  const pending = !!a.pendingSince;
  const status: DisplayStatus = pending && a.status !== "verified" && a.status !== "expiring" ? "in_review" : a.status;
  const canAct = !pending && status !== "verified";

  async function send() {
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
    setOpen(false);
    setFile(null);
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

  let detail = t("followers", { n: formatNumber(a.followers, lang) });
  if ((status === "verified" || status === "expiring") && a.verifiedUntil) detail = status === "expiring" ? t("expiresIn", { days: a.daysLeft, date: date(a.verifiedUntil) }) : t("validUntil", { date: date(a.verifiedUntil) });

  return (
    <li>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy/5"><PlatformIcon platform={a.platform} size={18} /></span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-bold">{PLATFORM_NAMES[a.platform]} <span dir="ltr" className="font-normal text-muted">@{a.handle}</span></span>
            <span className="text-xs text-muted">{detail}</span>
          </span>
          <StatusPill status={status} label={t(`status.${status}`)} />
        </div>

        {status === "expired" && <p className="text-sm text-warn">{t("expiredNote")}</p>}
        {pending && (
          <p className="text-[13px] text-muted">
            {a.status === "verified" || a.status === "expiring" ? t("renewalPending", { hours: REVIEW_HOURS }) : t("pendingNote", { hours: REVIEW_HOURS })}{" "}
            <button type="button" onClick={cancel} disabled={!!busy} className="inline-flex min-h-11 items-center font-bold text-blue">{t("cancelRequest")}</button>
          </p>
        )}
        {!pending && a.rejectReason && (
          <p className="rounded-xl bg-bad/5 p-3 text-sm text-bad">{t("rejectedBecause")} {t(`reasons.${a.rejectReason}`)}</p>
        )}

        {(canAct || status === "expiring") && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex h-11 items-center gap-2 self-start rounded-xl text-[13.5px] font-bold text-blue">
            <ChevronDown aria-hidden="true" size={18} className={open ? "rotate-180" : ""} />
            {status === "expiring" ? t("renew") : status === "rejected" || status === "expired" ? t("sendAgain") : t("verifyAccount")}
          </button>
        )}

        {open && (
          <div className="flex flex-col gap-2">
            <label htmlFor={fileId} className={`flex cursor-pointer flex-col items-center gap-1 rounded-[14px] border-2 border-dashed px-4 py-5 text-center ${file ? "border-blue bg-blue/5" : "border-navy/12 bg-white/60"}`}>
              <ImageUp aria-hidden="true" size={22} className="text-blue" />
              <span className="text-[13.5px] font-bold">{file ? file.name : t("dropTitle")}</span>
              <span className="text-xs text-muted">{file ? t("dropChange") : t("dropHint")}</span>
            </label>
            <input id={fileId} type="file" accept={UPLOAD_KINDS.verification.types.join(",")} className="sr-only" disabled={!!busy} onChange={(ev) => { setFile(ev.target.files?.[0] ?? null); ev.target.value = ""; }} />
            <button type="button" onClick={send} disabled={!file || !!busy} className="inline-flex h-12 items-center justify-center rounded-full bg-blue text-sm font-bold text-white disabled:bg-navy/10 disabled:text-muted">
              {busy === "upload" ? e("uploading") : t("submit")}
            </button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </Card>
    </li>
  );
}

function LicenseRow({ license: l }: { license: VerifyLicense }) {
  const t = useTranslations("VerificationPage");
  const e = useTranslations("EditPage");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<{ ok?: boolean }>) =>
    startTransition(async () => {
      const res = await fn();
      setError(res.ok ? "" : e("errors.failed"));
      router.refresh();
    });

  return (
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex items-center gap-3">
        <FileBadge aria-hidden="true" size={20} className="shrink-0 text-muted" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-bold">{l.name}</span>
          {l.number && <span dir="ltr" className="text-xs text-muted rtl:text-end">{l.number}</span>}
        </span>
        {l.status === "none" || l.status === "rejected" ? (
          l.hasFile ? (
            <button type="button" disabled={pending} onClick={() => run(() => submitLicense(l.id))} className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-bold text-blue">
              {l.status === "rejected" ? t("sendAgain") : t("verifyLicense")}
            </button>
          ) : (
            <Link href="/dashboard/edit" className="inline-flex min-h-11 items-center rounded-full px-3 text-xs font-bold text-blue">{t("uploadFile")}</Link>
          )
        ) : (
          <StatusPill status={l.status} label={t(`licenseStatus.${l.status}`)} />
        )}
      </div>
      {l.status === "in_review" && (
        <p className="text-xs text-muted">
          {t("pendingNote", { hours: REVIEW_HOURS })}{" "}
          <button type="button" disabled={pending} onClick={() => run(() => cancelLicense(l.id))} className="inline-flex min-h-11 items-center font-bold text-blue">{t("cancelRequest")}</button>
        </p>
      )}
      {l.status === "rejected" && l.rejectReason && <p className="text-xs text-bad">{t("rejectedBecause")} {t(`reasons.${l.rejectReason}`)}</p>}
      {error && <p role="alert" className="text-xs text-bad">{error}</p>}
    </li>
  );
}
