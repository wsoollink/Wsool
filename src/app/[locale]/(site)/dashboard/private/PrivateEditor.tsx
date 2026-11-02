"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, KeyRound, Link2, Plus, Share2, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { Pill } from "@/components/ui/Pill";
import { LINK_DAYS, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validation/private-view";
import { addPrivateLink, removePrivateLink, savePagePassword } from "./actions";

type LinkRow = { id: string; name: string; url: string | null; views: number; lastViewedAt: string | null; expiresAt: string | null; expired: boolean };

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("PrivatePage");
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          if (navigator.share && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ url: text });
          else { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }
        } catch { /* cancelled */ }
      }}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-bold hover:bg-hover"
      aria-label={`${label}: ${text}`}
    >
      {done ? <Check aria-hidden="true" size={14} className="text-good" /> : <><Copy aria-hidden="true" size={14} className="pointer-coarse:hidden" /><Share2 aria-hidden="true" size={14} className="pointer-fine:hidden" /></>}
      {done ? t("copied") : t("copy")}
    </button>
  );
}

/** Page password + private links per company (owner, Nov 2026). */
export function PrivateEditor({ isPro, hasPassword, links }: { isPro: boolean; hasPassword: boolean; links: LinkRow[] }) {
  const t = useTranslations("PrivatePage");
  const locale = useLocale();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState("");
  const [days, setDays] = useState<(typeof LINK_DAYS)[number]>(0);
  const [made, setMade] = useState<{ name: string; url: string } | null>(null);
  const [linkErr, setLinkErr] = useState("");
  const [pending, start] = useTransition();
  const date = new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar-u-nu-latn" : "en", { dateStyle: "medium" });

  const savePw = (value: string | null) => {
    setPwMsg(null);
    if (value === null && !window.confirm(t("removeConfirm"))) return;
    start(async () => {
      const r = await savePagePassword(value);
      if (r.ok) { setPassword(""); setPwMsg({ ok: true, text: value === null ? t("passwordRemoved") : t("passwordSaved") }); router.refresh(); }
      else setPwMsg({ ok: false, text: t(`errors.${r.error ?? "invalid"}`) });
    });
  };

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkErr("");
    start(async () => {
      const r = await addPrivateLink({ name, days });
      if (r.ok && r.url) { setMade({ name, url: r.url }); setName(""); router.refresh(); }
      else setLinkErr(t(`errors.${r.error ?? "invalid"}`));
    });
  };

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-bold"><KeyRound aria-hidden="true" size={18} className="text-blue" />{t("passwordTitle")}</h2>
          <Pill tone={hasPassword ? "good" : "grey"}>{hasPassword ? t("passwordOn") : t("passwordOff")}</Pill>
        </div>
        <p className="text-sm text-muted">{t("passwordHint")}</p>
        <form onSubmit={(e) => { e.preventDefault(); savePw(password); }} className="flex flex-col gap-3">
          <TextField
            id="page-pw" label={hasPassword ? t("newPassword") : t("password")} type="text" autoComplete="off" dir="ltr"
            value={password} onChange={(e) => setPassword(e.target.value)} minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX}
            hint={t("passwordRule", { min: PASSWORD_MIN })} disabled={!isPro}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || !isPro || password.trim().length < PASSWORD_MIN} className={buttonClasses("primary")}>
              {hasPassword ? t("change") : t("setPassword")}
            </button>
            {hasPassword && <button type="button" disabled={pending} onClick={() => savePw(null)} className={buttonClasses("secondary", "text-bad")}>{t("remove")}</button>}
          </div>
          {pwMsg && <p role="status" className={`text-sm ${pwMsg.ok ? "text-good" : "text-bad"}`}>{pwMsg.text}</p>}
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold"><Link2 aria-hidden="true" size={18} className="text-blue" />{t("linksTitle")}</h2>
          <p className="text-sm text-muted">{t("linksHint")}</p>
        </div>
        <form onSubmit={addLink} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <TextField id="link-name" label={t("linkName")} placeholder={t("linkNamePh")} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required disabled={!isPro} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="link-days" className="text-sm font-medium">{t("linkDays")}</label>
            <select id="link-days" value={days} onChange={(e) => setDays(Number(e.target.value) as typeof days)} disabled={!isPro}
              className="min-h-11 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] shadow-card">
              {LINK_DAYS.map((d) => <option key={d} value={d}>{d ? t("days", { n: d }) : t("noEnd")}</option>)}
            </select>
          </div>
          <button type="submit" disabled={pending || !isPro || !name.trim()} className={buttonClasses("primary")}><Plus aria-hidden="true" size={16} />{t("makeLink")}</button>
        </form>
        {linkErr && <p role="alert" className="text-sm text-bad">{linkErr}</p>}
        {made && (
          <div role="status" className="flex flex-col gap-2 rounded-[12px] border border-good/30 bg-good/5 p-3">
            <p className="text-sm font-semibold text-good">{t("made", { name: made.name })}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code dir="ltr" className="min-w-0 flex-1 truncate rounded-md bg-card px-2 py-1.5 text-[13px]">{made.url}</code>
              <CopyButton text={made.url} label={made.name} />
            </div>
          </div>
        )}

        {links.length === 0 ? (
          <p className="text-sm text-muted">{t("noLinks")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-soft border-t border-line-soft">
            {links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold"><bdi className="truncate">{l.name}</bdi>{l.expired && <Pill tone="warn">{t("expired")}</Pill>}</p>
                  <p className="text-xs text-muted">
                    {t("views", { n: l.views })}
                    {l.lastViewedAt && <> · {t("lastOpened", { date: date.format(new Date(l.lastViewedAt)) })}</>}
                    {l.expiresAt && !l.expired && <> · {t("endsOn", { date: date.format(new Date(l.expiresAt)) })}</>}
                  </p>
                </div>
                {l.url && !l.expired && <CopyButton text={l.url} label={l.name} />}
                <button
                  type="button" disabled={pending}
                  onClick={() => { if (window.confirm(t("revokeConfirm", { name: l.name }))) start(async () => { await removePrivateLink(l.id); router.refresh(); }); }}
                  className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5"
                >
                  <Trash2 aria-hidden="true" size={14} />{t("revoke")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
