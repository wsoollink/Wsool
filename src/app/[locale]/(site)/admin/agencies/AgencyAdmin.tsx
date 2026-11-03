"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { createAgency, declineRequest, openFromRequest, stopAgency } from "./actions";

const field = "h-11 w-full min-w-0 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] outline-none shadow-card focus:border-blue focus:ring-3 focus:ring-blue/15";

export function CreateAgency() {
  const t = useTranslations("Admin.agencies");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"agency" | "brand">("agency");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createAgency(name, email, kind);
          if (r.ok) { setMsg({ ok: true, text: t("created") }); setName(""); setEmail(""); router.refresh(); }
          else setMsg({ ok: false, text: t(`errors.${r.error ?? "invalid"}`) });
        });
      }}
      className="flex flex-col gap-3"
    >
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1.5 text-[13px] font-medium">{t("kind")}</legend>
        {(["agency", "brand"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold ${kind === k ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted ring-1 ring-line"}`}>
            {t(`kinds.${k}`)}
          </button>
        ))}
      </fieldset>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">{t("name")}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium">{t("ownerEmail")}
          <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required className={`${field} rtl:text-end`} />
        </label>
      </div>
      <p className="text-xs text-muted">{t("hint")}</p>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "self-start")}><Plus aria-hidden="true" size={16} /> {t("create")}</button>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
    </form>
  );
}

export function StopAgency({ id, name }: { id: string; name: string }) {
  const t = useTranslations("Admin.agencies");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button" disabled={pending}
      onClick={() => { if (window.confirm(t("confirmStop", { name }))) start(async () => { await stopAgency(id); router.refresh(); }); }}
      className="inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5"
    >
      {t("stop")}
    </button>
  );
}

/** Open the account from a request (as an agency or a brand) or close the request. */
export function RequestActions({ id, agency }: { id: string; agency: string }) {
  const t = useTranslations("Admin.agencies");
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const open = (kind: "agency" | "brand") => start(async () => {
    setError("");
    const r = await openFromRequest(id, kind);
    if (r.ok) router.refresh(); else setError(t(`errors.${r.error ?? "invalid"}`));
  });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" disabled={pending} onClick={() => open("agency")} className={buttonClasses("primary")}>{t("openAgency")}</button>
      <button type="button" disabled={pending} onClick={() => open("brand")} className={buttonClasses("secondary")}>{t("openBrand")}</button>
      <button
        type="button" disabled={pending}
        onClick={() => { if (window.confirm(t("confirmDecline", { name: agency }))) start(async () => { await declineRequest(id); router.refresh(); }); }}
        className="inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5"
      >
        {t("decline")}
      </button>
      {error && <p role="alert" className="w-full text-sm text-bad">{error}</p>}
    </div>
  );
}
