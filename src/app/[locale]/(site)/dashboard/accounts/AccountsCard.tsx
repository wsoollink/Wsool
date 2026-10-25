"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowDown, ArrowUp, BadgeCheck, ChevronDown, Link2, Plus, RefreshCw, Trash2, Unlink, Users } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { Panel } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { CONNECT_AUDIENCE, HANDLE_PATTERN, linkProfileUrl, needsLink, normalizeHandle, PLATFORM_NAMES, PLATFORMS } from "@/config/platforms";
import type { Platform, VerificationStatus } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/config";
import { digitsOnly, formatNumber } from "@/lib/format";
import { MAX_ACCOUNTS, MAX_FOLLOWERS } from "@/lib/validation/accounts";
import type { ConnectionInfo } from "@/lib/connect/info";
import { disconnectAccount, saveAccounts } from "./actions";

export type AccountRow = {
  id: string | null; platform: Platform; handle: string; followers: number; verificationStatus: VerificationStatus;
  /** Pasted profile link (only used for the link platforms: Spotify, Discord, Jaco). */
  link: string;
  /** Linked through the platform's sign-in (src/lib/connect): numbers update by themselves. */
  connection?: ConnectionInfo;
};
type Row = Omit<AccountRow, "followers"> & { key: string; followers: string; original?: AccountRow; error?: boolean };

const newKey = () => Math.random().toString(36).slice(2);
const iconButton = "inline-flex size-11 items-center justify-center rounded-[10px] bg-navy/5 text-navy disabled:opacity-30";
const control = "h-11 w-full rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] aria-[invalid=true]:border-bad outline-none shadow-card transition-[border-color,box-shadow] focus:border-blue focus:ring-3 focus:ring-blue/15";

const LINK_PLACEHOLDERS: Partial<Record<Platform, string>> = {
  spotify: "https://open.spotify.com/show/…",
  discord: "https://discord.gg/…",
  jaco: "https://jaco.live/…",
};

const toRow = (a: AccountRow): Row => ({ ...a, key: a.id ?? newKey(), followers: String(a.followers), original: a });

function isChanged(row: Row) {
  const o = row.original;
  return !!o && (o.platform !== row.platform || o.handle !== normalizeHandle(row.handle) || String(o.followers) !== row.followers || (needsLink(row.platform) && o.link !== row.link.trim()));
}

/** Social accounts: platform, handle, followers; reorder, add, delete; link (YouTube…) so numbers update by themselves. */
export function AccountsCard({ initial, connectable = [] }: { initial: AccountRow[]; connectable?: Platform[] }) {
  const t = useTranslations("AccountsPage");
  const e = useTranslations("EditPage");
  const lang = useLocale().slice(0, 2) as Locale;
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [status, setStatus] = useState<"" | "saved" | "failed" | "incomplete">("");
  const [resetNote, setResetNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // Back from a platform's sign-in: ?connected=youtube or ?connect_error=<code>.
  const search = useSearchParams();
  const connectedNow = search.get("connected"), connectError = search.get("connect_error");
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const unlink = (row: Row) => {
    if (!row.id || !window.confirm(t("connect.confirmUnlink", { platform: PLATFORM_NAMES[row.platform] }))) return;
    setUnlinking(row.id);
    startTransition(async () => {
      const res = await disconnectAccount(row.id!);
      setUnlinking(null);
      if (res.ok) { setRows((all) => all.map((r) => (r.key === row.key ? { ...r, connection: null, original: r.original && { ...r.original, connection: null } } : r))); router.refresh(); }
    });
  };

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
      const linkOk = !needsLink(r.platform) || !!linkProfileUrl(r.platform, r.link);
      const valid = HANDLE_PATTERN.test(handle) && r.followers !== "" && followers <= MAX_FOLLOWERS && linkOk;
      return { ...r, handle, error: !valid };
    });
    setRows(checked);
    if (checked.some((r) => r.error)) return setStatus("incomplete");

    startTransition(async () => {
      const res = await saveAccounts(checked.map((r) => ({
        id: r.id, platform: r.platform, handle: r.handle, followers: Number(r.followers),
        ...(needsLink(r.platform) && { link: r.link.trim() }),
      })));
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
            link: needsLink(r.platform) ? linkProfileUrl(r.platform, r.link) ?? r.link : "",
            connection: r.connection,
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
    setRows([...rows, { key, id: null, platform, handle: "", followers: "", verificationStatus: "none", link: "" }]);
    setOpenKey(key);
    setPicker(false);
    setStatus("");
  };
  const Chevron = ChevronDown;

  return (
    <Panel
      title={t("accounts")} flush
      aside={<span className="flex items-baseline gap-2" title={t("totalHint")}>{t("totalTitle")} <b dir="ltr" className="font-numbers text-[17px] text-navy">{formatNumber(total, lang)}</b></span>}
    >
      {(connectedNow || connectError) && (
        <p role="status" className={`mx-5 mt-3 rounded-[10px] px-3 py-2 text-sm ${connectedNow ? "bg-good/10 text-good" : "bg-bad/10 text-bad"}`}>
          {connectedNow ? t("connect.done", { platform: PLATFORM_NAMES[connectedNow as Platform] ?? connectedNow }) : t(`connect.errors.${["denied", "taken", "no_channel", "expired", "gone", "unavailable"].includes(connectError!) ? connectError : "failed"}`)}
        </p>
      )}
      <p className="px-5 pt-3 text-xs text-muted">{t("orderHint")}</p>
      <section className="flex flex-col">
        {rows.length === 0 && <p className="px-5 py-3 text-sm text-muted">{t("noAccounts")}</p>}
        <ul className="flex flex-col divide-y divide-line-soft">
          {rows.map((row, i) => {
            const name = PLATFORM_NAMES[row.platform];
            const verifiedish = row.verificationStatus === "verified" || row.verificationStatus === "in_review";
            const open = openKey === row.key || row.error;
            const statusTone = row.verificationStatus === "verified" ? "good" : row.verificationStatus === "in_review" ? "blue" : "grey";
            const linked = row.connection?.status === "active";
            const canLink = connectable.includes(row.platform);
            return (
              <li key={row.key}>
                <div className={`flex flex-col ${open ? "bg-bg/60" : ""}`}>
                  <button type="button" aria-expanded={!!open} onClick={() => setOpenKey(open ? null : row.key)} className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-start transition-colors hover:bg-hover/60">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line-soft bg-card"><PlatformIcon platform={row.platform} size={18} /></span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-bold">{name}</span>
                      <span dir="ltr" className="truncate text-xs text-muted rtl:text-end">{row.handle ? `@${normalizeHandle(row.handle)}` : "—"}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span dir="ltr" className="font-numbers text-base">{formatNumber(Number(row.followers) || 0, lang)}</span>
                      {row.connection ? (
                        <Pill tone={linked ? "good" : "warn"}>{linked ? t("connect.linked") : t("connect.stopped")}</Pill>
                      ) : (
                        <Pill tone={statusTone}>{t(`vstatus.${row.verificationStatus === "verified" || row.verificationStatus === "in_review" ? row.verificationStatus : "none"}`)}</Pill>
                      )}
                    </span>
                    <Chevron aria-hidden="true" size={18} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="flex flex-col gap-3 px-5 pt-1 pb-5">
                      {canLink && (
                        <div className={`flex flex-col gap-2 rounded-[12px] border p-3 ${linked ? "border-good/30 bg-good/5" : row.connection ? "border-warn/40 bg-warn/5" : "border-blue/25 bg-blue/5"}`}>
                          {linked ? (
                            <>
                              <p className="flex items-center gap-2 text-sm font-bold text-good"><Link2 aria-hidden="true" size={16} /> {t("connect.linkedTo", { name: row.connection!.name ?? `@${row.handle}` })}</p>
                              <p className="text-xs text-muted">{row.connection!.lastSyncAt ? t("connect.lastSync", { date: new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.connection!.lastSyncAt)) }) : t("connect.auto")}</p>
                              <button type="button" onClick={() => unlink(row)} disabled={unlinking === row.id} className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-bad hover:bg-bad/8 md:min-h-9">
                                <Unlink aria-hidden="true" size={15} /> {t("connect.unlink")}
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-bold">{row.connection ? t("connect.stoppedTitle", { platform: name }) : t("connect.title", { platform: name })}</p>
                              <p className="text-xs text-muted">{t(CONNECT_AUDIENCE.includes(row.platform) ? "connect.why" : "connect.whyFollowers")}</p>
                              {row.id ? (
                                <a href={`/api/connect/${row.platform}/start?account=${row.id}`} className={buttonClasses("primary", "w-fit gap-2")}>
                                  {row.connection ? <RefreshCw aria-hidden="true" size={16} /> : <Link2 aria-hidden="true" size={16} />} {row.connection ? t("connect.again") : t("connect.button", { platform: name })}
                                </a>
                              ) : (
                                <p className="text-xs font-semibold text-warn">{t("connect.saveFirst")}</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`handle-${row.key}`} className="text-[13px] font-medium">{t("handle")}</label>
                          <input
                            id={`handle-${row.key}`} dir="ltr" value={row.handle} placeholder="@username" autoComplete="off" spellCheck={false}
                            aria-invalid={row.error && !HANDLE_PATTERN.test(normalizeHandle(row.handle))}
                            onChange={(ev) => update(row.key, { handle: ev.target.value })}
                            onBlur={() => update(row.key, { handle: normalizeHandle(row.handle) })}
                            readOnly={linked} aria-describedby={linked ? `linked-${row.key}` : undefined}
                            className={`${control} read-only:bg-navy/[0.03] read-only:text-muted`}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`followers-${row.key}`} className="text-[13px] font-medium">{row.platform === "discord" ? t("members") : t("followers")}</label>
                          <input
                            id={`followers-${row.key}`} dir="ltr" inputMode="numeric" value={row.followers} placeholder="0" autoComplete="off"
                            aria-invalid={row.error && (row.followers === "" || Number(row.followers) > MAX_FOLLOWERS)}
                            onChange={(ev) => update(row.key, { followers: digitsOnly(ev.target.value, 10) })}
                            readOnly={linked} aria-describedby={linked ? `linked-${row.key}` : undefined}
                            className={`${control} read-only:bg-navy/[0.03] read-only:text-muted`}
                          />
                        </div>
                      </div>
                      {linked && <p id={`linked-${row.key}`} className="-mt-1 text-xs text-muted">{t("connect.locked")}</p>}
                      {needsLink(row.platform) && (
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`link-${row.key}`} className="text-[13px] font-medium">{t("profileLink")}</label>
                          <input
                            id={`link-${row.key}`} dir="ltr" type="url" inputMode="url" value={row.link} placeholder={LINK_PLACEHOLDERS[row.platform]} autoComplete="off" spellCheck={false}
                            aria-invalid={row.error && !linkProfileUrl(row.platform, row.link)}
                            aria-describedby={`link-hint-${row.key}`}
                            onChange={(ev) => update(row.key, { link: ev.target.value })}
                            className={control}
                          />
                          <p id={`link-hint-${row.key}`} className="text-xs text-muted">{t(`linkHint.${row.platform as "spotify" | "discord" | "jaco"}`)}</p>
                        </div>
                      )}
                      {row.error && <p className="text-sm text-bad">{needsLink(row.platform) && !linkProfileUrl(row.platform, row.link) ? t("linkError", { platform: name }) : t("rowError")}</p>}
                      {verifiedish && isChanged(row) && <p className="text-sm text-warn">{t("verificationWarning")}</p>}
                      {row.id && (
                        <a href="#audience" className="flex min-h-11 items-center gap-3 rounded-[10px] border border-line bg-card px-3 text-[13px] font-semibold shadow-card hover:bg-hover">
                          <Users aria-hidden="true" size={18} /> <span className="flex-1">{t("audienceRow")}</span>
                        </a>
                      )}
                      {row.id && row.verificationStatus === "none" && (
                        <Link href="/dashboard/verification" className="inline-flex min-h-11 items-center gap-2 text-[13px] font-bold text-blue"><BadgeCheck aria-hidden="true" size={16} /> {t("verifyWithScreenshot")}</Link>
                      )}
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={e("moveUp", { item: name })} className={iconButton}><ArrowUp aria-hidden="true" size={16} /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={e("moveDown", { item: name })} className={iconButton}><ArrowDown aria-hidden="true" size={16} /></button>
                        <button type="button" onClick={() => { setRows(rows.filter((r) => r.key !== row.key)); setStatus(""); }} className="ms-auto inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-bad hover:bg-bad/8 md:min-h-9">
                          <Trash2 aria-hidden="true" size={16} /> {t("removeAccount")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {rows.length < MAX_ACCOUNTS && (
          <button type="button" onClick={() => setPicker(!picker)} aria-expanded={picker} className="mx-5 mt-2 mb-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-navy/20 text-sm font-semibold text-blue hover:bg-blue/5">
            <Plus aria-hidden="true" size={18} /> {t("addAccount")}
          </button>
        )}
        {picker && (
          <div className="mx-5 mb-4 flex flex-col gap-2 rounded-xl border border-line bg-bg p-3">
            <span className="text-[13px] text-muted">{t("pickPlatform")}</span>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => addPlatform(p)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-card px-2 text-[13px] font-medium shadow-card hover:bg-hover">
                  <PlatformIcon platform={p} size={16} /> {PLATFORM_NAMES[p]}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3">
        <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
          {status === "saved" ? (resetNote ? t("savedReset") : e("saved")) : status === "failed" ? e("errors.failed") : status === "incomplete" ? e("fixErrors") : ""}
        </p>
        <button type="button" onClick={save} disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
          {pending ? e("saving") : e("save")}
        </button>
      </div>
    </Panel>
  );
}
