"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Crown, Trash2, UserPlus } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PERMISSIONS, ROLE_PRESETS, type Permission } from "@/config/admin";
import { inviteMember, removeMember, updateMember } from "./actions";

type Role = keyof typeof ROLE_PRESETS;
export type Member = { id: string; email: string; role: Role; permissions: Permission[]; active: boolean; linked: boolean };

const ROLES = Object.keys(ROLE_PRESETS) as Role[];

function PermissionToggles({ id, value, onChange }: { id: string; value: Permission[]; onChange: (p: Permission[]) => void }) {
  const t = useTranslations("Admin.team");
  return (
    <fieldset className="flex min-w-0 flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{t("permissions")}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {PERMISSIONS.map((p) => (
          <label key={p} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox" id={`${id}-${p}`} className="size-5 accent-blue" checked={value.includes(p)}
              onChange={(ev) => onChange(ev.target.checked ? [...value, p] : value.filter((x) => x !== p))}
            />
            {t(`perm.${p}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RoleSelect({ id, value, onChange }: { id: string; value: Role; onChange: (r: Role) => void }) {
  const t = useTranslations("Admin.team");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{t("role")}</label>
      <select id={id} value={value} onChange={(ev) => onChange(ev.target.value as Role)} className="min-h-11 rounded-xl border border-line bg-card px-3 text-base">
        {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
      </select>
    </div>
  );
}

/** Owner view: the owner (fixed), invite form, and each member's role and permissions. */
export function TeamEditor({ owners, members }: { owners: string[]; members: Member[] }) {
  const t = useTranslations("Admin.team");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("verifier");
  const [perms, setPerms] = useState<Permission[]>(ROLE_PRESETS.verifier);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const invite = (ev: React.FormEvent) => {
    ev.preventDefault();
    startTransition(async () => {
      const res = await inviteMember(email, role, perms);
      setMessage(res.ok ? { ok: true, text: t("invited") } : { ok: false, text: t(`errors.${res.error ?? "failed"}`) });
      if (res.ok) {
        setEmail("");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        {owners.map((o) => (
          <p key={o} className="flex flex-wrap items-center gap-2 text-sm">
            <Crown aria-hidden="true" size={18} className="text-warn" />
            <span className="font-medium" dir="ltr">{o}</span>
            <span className="rounded-full bg-warn/10 px-2 py-0.5 text-xs font-semibold text-warn">{t("owner")}</span>
            <span className="text-xs text-muted">{t("ownerNote")}</span>
          </p>
        ))}
      </Card>

      <Card>
        <form onSubmit={invite} className="flex flex-col gap-3">
          <h2 className="font-bold">{t("inviteTitle")}</h2>
          <p className="text-xs text-muted">{t("inviteHint")}</p>
          <div className="flex flex-col gap-1">
            <label htmlFor="invite-email" className="text-sm font-medium">{t("email")}</label>
            <input id="invite-email" type="email" dir="ltr" value={email} onChange={(ev) => setEmail(ev.target.value)} required className="min-h-11 rounded-xl border border-line bg-card px-3 text-base" />
          </div>
          <RoleSelect id="invite-role" value={role} onChange={(r) => { setRole(r); setPerms(ROLE_PRESETS[r]); }} />
          <PermissionToggles id="invite" value={perms} onChange={setPerms} />
          <button type="submit" disabled={pending || !email.trim()} className={buttonClasses("primary", "self-start")}>
            <UserPlus aria-hidden="true" size={18} /> {t("invite")}
          </button>
          {message && <p role="status" className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>}
        </form>
      </Card>

      <h2 className="font-bold">{t("members", { n: members.length })}</h2>
      {members.length === 0 && <p className="text-sm text-muted">{t("noMembers")}</p>}
      {members.map((m) => <MemberCard key={m.id} member={m} />)}
    </div>
  );
}

function MemberCard({ member }: { member: Member }) {
  const t = useTranslations("Admin.team");
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [perms, setPerms] = useState(member.permissions);
  const [active, setActive] = useState(member.active);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? { ok: true, text: t("saved") } : { ok: false, text: t(`errors.${res.error ?? "failed"}`) });
      if (res.ok) router.refresh();
    });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium" dir="ltr">{member.email}</span>
        {!member.linked && <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs text-muted">{t("notSignedInYet")}</span>}
        {!member.active && <span className="rounded-full bg-bad/10 px-2 py-0.5 text-xs text-bad">{t("inactive")}</span>}
      </div>
      <RoleSelect id={`role-${member.id}`} value={role} onChange={(r) => { setRole(r); setPerms(ROLE_PRESETS[r]); }} />
      <PermissionToggles id={member.id} value={perms} onChange={setPerms} />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="size-5 accent-blue" checked={active} onChange={(ev) => setActive(ev.target.checked)} />
        {t("active")}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => updateMember(member.id, role, perms, active))} className={buttonClasses("primary")}>{t("save")}</button>
        <button
          type="button" disabled={pending}
          onClick={() => { if (window.confirm(t("confirmRemove", { email: member.email }))) run(() => removeMember(member.id)); }}
          className={buttonClasses("secondary", "ms-auto text-bad")}
        >
          <Trash2 aria-hidden="true" size={16} /> {t("remove")}
        </button>
      </div>
      {message && <p role="status" className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>}
    </Card>
  );
}
