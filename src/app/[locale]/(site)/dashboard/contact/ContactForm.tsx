"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Mail, ShieldCheck } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { SaveBar } from "@/components/dashboard/SaveBar";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { formatPhone } from "@/lib/format";
import { COUNTRY_CODES, normalizeWhatsapp, WHATSAPP_PATTERN } from "@/lib/validation/contact";
import { saveContact } from "./actions";

type Initial = { whatsapp: string; email: string; whatsappVisible: boolean; emailVisible: boolean };

/** Splits stored international digits into a known country code + the rest. */
function split(digits: string) {
  const cc = COUNTRY_CODES.find((c) => digits.startsWith(c.code));
  return cc ? { code: cc.code, local: digits.slice(cc.code.length) } : { code: "966", local: digits };
}

const input = "h-12 w-full min-w-0 rounded-xl border border-navy/16 bg-white px-3 text-[15px] aria-[invalid=true]:border-bad";
const soft = "inline-flex h-10 items-center gap-2 rounded-xl bg-navy/5 px-3 text-[13px] font-medium";

/** WhatsApp + email cards from the dashboard design: show/hide switch, value, monthly taps, test link. */
export function ContactForm({ initial, accountEmail, taps }: { initial: Initial; accountEmail: string; taps: { whatsapp: number; email: number } }) {
  const t = useTranslations("ContactPage");
  const start = split(initial.whatsapp);
  const [code, setCode] = useState(start.code);
  const [local, setLocal] = useState(start.local);
  const [email, setEmail] = useState(initial.email);
  const [waOn, setWaOn] = useState(initial.whatsappVisible);
  const [emOn, setEmOn] = useState(initial.emailVisible);
  const [errors, setErrors] = useState<{ whatsapp?: boolean; email?: boolean }>({});
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();
  const dirty = () => setStatus("");

  // "05..." typed with +966 selected is a local Saudi number.
  const number = local.trim() ? normalizeWhatsapp(code === "966" ? local : `+${code}${local}`) : "";
  const numberOk = WHATSAPP_PATTERN.test(number);

  const save = () =>
    startTransition(async () => {
      const res = await saveContact({ whatsapp: number ? `+${number}` : "", email, whatsappVisible: waOn, emailVisible: emOn });
      if (res.errors) {
        setErrors(res.errors);
        return setStatus("failed");
      }
      setErrors({});
      const s = split(res.whatsapp ?? "");
      setCode(s.code);
      setLocal(s.local);
      setEmail(res.email ?? "");
      setStatus("saved");
    });

  const state = (on: boolean, has: boolean) => (!has ? t("stateEmpty") : on ? t("stateShown") : t("stateHidden"));

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-0">
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/5"><PlatformIcon platform="whatsapp" size={20} /></span>
          <div className="flex flex-1 flex-col">
            <h2 className="font-bold">{t("whatsapp")}</h2>
            <span className="text-xs text-muted">{state(waOn, numberOk)}</span>
          </div>
          <Switch labelHidden label={t("showWhatsapp")} checked={waOn} onChange={(v) => { setWaOn(v); dirty(); }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wa-num" className="text-[13px] font-medium">{t("whatsappNumber")}</label>
          <div dir="ltr" className="flex gap-2">
            <label htmlFor="wa-cc" className="sr-only">{t("countryCode")}</label>
            <select id="wa-cc" value={code} onChange={(e) => { setCode(e.target.value); dirty(); }} className="h-12 w-[112px] shrink-0 rounded-xl border border-navy/16 bg-white px-2 text-[15px]">
              {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.flag} +{c.code}</option>)}
            </select>
            <input
              id="wa-num" type="tel" inputMode="numeric" autoComplete="tel-national" value={local} maxLength={20} placeholder="5X XXX XXXX"
              aria-invalid={!!errors.whatsapp} aria-describedby="wa-hint"
              onChange={(e) => { setLocal(e.target.value); dirty(); setErrors({ ...errors, whatsapp: false }); }}
              className={`${input} flex-1`}
            />
          </div>
          <p id="wa-hint" className={`text-xs ${errors.whatsapp ? "text-bad" : "text-muted"}`}>
            {errors.whatsapp ? t("whatsappInvalid") : numberOk ? t.rich("shownAs", { n: () => <bdi dir="ltr" className="font-bold text-navy">{formatPhone(number)}</bdi> }) : t("whatsappEmptyHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy/6 pt-3">
          <span className="text-[13px] text-muted">{t("tapsThisMonth")} <b dir="ltr" className="font-numbers text-base text-navy">{taps.whatsapp}</b></span>
          {numberOk && (
            <a href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer" className={soft}>
              <ExternalLink aria-hidden="true" size={16} /> {t("tryLink")} <span className="sr-only">{t("opensNewTab")}</span>
            </a>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy/5"><Mail aria-hidden="true" size={20} /></span>
          <div className="flex flex-1 flex-col">
            <h2 className="font-bold">{t("email")}</h2>
            <span className="text-xs text-muted">{state(emOn, !!email.trim())}</span>
          </div>
          <Switch labelHidden label={t("showEmail")} checked={emOn} onChange={(v) => { setEmOn(v); dirty(); }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className="text-[13px] font-medium">{t("email")}</label>
          <input
            id="contact-email" dir="ltr" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} maxLength={254}
            aria-invalid={!!errors.email} aria-describedby="em-hint"
            onChange={(e) => { setEmail(e.target.value); dirty(); setErrors({ ...errors, email: false }); }}
            className={input}
          />
          <p id="em-hint" className={`text-xs ${errors.email ? "text-bad" : "text-muted"}`}>{errors.email ? t("emailInvalid") : t("emailHint")}</p>
          {accountEmail && email.trim().toLowerCase() !== accountEmail.toLowerCase() && (
            <button type="button" onClick={() => { setEmail(accountEmail); dirty(); }} className="flex min-h-11 flex-wrap items-center gap-x-2 self-start text-start text-sm font-medium text-blue">
              {t("useAccountEmail")} <span dir="ltr" className="break-all">{accountEmail}</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy/6 pt-3">
          <span className="text-[13px] text-muted">{t("tapsThisMonth")} <b dir="ltr" className="font-numbers text-base text-navy">{taps.email}</b></span>
          {email.includes("@") && (
            <a href={`mailto:${email.trim()}`} className={soft}><ExternalLink aria-hidden="true" size={16} /> {t("tryLink")}</a>
          )}
        </div>
      </Card>

      {(!numberOk || !waOn) && (!email.trim() || !emOn) && <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">{t("noneWarning")}</p>}

      <div className="flex items-start gap-3 rounded-[14px] bg-navy/5 p-3">
        <ShieldCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-muted" />
        <p className="text-[12.5px] text-muted">{t("privacyNote")}</p>
      </div>

      <SaveBar
        onSave={save} pending={pending}
        status={status === "saved" ? { tone: "good", text: "" } : status === "failed" ? { tone: "bad", text: t("fixErrors") } : null}
      />
    </div>
  );
}
