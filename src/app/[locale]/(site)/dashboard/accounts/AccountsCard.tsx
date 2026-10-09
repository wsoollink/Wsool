"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowDown, ArrowUp, BadgeCheck, ChevronDown, Plus, Trash2, Users } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
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
const iconButton = "inline-flex size-11 items-center justify-center rounded-[10px] bg-navy/5 text-navy disabled:opacity-30";
const control = "h-12 w-full rounded-xl border border-navy/16 bg-white px-3 text-[15px] aria-[invalid=true]:border-bad";

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
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const addPlatform = (platform: Platform) => {
    const key = newKey();
    setRows([...rows, { key, id: null, platform, handle: "", followers: "", verificationStatus: "none" }]);
    setOpenKey(key);
    setPicker(false);
    setStatus("");
  };
  const Chevron = ChevronDown;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-[13px] text-muted">{t("totalTitle")}</span>
          <span className="text-xs text-muted">{t("totalHint")}</span>
        </span>
        <span dir="ltr" className="font-numbers text-[30px] font-black">{formatNumber(total, lang)}</span>
      </Card>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-bold">{t("accounts")}</h2>
          <p className="text-xs text-muted">{t("orderHint")}</p>
        </div>
        {rows.length === 0 && <p className="text-sm text-muted">{t("noAccounts")}</p>}
        <ul className="flex flex-col gap-3">
          {rows.map((row, i) => {
            const name = PLATFORM_NAMES[row.platform];
            const verifiedish = row.verificationStatus === "verified" || row.verificationStatus === "in_review";
            const open = openKey === row.key || row.error;
            const statusTone = row.verificationStatus === "verified" ? "text-good" : row.verificationStatus === "in_review" ? "text-warn" : "text-muted";
            return (
              <li key={row.key}>
                <Card className="flex flex-col gap-3 p-0">
                  <button type="button" aria-expanded={!!open} onClick={() => setOpenKey(open ? null : row.key)} className="flex min-h-16 w-full items-center gap-3 px-[18px] py-3 text-start">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy/5"><PlatformIcon platform={row.platform} size={18} /></span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-bold">{name}</span>
                      <span dir="ltr" className="truncate text-xs text-muted rtl:text-end">{row.handle ? `@${normalizeHandle(row.handle)}` : "—"}</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span dir="ltr" className="font-numbers text-base font-black">{formatNumber(Number(row.followers) || 0, lang)}</span>
                      <span className={`flex items-center gap-1 text-[11.5px] font-medium ${statusTone}`}>
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> {t(`vstatus.${row.verificationStatus === "verified" || row.verificationStatus === "in_review" ? row.verificationStatus : "none"}`)}
                      </span>
                    </span>
                    <Chevron aria-hidden="true" size={18} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="flex flex-col gap-3 px-[18px] pb-[18px]">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`handle-${row.key}`} className="text-[13px] font-medium">{t("handle")}</label>
                          <input
                            id={`handle-${row.key}`} dir="ltr" value={row.handle} placeholder="@username" autoComplete="off" spellCheck={false}
                            aria-invalid={row.error && !HANDLE_PATTERN.test(normalizeHandle(row.handle))}
                            onChange={(ev) => update(row.key, { handle: ev.target.value })}
                            onBlur={() => update(row.key, { handle: normalizeHandle(row.handle) })}
                            className={control}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`followers-${row.key}`} className="text-[13px] font-medium">{t("followers")}</label>
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
                      {row.id && (
                        <a href="#audience" className="flex min-h-12 items-center gap-3 rounded-xl bg-navy/5 px-3 text-[13px] font-bold">
                          <Users aria-hidden="true" size={18} /> <span className="flex-1">{t("audienceRow")}</span>
                        </a>
                      )}
                      {row.id && row.verificationStatus === "none" && (
                        <Link href="/dashboard/verification" className="inline-flex min-h-11 items-center gap-2 text-[13px] font-bold text-blue"><BadgeCheck aria-hidden="true" size={16} /> {t("verifyWithScreenshot")}</Link>
                      )}
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={e("moveUp", { item: name })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={e("moveDown", { item: name })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                        <button type="button" onClick={() => { setRows(rows.filter((r) => r.key !== row.key)); setStatus(""); }} className="ms-auto inline-flex h-10 items-center gap-2 rounded-[10px] bg-navy/5 px-3 text-[13px] font-medium text-bad">
                          <Trash2 aria-hidden="true" size={16} /> {t("removeAccount")}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>

        {rows.length < MAX_ACCOUNTS && (
          <button type="button" onClick={() => setPicker(!picker)} aria-expanded={picker} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy/15 text-sm font-bold">
            <Plus aria-hidden="true" size={18} /> {t("addAccount")}
          </button>
        )}
        {picker && (
          <Card className="flex flex-col gap-2">
            <span className="text-[13px] text-muted">{t("pickPlatform")}</span>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => addPlatform(p)} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-navy/5 px-2 text-[13px] font-medium">
                  <PlatformIcon platform={p} size={16} /> {PLATFORM_NAMES[p]}
                </button>
              ))}
            </div>
          </Card>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
          {status === "saved" ? (resetNote ? t("savedReset") : e("saved")) : status === "failed" ? e("errors.failed") : status === "incomplete" ? e("fixErrors") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? e("saving") : e("save")}
        </button>
      </div>
    </div>
  );
}
