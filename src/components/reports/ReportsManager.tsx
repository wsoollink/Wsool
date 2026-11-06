"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, Eye, Link2Off, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Platform } from "@/generated/prisma/enums";
import { PLATFORM_NAMES } from "@/config/platforms";
import { parseReportPost } from "@/lib/ad-report-links";

export type ReportAccount = { id: string; platform: Platform; label: string };
export type ReportPostView = {
  id: string; platform: Platform; url: string; title: string | null; thumbUrl: string | null; views: number | null; likes: number | null;
  syncError: string | null; lastSync: string | null; handle: string;
};
export type ReportView = {
  id: string; brand: string; created: string; views: number; revoked: boolean; link: string | null;
  totals: { views?: number; likes?: number; comments?: number; shares?: number }; posts: ReportPostView[];
};
type Res = { ok?: true; id?: string; error?: string; errors?: { url: string; error: string }[]; token?: string };
export type ReportActions = {
  create: (input: unknown) => Promise<Res>;
  add: (reportId: string, items: unknown) => Promise<Res>;
  remove: (postId: string) => Promise<Res>;
  refresh: (postId: string) => Promise<Res>;
  renew: (reportId: string) => Promise<Res>;
  revoke: (reportId: string) => Promise<Res>;
  del: (reportId: string) => Promise<Res>;
};

const input = "h-11 w-full min-w-0 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] outline-none shadow-card focus:border-blue focus:ring-3 focus:ring-blue/15";
type Row = { accountId: string; url: string };

/** Post rows: account + link; the account follows the pasted link's platform when there's only one such account. */
function PostRows({ rows, setRows, accounts }: { rows: Row[]; setRows: (r: Row[]) => void; accounts: ReportAccount[] }) {
  const t = useTranslations("AdReports");
  const set = (i: number, patch: Partial<Row>) => {
    const next = rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
    // Pasting a link picks its platform's account when the creator has just one there.
    if (patch.url !== undefined) {
      const p = parseReportPost(patch.url);
      const same = p ? accounts.filter((a) => a.platform === p.platform) : [];
      if (same.length === 1) next[i].accountId = same[0].id;
    }
    setRows(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-line p-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-center sm:border-0 sm:p-0">
          <select value={r.accountId} onChange={(e) => set(i, { accountId: e.target.value })} aria-label={t("account")} className={input}>
            <option value="">{t("pickAccount")}</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{PLATFORM_NAMES[a.platform]} · {a.label}</option>)}
          </select>
          <input value={r.url} onChange={(e) => set(i, { url: e.target.value })} dir="ltr" inputMode="url" placeholder="https://" aria-label={t("postLink")} className={input} />
          <button type="button" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [{ accountId: "", url: "" }])} aria-label={t("removeRow")}
            className="inline-flex size-11 items-center justify-center justify-self-end rounded-full text-muted hover:bg-navy/5"><X aria-hidden="true" size={18} /></button>
        </div>
      ))}
      {rows.length < 20 && (
        <button type="button" onClick={() => setRows([...rows, { accountId: "", url: "" }])} className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-bold text-blue">
          <Plus aria-hidden="true" size={16} /> {t("addRow")}
        </button>
      )}
    </div>
  );
}

const fmt = (n: number | undefined | null, lang: string) => (typeof n === "number" ? new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en", { notation: n >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n) : "–");

/**
 * Ad reports (creator dashboard and agency tab): a new report from linked accounts' post links, then each report with its
 * private link (copy, open, new link, stop), totals and posts (update now, remove), adding more posts, deleting.
 */
export function ReportsManager({ reports, accounts, actions, defaultLang, accountsHref }: { reports: ReportView[]; accounts: ReportAccount[]; actions: ReportActions; defaultLang: "ar" | "en"; accountsHref?: string }) {
  const t = useTranslations("AdReports");
  const lang = useLocale().slice(0, 2);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [brand, setBrand] = useState("");
  const [reportLang, setReportLang] = useState(defaultLang);
  const [rows, setRows] = useState<Row[]>([{ accountId: "", url: "" }]);
  const [adding, setAdding] = useState<string | null>(null);
  const [addRows, setAddRows] = useState<Row[]>([{ accountId: "", url: "" }]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; list?: { url: string; error: string }[] } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const ready = (list: Row[]) => list.filter((r) => r.url.trim() && r.accountId);
  const report = (res: Res, okText: string) => {
    if (res.error) setMsg({ ok: false, text: t(`errors.${res.error}`), list: res.errors });
    else setMsg({ ok: !res.errors?.length, text: res.errors?.length ? t("partly") : okText, list: res.errors });
    router.refresh();
  };
  const create = () => {
    if (!brand.trim()) return setMsg({ ok: false, text: t("errors.brand") });
    if (!ready(rows).length) return setMsg({ ok: false, text: t("errors.rows") });
    start(async () => {
      const res = await actions.create({ brand, lang: reportLang, items: ready(rows) });
      report(res, t("created"));
      if (res.ok) { setBrand(""); setRows([{ accountId: "", url: "" }]); }
    });
  };
  const add = (id: string) => {
    if (!ready(addRows).length) return setMsg({ ok: false, text: t("errors.rows") });
    start(async () => {
      const res = await actions.add(id, ready(addRows));
      report(res, t("added"));
      if (res.ok) { setAdding(null); setAddRows([{ accountId: "", url: "" }]); }
    });
  };
  const run = (fn: () => Promise<Res>, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    start(async () => { const res = await fn(); if (res.error) setMsg({ ok: false, text: t(`errors.${res.error}`) }); router.refresh(); });
  };
  const copy = (r: ReportView) => {
    if (!r.link) return;
    navigator.clipboard?.writeText(r.link).then(() => { setCopied(r.id); setTimeout(() => setCopied(null), 2000); }).catch(() => {});
  };
  const errorList = msg?.list?.length ? (
    <ul className="mt-1 flex flex-col gap-1 text-xs font-normal">
      {msg.list.map((e, i) => <li key={i}><bdi dir="ltr" className="break-all">{e.url}</bdi>: {t(`postErrors.${e.error}`)}</li>)}
    </ul>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-4 md:p-5">
        <div>
          <h2 className="text-lg font-black">{t("newTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("newHint")}</p>
          <a href="/r/demo" target="_blank" rel="noopener" className="mt-1 inline-flex min-h-9 items-center text-sm font-bold text-blue">{t("seeDemo")}</a>
        </div>
        {accounts.length === 0 ? (
          <div className="rounded-xl bg-blue/5 p-4 text-sm">
            <p className="font-bold">{t("noAccounts")}</p>
            {accountsHref && <a href={accountsHref} className="mt-2 inline-flex min-h-11 items-center font-bold text-blue">{t("linkAccounts")}</a>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="flex flex-col gap-1.5 text-sm font-bold">{t("brand")}
                <input value={brand} maxLength={80} onChange={(e) => setBrand(e.target.value)} placeholder={t("brandPlaceholder")} className={input} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-bold">{t("lang")}
                <select value={reportLang} onChange={(e) => setReportLang(e.target.value as "ar" | "en")} className={input}>
                  <option value="ar">العربية</option><option value="en">English</option>
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold">{t("posts")}</span>
              <PostRows rows={rows} setRows={setRows} accounts={accounts} />
              <p className="text-xs text-muted">{t("postsHint")}</p>
            </div>
            <button type="button" disabled={pending} onClick={create} className={buttonClasses("primary", "w-fit")}>{pending ? t("reading") : t("create")}</button>
          </>
        )}
        {msg && <div role={msg.ok ? "status" : "alert"} className={`text-sm font-bold ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}{errorList}</div>}
      </Card>

      {reports.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">{t("empty")}</p>
      ) : reports.map((r) => (
        <Card key={r.id} className="flex flex-col gap-4 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-black">{r.brand}</h3>
              <p className="text-xs text-muted">{t("createdOn", { date: r.created })} · {t("postsCount", { n: r.posts.length })}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy/5 px-3 py-1 text-xs font-bold text-muted"><Eye aria-hidden="true" size={14} /> {r.revoked ? t("linkStopped") : t("opened", { n: r.views })}</span>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["views", "likes", "comments", "shares"] as const).map((k) => (
              <div key={k} className="rounded-xl bg-navy/[0.03] p-3">
                <dt className="text-xs text-muted">{t(`m.${k}`)}</dt>
                <dd className="font-numbers text-xl font-black">{fmt(r.totals[k], lang)}</dd>
              </div>
            ))}
          </dl>

          <ul className="flex flex-col divide-y divide-line-soft">
            {r.posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-navy/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.thumbUrl && <img src={p.thumbUrl} alt="" className="size-full object-cover" loading="lazy" />}
                  <span className="absolute bottom-0.5 end-0.5 rounded bg-card p-0.5"><PlatformIcon platform={p.platform} size={12} /></span>
                </span>
                <div className="min-w-0 flex-1">
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-bold hover:text-blue" dir="auto">{p.title || `@${p.handle}`}</a>
                  <p className="text-xs text-muted">
                    {t("m.views")}: <span className="font-numbers">{fmt(p.views, lang)}</span> · {t("m.likes")}: <span className="font-numbers">{fmt(p.likes, lang)}</span>
                    {p.syncError && <span className="ms-1 font-bold text-warn">· {t(`postErrors.${p.syncError}`)}</span>}
                  </p>
                </div>
                <button type="button" disabled={pending} onClick={() => run(() => actions.refresh(p.id))} aria-label={t("refresh")} title={t("refresh")} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-navy/5"><RefreshCw aria-hidden="true" size={16} /></button>
                <button type="button" disabled={pending} onClick={() => run(() => actions.remove(p.id), t("confirmRemove"))} aria-label={t("removePost")} title={t("removePost")} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-bad/5 hover:text-bad"><Trash2 aria-hidden="true" size={16} /></button>
              </li>
            ))}
          </ul>

          {adding === r.id ? (
            <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <PostRows rows={addRows} setRows={setAddRows} accounts={accounts} />
              <div className="flex gap-2">
                <button type="button" disabled={pending} onClick={() => add(r.id)} className={buttonClasses("primary")}>{pending ? t("reading") : t("addPosts")}</button>
                <button type="button" onClick={() => setAdding(null)} className={buttonClasses("secondary")}>{t("cancel")}</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {r.link ? (
                <>
                  <button type="button" onClick={() => copy(r)} className={buttonClasses("primary", "gap-2")}>{copied === r.id ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />} {copied === r.id ? t("copied") : t("copyLink")}</button>
                  <a href={r.link} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "gap-2")}><ExternalLink aria-hidden="true" size={16} /> {t("open")}</a>
                </>
              ) : null}
              {r.posts.length < 20 && accounts.length > 0 && <button type="button" onClick={() => { setAdding(r.id); setAddRows([{ accountId: "", url: "" }]); }} className={buttonClasses("secondary", "gap-2")}><Plus aria-hidden="true" size={16} /> {t("addPosts")}</button>}
              <button type="button" disabled={pending} onClick={() => run(() => actions.renew(r.id), r.link ? t("confirmRenew") : undefined)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-muted hover:bg-navy/5"><RotateCcw aria-hidden="true" size={15} /> {r.link ? t("renew") : t("newLink")}</button>
              {r.link && <button type="button" disabled={pending} onClick={() => run(() => actions.revoke(r.id), t("confirmRevoke"))} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-muted hover:bg-navy/5"><Link2Off aria-hidden="true" size={15} /> {t("revoke")}</button>}
              <button type="button" disabled={pending} onClick={() => run(() => actions.del(r.id), t("confirmDelete"))} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-bad hover:bg-bad/5"><Trash2 aria-hidden="true" size={15} /> {t("delete")}</button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
