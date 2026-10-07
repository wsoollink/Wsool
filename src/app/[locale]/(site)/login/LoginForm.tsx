"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { requestCode, verifyCode, type LoginState } from "./actions";

const inputClasses =
  "min-h-11 w-full rounded-xl border border-line bg-card px-4 text-base text-navy placeholder:text-muted/70";

export function LoginForm() {
  const t = useTranslations("Login");
  const [sent, sendAction, sending] = useActionState<LoginState, FormData>(requestCode, { step: "email" });
  const [checked, verifyAction, verifying] = useActionState<LoginState, FormData>(verifyCode, { step: "code" });
  const [editingEmail, setEditingEmail] = useState(false);

  const onCodeStep = sent.step === "code" && !editingEmail;
  const error = onCodeStep ? checked.error : sent.error;

  if (!onCodeStep) {
    return (
      <form action={(fd) => { setEditingEmail(false); sendAction(fd); }} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">{t("emailLabel")}</label>
          <input
            id="email" name="email" type="email" autoComplete="email" inputMode="email" dir="ltr"
            required defaultValue={sent.email} placeholder="name@example.com"
            aria-invalid={error === "invalid_email"} aria-describedby={error ? "login-error" : undefined}
            className={inputClasses}
          />
        </div>
        {error && <p id="login-error" role="alert" className="text-sm text-bad">{t(`errors.${error}`)}</p>}
        <button type="submit" disabled={sending} className={buttonClasses("primary", "w-full")}>
          {sending ? t("sending") : t("sendCode")}
        </button>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted">
        {t("codeSent")} <span dir="ltr" className="font-medium text-navy">{sent.email}</span>
      </p>
      <input type="hidden" name="email" value={sent.email} />
      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="text-sm font-medium">{t("codeLabel")}</label>
        <input
          id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr"
          required maxLength={10} pattern="[0-9]*" autoFocus
          aria-invalid={error === "invalid_code"} aria-describedby={error ? "login-error" : undefined}
          className={`${inputClasses} text-center font-numbers tracking-[0.3em]`}
        />
      </div>
      {error && <p id="login-error" role="alert" className="text-sm text-bad">{t(`errors.${error}`)}</p>}
      <button type="submit" disabled={verifying} className={buttonClasses("primary", "w-full")}>
        {verifying ? t("verifying") : t("verify")}
      </button>
      <button type="button" onClick={() => setEditingEmail(true)} className={buttonClasses("secondary", "w-full")}>
        {t("changeEmail")}
      </button>
    </form>
  );
}
