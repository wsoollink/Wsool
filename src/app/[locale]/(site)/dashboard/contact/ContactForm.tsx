"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, Mail } from "lucide-react";
import { PlatformIcon } from "@/components/creator/PlatformIcon";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { normalizeWhatsapp, WHATSAPP_PATTERN } from "@/lib/validation/contact";
import { saveContact } from "./actions";

/** WhatsApp + email shown as buttons on the public page. Empty fields are hidden there. */
export function ContactForm({ initial, accountEmail }: { initial: { whatsapp: string; email: string }; accountEmail: string }) {
  const t = useTranslations("ContactPage");
  const e = useTranslations("EditPage");
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ? `+${initial.whatsapp}` : "");
  const [email, setEmail] = useState(initial.email);
  const [errors, setErrors] = useState<{ whatsapp?: boolean; email?: boolean }>({});
  const [status, setStatus] = useState<"" | "saved" | "failed">("");
  const [pending, startTransition] = useTransition();

  const number = normalizeWhatsapp(whatsapp);
  const numberOk = WHATSAPP_PATTERN.test(number);

  const save = (ev: React.FormEvent) => {
    ev.preventDefault();
    startTransition(async () => {
      const res = await saveContact({ whatsapp, email });
      if (res.errors) {
        setErrors(res.errors);
        return setStatus("failed");
      }
      setErrors({});
      setWhatsapp(res.whatsapp ? `+${res.whatsapp}` : "");
      setEmail(res.email ?? "");
      setStatus("saved");
    });
  };

  return (
    <Card>
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        <p className="text-sm text-muted">{t("intro")}</p>

        <div className="flex flex-col gap-2">
          <TextField
            id="whatsapp" label={t("whatsapp")} hint={t.rich("whatsappHint", { num: (chunks) => <bdi dir="ltr">{chunks}</bdi> })} error={errors.whatsapp ? t("whatsappInvalid") : undefined}
            dir="ltr" type="tel" inputMode="tel" autoComplete="tel" placeholder="+966 50 123 4567" value={whatsapp} maxLength={40}
            onChange={(ev) => { setWhatsapp(ev.target.value); setStatus(""); setErrors({ ...errors, whatsapp: false }); }}
          />
          {numberOk && (
            <a href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-blue underline">
              <PlatformIcon platform="whatsapp" size={16} /> <span dir="ltr">wa.me/{number}</span>
              <ExternalLink aria-hidden="true" size={14} /> <span className="sr-only">{t("opensNewTab")}</span>
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <TextField
            id="contact-email" label={t("email")} hint={t("emailHint")} error={errors.email ? t("emailInvalid") : undefined}
            dir="ltr" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} maxLength={254}
            onChange={(ev) => { setEmail(ev.target.value); setStatus(""); setErrors({ ...errors, email: false }); }}
          />
          {accountEmail && email.trim().toLowerCase() !== accountEmail.toLowerCase() && (
            <button type="button" onClick={() => { setEmail(accountEmail); setStatus(""); }} className="flex min-h-11 flex-wrap items-center gap-x-2 self-start text-start text-sm font-medium text-blue underline">
              <Mail aria-hidden="true" size={16} /> {t("useAccountEmail")} <span dir="ltr" className="break-all">{accountEmail}</span>
            </button>
          )}
        </div>

        {!whatsapp.trim() && !email.trim() && <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">{t("noneWarning")}</p>}

        <div className="flex items-center justify-between gap-3">
          <p role="status" aria-live="polite" className={`text-sm ${status === "saved" ? "text-good" : "text-bad"}`}>
            {status === "saved" ? e("saved") : status === "failed" ? e("fixErrors") : ""}
          </p>
          <button type="submit" disabled={pending} aria-busy={pending} className={buttonClasses("primary")}>
            {pending ? e("saving") : e("save")}
          </button>
        </div>
      </form>
    </Card>
  );
}
