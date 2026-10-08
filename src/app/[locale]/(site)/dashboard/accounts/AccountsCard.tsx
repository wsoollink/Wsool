"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HANDLE_PATTERN, normalizeHandle, PLATFORM_NAMES, PLATFORMS } from "@/config/platforms";
import type { Platform, VerificationStatus } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/config";
import { digitsOnly, formatNumber } from "@/lib/format";
import { MAX_ACCOUNTS, MAX_FOLLOWERS } from "@/lib/validation/accounts";
import { saveAccounts } from "./actions";

export type AccountRow = { id: string | null; platform: Platform; handle: string; followers: number; verificationStatus: VerificationStatus };
type Row = Omit<AccountRow, "followers"> & { key: string; followers: string; original?: AccountRow; error?: boolean };

const newKey = () => Math.random().toString(36).slice(2);
const iconButton = "inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-navy/5 disabled:opacity-30";
const control = "min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base aria-[invalid=true]:border-bad";

const toRow = (a: AccountRow): Row => ({ ...a, key: a.id ?? newKey(), followers: String(a.followers), original: a });

function isChanged(row: Row) {
  const o = row.original;
  return !!o && (o.platform !== row.platform || o.handle !== normalizeHandle(row.handle) || String(o.followers) !== row.followers);
}

/** Social accounts: platform, handle, followers; reorder, add, delete. */
export function AccountsCard({ initial }: { initial: AccountRow[] }) {
  const t = useTranslations("AccountsPage");
  const e = useTranslations("EditPage");
  const lang = useLocale().slice(0, 2) as Locale;
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [status, setStatus] = useState<"" | "saved" | "failed" | "incomplete">("");
  const [resetNote, setResetNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const update = (key: string, patch: Partial<Row>) => {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch, error: false } : r)));
    setStatus("");
  };
  const move = (i: number, by: number) => {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setRows(next);
    setStatus("");
  };
  const add = () => {
    const unused = PLATFORMS.find((p) => !rows.some((r) => r.platform === p)) ?? PLATFORMS[0];
    setRows([...rows, { key: newKey(), id: null, platform: unused, handle: "", followers: "", verificationStatus: "none" }]);
    setStatus("");
  };

  const save = () => {
    const checked = rows.map((r) => {
      const handle = normalizeHandle(r.handle);
      const followers = Number(r.followers);
      const valid = HANDLE_PATTERN.test(handle) && r.followers !== "" && followers <= MAX_FOLLOWERS;
      return { ...r, handle, error: !valid };
    });
    setRows(checked);
    if (checked.some((r) => r.error)) return setStatus("incomplete");

    startTransition(async () => {
      const res = await saveAccounts(checked.map((r) => ({ id: r.id, platform: r.platform, handle: r.handle, followers: Number(r.followers) })));
      if (!res.ok || !res.accounts) return setStatus("failed");
      const saved = res.accounts;
      setResetNote(saved.some((a) => a.verificationReset));
      setRows(
        checked.map((r, i) =>
          toRow({
            id: saved[i].id,
            platform: r.platform,
            handle: saved[i].handle,
            followers: Number(r.followers),
            verificationStatus: saved[i].verificationReset ? "none" : r.verificationStatus,
          }),
        ),
      );
      setStatus("saved");
      // The audience card below lists the saved accounts.
      router.refresh();
    });
  };

  const total = rows.reduce((sum, r) => sum + (Number(r.followers) || 0), 0);

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="font-bold">{t("accounts")}</h2>
        <p className="text-xs text-muted">{t("accountsHint", { max: MAX_ACCOUNTS })}</p>
      </div>

      {rows.length === 0 && <p className="text-sm text-muted">{t("noAccounts")}</p>}

      <ul className="flex flex-col gap-3">
        {rows.map((row, i) => {
          const name = PLATFORM_NAMES[row.platform];
          const verifiedish = row.verificationStatus === "verified" || row.verificationStatus === "in_review";
          return (
            <li key={row.key} className="flex flex-col gap-3 rounded-2xl border border-line p-3">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={row.platform} className="shrink-0 text-navy" />
                <label htmlFor={`platform-${row.key}`} className="sr-only">{t("platform")}</label>
                <select
                  id={`platform-${row.key}`} value={row.platform} dir="ltr"
                  onChange={(ev) => update(row.key, { platform: ev.target.value as Platform })}
                  className={`${control} flex-1 px-3`}
                >
                  {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_NAMES[p]}</option>)}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`handle-${row.key}`} className="text-sm font-medium">{t("handle")}</label>
                  <input
                    id={`handle-${row.key}`} dir="ltr" value={row.handle} placeholder="@username" autoComplete="off" spellCheck={false}
                    aria-invalid={row.error && !HANDLE_PATTERN.test(normalizeHandle(row.handle))}
                    onChange={(ev) => update(row.key, { handle: ev.target.value })}
                    onBlur={() => update(row.key, { handle: normalizeHandle(row.handle) })}
                    className={control}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`followers-${row.key}`} className="text-sm font-medium">{t("followers")}</label>
                  <input
                    id={`followers-${row.key}`} dir="ltr" inputMode="numeric" value={row.followers} placeholder="0" autoComplete="off"
                    aria-invalid={row.error && (row.followers === "" || Number(row.followers) > MAX_FOLLOWERS)}
                    onChange={(ev) => update(row.key, { followers: digitsOnly(ev.target.value, 10) })}
                    className={control}
                  />
                </div>
              </div>
              {row.error && <p className="text-sm text-bad">{t("rowError")}</p>}
              {verifiedish && isChanged(row) && <p className="text-sm text-warn">{t("verificationWarning")}</p>}
              {!isChanged(row) && row.verificationStatus === "verified" && <p className="text-xs text-good">{t("verified")}</p>}
              {!isChanged(row) && row.verificationStatus === "in_review" && <p className="text-xs text-muted">{t("inReview")}</p>}
              <div className="-mb-1 flex justify-end gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={e("moveUp", { item: name })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={e("moveDown", { item: name })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                <button type="button" onClick={() => { setRows(rows.filter((r) => r.key !== row.key)); setStatus(""); }} aria-label={e("remove", { item: name })} className={iconButton}><Trash2 aria-hidden="true" size={16} /></button>
              </div>
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={add} disabled={rows.length >= MAX_ACCOUNTS} className={buttonClasses("secondary", "self-start")}>
        <Plus aria-hidden="true" size={18} /> {t("addAccount")}
      </button>

      <p className="text-sm text-muted">
        {t("total")}: <span className="font-bold text-navy">{formatNumber(total, lang)}</span>
      </p>

      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
          {status === "saved" ? (resetNote ? t("savedReset") : e("saved")) : status === "failed" ? e("errors.failed") : status === "incomplete" ? e("fixErrors") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? e("saving") : e("save")}
        </button>
      </div>
    </Card>
  );
}
