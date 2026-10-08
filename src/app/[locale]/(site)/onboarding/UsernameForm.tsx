"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/SubmitButton";
import { normalizeUsername, usernameFormatError, USERNAME_MAX } from "@/config/usernames";
import { checkUsername, claimUsername, type AvailabilityResult, type ClaimState } from "./actions";

type Status = "idle" | "checking" | "available" | { error: string };

export function UsernameForm() {
  const t = useTranslations("Onboarding");
  const [state, action] = useActionState<ClaimState, FormData>(claimUsername, {});
  const [value, setValue] = useState(state.name ?? "");
  const [checked, setChecked] = useState<AvailabilityResult | null>(null);
  const [, startCheck] = useTransition();

  const name = normalizeUsername(value);
  const formatError = name ? usernameFormatError(name) : null;

  // Debounced server check for availability (format errors are shown instantly).
  useEffect(() => {
    if (!name || formatError) return;
    const timer = setTimeout(() => startCheck(async () => setChecked(await checkUsername(name))), 400);
    return () => clearTimeout(timer);
  }, [name, formatError]);

  let shown: Status;
  if (state.error && state.name === name) shown = { error: state.error };
  else if (!name) shown = "idle";
  else if (formatError) shown = { error: formatError };
  else if (checked?.name !== name) shown = "checking";
  else shown = checked.error ? { error: checked.error } : "available";
  const errorKey = typeof shown === "object" ? shown.error : null;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-medium">{t("label")}</label>
        <div
          dir="ltr"
          className="flex min-h-11 items-center rounded-xl border border-line bg-card ps-4 focus-within:outline-2 focus-within:outline-blue"
        >
          <span className="text-muted" aria-hidden="true">wsool.link/</span>
          <input
            id="username" name="username" type="text" dir="ltr" required
            autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={USERNAME_MAX + 5}
            value={value} onChange={(e) => setValue(e.target.value.toLowerCase())}
            aria-invalid={errorKey !== null} aria-describedby="username-hint username-status"
            className="min-h-11 w-full min-w-0 rounded-e-xl bg-transparent pe-4 text-base text-navy outline-none"
          />
        </div>
        <p id="username-hint" className="text-xs text-muted">{t("rules")}</p>
        <p id="username-status" aria-live="polite" className={`min-h-5 text-sm ${errorKey ? "text-bad" : "text-good"}`}>
          {shown === "checking" && <span className="text-muted">{t("checking")}</span>}
          {shown === "available" && t("available")}
          {errorKey && t(`errors.${errorKey}`)}
        </p>
      </div>
      <SubmitButton className="w-full" pendingText={t("saving")}>{t("submit")}</SubmitButton>
    </form>
  );
}
