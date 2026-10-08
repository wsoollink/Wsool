"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TRIAL_EXTENSIONS } from "@/config/admin";
import { extendTrial, setPagePublished, setSuspended } from "../actions";

type Props = {
  userId: string;
  can: { trial: boolean; suspend: boolean; edit: boolean };
  paid: boolean;
  suspended: boolean;
  published: boolean | null;
  self: boolean;
};

/** Staff actions on one user; each one is written to the audit log on the server. */
export function UserActions({ userId, can, paid, suspended, published, self }: Props) {
  const t = useTranslations("Admin.users");
  const router = useRouter();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? { ok: true, text: t("done") } : { ok: false, text: t(`errors.${res.error ?? "failed"}`) });
      if (res.ok) {
        setNote("");
        router.refresh();
      }
    });

  if (!can.trial && !can.suspend && !can.edit) return null;
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-bold">{t("actions")}</h2>

      {can.trial && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("extendTrial")}</p>
          {paid ? (
            <p className="text-sm text-muted">{t("errors.has_paid_plan")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {TRIAL_EXTENSIONS.map((d) => (
                <button key={d} type="button" disabled={pending} onClick={() => run(() => extendTrial(userId, d))} className={buttonClasses("secondary")}>
                  {t("plusDays", { days: d })}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {can.edit && published !== null && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-sm font-medium">{t("pageVisibility")}</p>
          <button type="button" disabled={pending} onClick={() => run(() => setPagePublished(userId, !published))} className={buttonClasses("secondary", "self-start")}>
            {published ? t("hidePage") : t("publishPage")}
          </button>
        </div>
      )}

      {can.suspend && !self && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <label htmlFor="suspend-note" className="text-sm font-medium">{suspended ? t("unsuspendNote") : t("suspendNote")}</label>
          <textarea id="suspend-note" value={note} maxLength={300} onChange={(ev) => setNote(ev.target.value)} className="min-h-20 rounded-xl border border-line bg-card px-3 py-2 text-base" />
          <button
            type="button" disabled={pending || (!suspended && !note.trim())}
            onClick={() => run(() => setSuspended(userId, !suspended, note))}
            className={buttonClasses("secondary", `self-start ${suspended ? "" : "text-bad"}`)}
          >
            {suspended ? t("unsuspend") : t("suspend")}
          </button>
        </div>
      )}

      {message && <p role="status" className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>}
    </Card>
  );
}
