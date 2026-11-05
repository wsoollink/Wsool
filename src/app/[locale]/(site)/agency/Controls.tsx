"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Send, Settings2, UserPlus, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { cancelInvite, inviteCreatorAction, inviteMember, manageCreator, removeCreator, removeMember, setAgencyNewsletter } from "./actions";

const field = "h-11 w-full min-w-0 rounded-[10px] border border-navy/15 bg-card px-3 text-[15px] outline-none shadow-card focus:border-blue focus:ring-3 focus:ring-blue/15";

/** "Manage": switches the dashboard into acting mode for this creator. */
export function ManageButton({ linkId }: { linkId: string }) {
  const t = useTranslations("AgencyApp");
  const [pending, start] = useTransition();
  return (
    <button
      type="button" disabled={pending}
      onClick={() => start(async () => { const r = await manageCreator(linkId); if (r.url) window.location.href = r.url; })}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-navy px-4 text-[13px] font-bold text-on-navy disabled:opacity-60"
    >
      <Settings2 aria-hidden="true" size={15} /> {t("manage")}
    </button>
  );
}

/** Confirm + call a server action, then refresh the page (remove creator, cancel invite, remove member). */
export function ConfirmAction({ kind, id, confirm, label }: { kind: "removeCreator" | "cancelInvite" | "removeMember"; id: string; confirm?: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = { removeCreator, cancelInvite, removeMember }[kind];
  return (
    <button
      type="button" disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => { await run(id); router.refresh(); });
      }}
      className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-[13px] font-bold text-bad hover:bg-bad/5 disabled:opacity-60"
    >
      <X aria-hidden="true" size={14} /> {label}
    </button>
  );
}

/** Invite an existing creator with the permissions the agency asks for. */
export function InviteCreator() {
  const t = useTranslations("AgencyApp");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [perms, setPerms] = useState({ content: true, rates: true, contact: false });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await inviteCreatorAction(q, perms);
      if (r.ok) { setMsg({ ok: true, text: t("sent") }); setQ(""); router.refresh(); }
      else setMsg({ ok: false, text: t(`errors.${r.error ?? "invalid"}`) });
    });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("inviteHint")}</p>
      <label className="sr-only" htmlFor="invite-q">{t("invitePh")}</label>
      <input id="invite-q" value={q} onChange={(e) => setQ(e.target.value)} dir="ltr" placeholder={t("invitePh")} className={`${field} rtl:text-end`} maxLength={254} required />
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1.5 text-[13px] font-medium">{t("askPerms")}</legend>
        {(["content", "rates", "contact"] as const).map((k) => (
          <button
            key={k} type="button" aria-pressed={perms[k]} onClick={() => setPerms({ ...perms, [k]: !perms[k] })}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-bold ${perms[k] ? "bg-blue/10 text-blue ring-1 ring-blue/30" : "bg-card text-muted ring-1 ring-line"}`}
          >
            {t(`perm.${k}`)}
          </button>
        ))}
      </fieldset>
      <button type="submit" disabled={pending || q.trim().length < 3} className={buttonClasses("primary", "self-start")}>
        <Send aria-hidden="true" size={15} /> {pending ? t("sending") : t("send")}
      </button>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.text}</p>}
    </form>
  );
}

/** Team: add a member by email with a role. */
export function AddMember() {
  const t = useTranslations("AgencyApp");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "editor" | "viewer">("editor");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await inviteMember(email, role);
      if (r.ok) { setEmail(""); router.refresh(); } else setError(t(`errors.${r.error ?? "invalid"}`));
    });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="sr-only" htmlFor="member-email">{t("emailPh")}</label>
        <input id="member-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPh")} className={`${field} rtl:text-end`} required />
        <label className="sr-only" htmlFor="member-role">{t("roles.editor")}</label>
        <select id="member-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={field}>
          {(["manager", "editor", "viewer"] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)} · {t(`roleHelp.${r}`)}</option>)}
        </select>
      </div>
      <button type="submit" disabled={pending} className={buttonClasses("secondary", "self-start")}>
        <UserPlus aria-hidden="true" size={15} /> {t("addMember")}
      </button>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </form>
  );
}

/** "Invite" on a directory result: asks for content + rates (the creator decides what to allow when accepting). */
export function InviteFromDirectory({ username }: { username: string }) {
  const t = useTranslations("Directory");
  const ta = useTranslations("AgencyApp");
  const [result, setResult] = useState<{ sent: boolean; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const sent = result?.sent;
  return (
    <div className="flex flex-1 flex-col gap-1">
      <button
        type="button" disabled={pending || sent}
        onClick={() => start(async () => {
          const r = await inviteCreatorAction(username, { content: true, rates: true, contact: false });
          setResult(r.ok || r.error === "already" ? { sent: true } : { sent: false, error: ta(`errors.${r.error ?? "invalid"}`) });
        })}
        className={buttonClasses(sent ? "secondary" : "primary", "w-full")}
      >
        {sent ? t("invited") : t("invite")}
      </button>
      {result?.error && <p role="alert" className="text-xs text-bad">{result.error}</p>}
    </div>
  );
}

/** The signed-in member's own switch for the agencies newsletter (saved on tap). */
export function AgencyNewsletter({ initial }: { initial: boolean }) {
  const t = useTranslations("AgencyApp.newsletter");
  const locale = useLocale();
  const [on, setOn] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [, start] = useTransition();
  return (
    <Card className="flex flex-col gap-1">
      <h2 className="mb-1 font-bold">{t("title")}</h2>
      <Switch
        checked={on} label={t("label")} hint={t("hint")}
        onChange={(v) => { setOn(v); setSaved(false); start(async () => { await setAgencyNewsletter(v, locale.startsWith("en") ? "en" : "ar"); setSaved(true); }); }}
      />
      <p role="status" className="text-sm text-good">{saved ? t("saved") : ""}</p>
    </Card>
  );
}
