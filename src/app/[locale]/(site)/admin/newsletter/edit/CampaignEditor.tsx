"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RotateCw, Send, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CampaignStatus } from "@/generated/prisma/enums";
import type { CampaignInput } from "@/lib/newsletter-campaign";
import { deleteDraft, previewCampaign, retryFailed, saveCampaign, sendBatches, sendTest, startSending } from "../actions";
import { statusTone } from "../status";

type Fields = Required<CampaignInput>;
type Lang = "ar" | "en";
type Props = {
  id: string;
  status: CampaignStatus;
  initial: Fields;
  audience: { confirmed: number; ar: number; en: number };
  progress: { sent: number; failed: number; remaining: number };
  sentOn: string | null;
  adminEmail: string;
};

const input = "h-12 w-full rounded-xl border border-navy/16 bg-white px-3 text-[15px] disabled:bg-navy/[0.03]";

/**
 * Newsletter editor (admin): both language versions, optional button, live
 * preview of the real email, a test to yourself, then sending in batches with
 * a progress bar. A started issue is read-only; an interrupted send resumes.
 */
export function CampaignEditor({ id, status, initial, audience, progress, sentOn, adminEmail }: Props) {
  const t = useTranslations("Admin.newsletter");
  const router = useRouter();
  const [f, setF] = useState<Fields>(initial);
  const [tab, setTab] = useState<Lang>(initial.bodyAr || !initial.bodyEn ? "ar" : "en");
  const [previewLang, setPreviewLang] = useState<Lang>(tab);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [run, setRun] = useState<{ done: number; total: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = status === "draft";
  const set = (patch: Partial<Fields>) => { setF({ ...f, ...patch }); setMessage(null); };
  const fail = (code?: string) => setMessage({ ok: false, text: t(`errors.${code ?? "failed"}`) });

  // Live preview, a moment after typing stops.
  const latest = useRef(0);
  useEffect(() => {
    const call = ++latest.current;
    const timer = setTimeout(async () => {
      const res = await previewCampaign(f, previewLang);
      if (call === latest.current) setPreview(res?.html ?? null);
    }, 500);
    return () => clearTimeout(timer);
  }, [f, previewLang]);

  const save = async () => {
    const res = await saveCampaign(id, f);
    if (!res.ok) fail(res.error);
    return !!res.ok;
  };

  /** Calls the server until every confirmed subscriber has been reached. */
  const sendLoop = async (alreadyDone: number, total: number) => {
    let done = alreadyDone;
    setRun({ done, total });
    for (;;) {
      const res = await sendBatches(id);
      if (res.error) { fail(res.error); break; }
      done += res.sent + res.failed;
      setRun({ done, total: done + res.remaining });
      if (res.done) { setMessage({ ok: true, text: t("doneMsg") }); break; }
    }
    setRun(null);
    router.refresh();
  };

  const onSave = () => startTransition(async () => { if (await save()) setMessage({ ok: true, text: t("saved") }); });
  const onTest = () =>
    startTransition(async () => {
      if (!(await save())) return;
      const res = await sendTest(id);
      if (res.ok) setMessage({ ok: true, text: t("testSent", { email: adminEmail }) });
      else fail(res.error);
    });
  const onSend = () =>
    startTransition(async () => {
      if (!window.confirm(t("confirmSend", { n: audience.confirmed }))) return;
      if (!(await save())) return;
      const res = await startSending(id);
      if (!res.ok) return fail(res.error);
      await sendLoop(0, audience.confirmed);
    });
  const onResume = () => startTransition(() => sendLoop(progress.sent + progress.failed, progress.sent + progress.failed + progress.remaining));
  const onRetry = () =>
    startTransition(async () => {
      const res = await retryFailed(id);
      if (!res.ok) return fail(res.error);
      await sendLoop(progress.sent, progress.sent + progress.failed);
    });

  const field = (key: keyof Fields, label: string, opts: { area?: boolean; lang?: Lang; max: number; hint?: string }) => {
    const fid = `nl-${key}`;
    const common = {
      id: fid, value: f[key], maxLength: opts.max, disabled: !editable,
      dir: opts.lang ? (opts.lang === "ar" ? "rtl" : "ltr") : "ltr", lang: opts.lang,
      onChange: (e: { target: { value: string } }) => set({ [key]: e.target.value } as Partial<Fields>),
      "aria-describedby": opts.hint ? `${fid}-hint` : undefined,
    };
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fid} className="text-[13px] font-medium">{label}</label>
        {opts.area ? <textarea {...common} rows={12} className={`${input} h-auto min-h-56 py-3 leading-7`} /> : <input {...common} className={input} />}
        {opts.hint && <p id={`${fid}-hint`} className="text-xs text-muted">{opts.hint}</p>}
      </div>
    );
  };

  const L = tab === "ar" ? "Ar" : "En";
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="tablist" aria-label={t("subject")} className="inline-flex rounded-full bg-navy/5 p-1">
              {(["ar", "en"] as const).map((l) => (
                <button
                  key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => { setTab(l); setPreviewLang(l); }}
                  className={`min-h-10 rounded-full px-4 text-[13.5px] font-bold ${tab === l ? "bg-white shadow-sm" : "text-muted"}`}
                >
                  {t(l === "ar" ? "arabic" : "english")}
                </button>
              ))}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[status]}`}>{t(`status.${status}`)}</span>
          </div>
          {field(`subject${L}` as keyof Fields, t("subject"), { lang: tab, max: 150 })}
          {field(`body${L}` as keyof Fields, t("body"), { area: true, lang: tab, max: 20000, hint: t("bodyHint") })}
          <p className="text-xs text-muted">{t("langNote")}</p>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-bold">{t("cta")}</h2>
          {field(`ctaLabel${L}` as keyof Fields, `${t("ctaLabel")} (${t(tab === "ar" ? "arabic" : "english")})`, { lang: tab, max: 40 })}
          {field("ctaUrl", t("ctaUrl"), { max: 500, hint: t("ctaHint") })}
        </Card>

        <Card className="flex flex-col gap-3">
          {status === "draft" && (
            <>
              <p className="text-sm text-muted">{t("audience", { n: audience.confirmed, ar: audience.ar, en: audience.en })}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onSend} disabled={pending || audience.confirmed === 0} className={buttonClasses("primary", "gap-2")}>
                  <Send aria-hidden="true" size={16} /> {t("sendAll", { n: audience.confirmed })}
                </button>
                <button type="button" onClick={onTest} disabled={pending} className={buttonClasses("secondary")}>{t("sendTest")}</button>
                <button type="button" onClick={onSave} disabled={pending} className={buttonClasses("secondary")}>{pending && !run ? t("saving") : t("save")}</button>
                <button
                  type="button" disabled={pending}
                  onClick={() => {
                    if (!window.confirm(t("confirmDelete"))) return;
                    startTransition(async () => {
                      const res = await deleteDraft(id);
                      if (res.ok) router.push("/admin/newsletter");
                      else fail(res.error);
                    });
                  }}
                  className={buttonClasses("secondary", "ms-auto gap-2 text-bad")}
                >
                  <Trash2 aria-hidden="true" size={16} /> {t("deleteDraft")}
                </button>
              </div>
            </>
          )}

          {run && (
            <div className="flex flex-col gap-2" role="status" aria-live="polite">
              <p className="text-sm font-bold">{t("progress", { done: run.done, total: run.total })}</p>
              <div className="h-2 overflow-hidden rounded-full bg-navy/5">
                <div className="h-full rounded-full bg-blue transition-[width]" style={{ width: `${run.total ? Math.round((run.done / run.total) * 100) : 0}%` }} />
              </div>
              <p className="text-xs text-muted">{t("keepOpen")}</p>
            </div>
          )}

          {!run && status !== "draft" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                <b>{t("sentTo", { n: progress.sent })}</b>
                {progress.failed > 0 && <span className="text-bad"> · {t("failedN", { n: progress.failed })}</span>}
                {sentOn && <span className="text-muted"> · {t("sentOn", { date: sentOn })}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {status === "sending" && progress.remaining > 0 && (
                  <button type="button" onClick={onResume} disabled={pending} className={buttonClasses("primary", "gap-2")}><Send aria-hidden="true" size={16} /> {t("resume")}</button>
                )}
                {progress.failed > 0 && (
                  <button type="button" onClick={onRetry} disabled={pending} className={buttonClasses("secondary", "gap-2")}><RotateCw aria-hidden="true" size={16} /> {t("retry", { n: progress.failed })}</button>
                )}
              </div>
            </div>
          )}
          {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>}
        </Card>
      </div>

      <Card className="flex flex-col gap-3 xl:sticky xl:top-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">{t("preview")}</h2>
          <div className="inline-flex rounded-full bg-navy/5 p-1" role="group" aria-label={t("preview")}>
            {(["ar", "en"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={previewLang === l} onClick={() => setPreviewLang(l)} className={`min-h-9 rounded-full px-3 text-xs font-bold ${previewLang === l ? "bg-white shadow-sm" : "text-muted"}`}>
                {t(l === "ar" ? "arabic" : "english")}
              </button>
            ))}
          </div>
        </div>
        {preview ? (
          <iframe title={t("preview")} srcDoc={preview} sandbox="" className="h-[640px] w-full rounded-xl border border-navy/8 bg-[#F4F6FA]" />
        ) : (
          <p className="rounded-xl bg-navy/[0.03] p-6 text-center text-sm text-muted">{t("previewEmpty")}</p>
        )}
      </Card>
    </div>
  );
}
