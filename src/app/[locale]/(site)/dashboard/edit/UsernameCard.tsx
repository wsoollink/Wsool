"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { normalizeUsername, usernameFormatError, USERNAME_MAX } from "@/config/usernames";
import { notifySaved } from "@/lib/saved-event";
import { checkUsername, type AvailabilityResult } from "../../onboarding/actions";
import { changeUsername } from "./actions";

/**
 * The creator's link (wsool.link/<username>) and the form to change it:
 * live availability check, a warning about the 30-day redirect, then confirm.
 */
export function UsernameCard({ username, nextChange }: {
  username: string;
  /** Formatted date when the next change is allowed, or null when it is allowed now. */
  nextChange: string | null;
}) {
  const t = useTranslations("UsernameCard");
  const o = useTranslations("Onboarding");
  const router = useRouter();
  const [current, setCurrent] = useState(username);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<AvailabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [, startCheck] = useTransition();
  const [pending, startSave] = useTransition();

  const name = normalizeUsername(value);
  const formatError = name ? usernameFormatError(name) : null;
  const same = name === current;

  // Debounced server check (format errors show instantly).
  useEffect(() => {
    if (!editing || !name || formatError || same) return;
    const timer = setTimeout(() => startCheck(async () => setChecked(await checkUsername(name))), 400);
    return () => clearTimeout(timer);
  }, [editing, name, formatError, same]);

  const status: "idle" | "checking" | "available" | { error: string } =
    !name ? "idle"
    : same ? { error: "same" }
    : formatError ? { error: formatError }
    : checked?.name !== name ? "checking"
    : checked.error ? { error: checked.error }
    : "available";
  const errorText = (key: string) => (key === "same" ? t("same") : o(`errors.${key}`));

  const save = () =>
    startSave(async () => {
      const res = await changeUsername(name);
      if (!res.ok || !res.username) {
        setError(res.error === "cooldown" ? t("cooldownNow") : errorText(res.error ?? "failed"));
        return;
      }
      setCurrent(res.username);
      setEditing(false);
      setValue("");
      setError(null);
      setDone(true);
      notifySaved();
      router.refresh();
    });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue/10 text-blue"><Link2 aria-hidden="true" size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">{t("title")}</h2>
          <p dir="ltr" className="truncate text-start font-medium text-blue rtl:text-end">wsool.link/{current}</p>
        </div>
      </div>

      {done && <p role="status" className="text-sm text-good">{t("changed")}</p>}

      {!editing ? (
        nextChange ? (
          <p className="text-sm text-muted">{t("cooldown", { date: nextChange })}</p>
        ) : (
          <button type="button" onClick={() => { setEditing(true); setDone(false); }} className={buttonClasses("secondary", "self-start")}>
            {t("change")}
          </button>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-username" className="text-[13px] font-medium">{t("newLabel")}</label>
            <div dir="ltr" className="flex h-12 items-center rounded-xl border border-navy/16 bg-white ps-3 focus-within:outline-2 focus-within:outline-blue">
              <span aria-hidden="true" className="text-muted">wsool.link/</span>
              <input
                id="new-username" dir="ltr" autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false}
                maxLength={USERNAME_MAX + 5} value={value}
                onChange={(e) => { setValue(e.target.value.toLowerCase()); setError(null); }}
                aria-invalid={typeof status === "object"} aria-describedby="new-username-rules new-username-status"
                className="h-full w-full min-w-0 rounded-e-xl bg-transparent pe-3 text-[15px] outline-none"
              />
            </div>
            <p id="new-username-rules" className="text-xs text-muted">{o("rules")}</p>
            <p id="new-username-status" aria-live="polite" className={`min-h-5 text-sm ${typeof status === "object" ? "text-bad" : "text-good"}`}>
              {status === "checking" && <span className="text-muted">{o("checking")}</span>}
              {status === "available" && o("available")}
              {typeof status === "object" && errorText(status.error)}
            </p>
          </div>
          <div className="rounded-xl bg-warn/10 px-4 py-3 text-[13px] leading-6 text-navy">
            <p className="font-bold">{t("warnTitle")}</p>
            <ul className="list-disc ps-5">
              <li>{t("warnRedirect", { old: current })}</li>
              <li>{t("warnUpdate")}</li>
              <li>{t("warnCooldown")}</li>
            </ul>
          </div>
          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={status !== "available" || pending} aria-busy={pending} className={buttonClasses("primary")}>
              {pending ? t("saving") : t("confirm")}
            </button>
            <button type="button" onClick={() => { setEditing(false); setValue(""); setError(null); }} className={buttonClasses("secondary")}>
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
