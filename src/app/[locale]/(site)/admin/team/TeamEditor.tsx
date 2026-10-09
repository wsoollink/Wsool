"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Crown, Trash2, UserPlus } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { PERMISSION_GROUPS, ROLE_PRESETS, type Permission } from "@/config/admin";
import { inviteMember, removeMember, updateMember } from "./actions";

type Role = keyof typeof ROLE_PRESETS;
export type Member = { id: string; email: string; role: Role; permissions: Permission[]; active: boolean; linked: boolean };

const ROLES = Object.keys(ROLE_PRESETS) as Role[];
const control = "h-12 w-full rounded-xl border border-navy/16 bg-white px-3 text-[15px]";

/** Permission switches grouped as in the design (verification, users, money). */
function PermissionSwitches({ id, value, onChange, readOnly }: { id: string; value: Permission[]; onChange?: (p: Permission[]) => void; readOnly?: boolean }) {
  const t = useTranslations("Admin.team");
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
        <fieldset key={group} className="flex flex-col">
          <legend className="mb-1 text-[13px] font-bold text-muted">{t(`groups.${group}`)}</legend>
          {perms.map((p) =>
            readOnly ? (
              <p key={p} className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium">
                {t(`perm.${p}`)} <Check aria-hidden="true" size={18} className="text-good" />
              </p>
            ) : (
              <Switch
                key={p} id={`${id}-${p}`} label={t(`perm.${p}`)} checked={value.includes(p)}
                onChange={(on) => onChange?.(on ? [...value, p] : value.filter((x) => x !== p))}
              />
            ),
          )}
        </fieldset>
      ))}
    </div>
  );
}

function RoleSelect({ id, value, onChange }: { id: string; value: Role; onChange: (r: Role) => void }) {
  const t = useTranslations("Admin.team");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">{t("role")}</label>
      <select id={id} value={value} onChange={(ev) => onChange(ev.target.value as Role)} className={control}>
        {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
      </select>
      <p className="text-xs text-muted">{t("roleHint")}</p>
    </div>
  );
}

const Avatar = ({ email, owner }: { email: string; owner?: boolean }) => (
  <span aria-hidden="true" className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase ${owner ? "bg-warn/15 text-warn" : "bg-navy/5"}`}>
    {owner ? <Crown size={18} /> : email[0]}
  </span>
);

type Selected = { kind: "owner"; email: string } | { kind: "member"; id: string } | { kind: "invite" };

/** Owner view (design): team list on one side, the selected person's role and permissions on the other. */
export function TeamEditor({ owners, members }: { owners: string[]; members: Member[] }) {
  const t = useTranslations("Admin.team");
  const [selected, setSelected] = useState<Selected>(members[0] ? { kind: "member", id: members[0].id } : { kind: "invite" });
  const current = selected.kind === "member" ? members.find((m) => m.id === selected.id) : undefined;
  const isSel = (s: Selected) => JSON.stringify(s) === JSON.stringify(selected);
  const row = (active: boolean) => `flex min-h-[60px] w-full items-center gap-3 rounded-[14px] px-3 py-2 text-start ${active ? "bg-navy/[0.06] ring-1 ring-navy/10" : "hover:bg-navy/[0.03]"}`;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="flex flex-col gap-1 p-2">
        <button type="button" onClick={() => setSelected({ kind: "invite" })} className={buttonClasses("primary", "m-1 mb-2")}>
          <UserPlus aria-hidden="true" size={18} /> {t("inviteTitle")}
        </button>
        <p className="px-3 pb-1 text-xs text-muted">{t("members", { n: members.length + owners.length })}</p>
        <ul className="flex flex-col gap-1">
          {owners.map((o) => (
            <li key={o}>
              <button type="button" aria-pressed={isSel({ kind: "owner", email: o })} onClick={() => setSelected({ kind: "owner", email: o })} className={row(isSel({ kind: "owner", email: o }))}>
                <Avatar email={o} owner />
                <span className="flex min-w-0 flex-col">
                  <span dir="ltr" className="truncate text-sm font-bold rtl:text-end">{o}</span>
                  <span className="text-xs text-warn">{t("owner")}</span>
                </span>
              </button>
            </li>
          ))}
          {members.map((m) => (
            <li key={m.id}>
              <button type="button" aria-pressed={isSel({ kind: "member", id: m.id })} onClick={() => setSelected({ kind: "member", id: m.id })} className={row(isSel({ kind: "member", id: m.id }))}>
                <Avatar email={m.email} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span dir="ltr" className="truncate text-sm font-bold rtl:text-end">{m.email}</span>
                  <span className="text-xs text-muted">{t(`roles.${m.role}`)}</span>
                </span>
                {!m.active ? <span className="rounded-full bg-bad/8 px-2 py-0.5 text-[11px] font-bold text-bad">{t("inactive")}</span>
                  : !m.linked && <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] text-muted">{t("notSignedInYet")}</span>}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {selected.kind === "invite" && <InviteCard onDone={() => setSelected({ kind: "invite" })} />}
      {selected.kind === "owner" && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar email={selected.email} owner />
            <div className="flex min-w-0 flex-col">
              <h2 dir="ltr" className="truncate font-bold rtl:text-end">{selected.email}</h2>
              <span className="text-xs text-muted">{t("ownerNote")}</span>
            </div>
          </div>
          <PermissionSwitches id="owner" value={[]} readOnly />
          <p className="flex items-center gap-2 rounded-xl bg-navy/5 p-3 text-[13px] text-muted"><Crown aria-hidden="true" size={16} /> {t("ownerOnly")}</p>
        </Card>
      )}
      {current && <MemberCard key={current.id} member={current} onRemoved={() => setSelected({ kind: "invite" })} />}
    </div>
  );
}

function InviteCard({ onDone }: { onDone: () => void }) {
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
        onDone();
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <form onSubmit={invite} className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold">{t("inviteTitle")}</h2>
          <p className="text-xs text-muted">{t("inviteHint")}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-email" className="text-[13px] font-medium">{t("email")}</label>
          <input id="invite-email" type="email" dir="ltr" value={email} onChange={(ev) => setEmail(ev.target.value)} required placeholder="name@example.com" className={control} />
        </div>
        <RoleSelect id="invite-role" value={role} onChange={(r) => { setRole(r); setPerms(ROLE_PRESETS[r]); }} />
        <PermissionSwitches id="invite" value={perms} onChange={setPerms} />
        <button type="submit" disabled={pending || !email.trim()} className={buttonClasses("primary", "self-start")}>
          <UserPlus aria-hidden="true" size={18} /> {t("invite")}
        </button>
        {message && <p role="status" className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>}
      </form>
    </Card>
  );
}

function MemberCard({ member, onRemoved }: { member: Member; onRemoved: () => void }) {
  const t = useTranslations("Admin.team");
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [perms, setPerms] = useState(member.permissions);
  const [active, setActive] = useState(member.active);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      setMessage(res.ok ? { ok: true, text: t("saved") } : { ok: false, text: t(`errors.${res.error ?? "failed"}`) });
      if (res.ok) {
        after?.();
        router.refresh();
      }
    });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar email={member.email} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 dir="ltr" className="truncate font-bold rtl:text-end">{member.email}</h2>
          <span className="text-xs text-muted">{member.linked ? t(`roles.${member.role}`) : t("notSignedInYet")}</span>
        </div>
      </div>
      <RoleSelect id={`role-${member.id}`} value={role} onChange={(r) => { setRole(r); setPerms(ROLE_PRESETS[r]); }} />
      <PermissionSwitches id={member.id} value={perms} onChange={setPerms} />
      <div className="border-t border-navy/6 pt-2">
        <Switch id={`active-${member.id}`} label={t("active")} hint={t("activeHint")} checked={active} onChange={setActive} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => updateMember(member.id, role, perms, active))} className={buttonClasses("primary")}>{t("save")}</button>
        <button
          type="button" disabled={pending}
          onClick={() => { if (window.confirm(t("confirmRemove", { email: member.email }))) run(() => removeMember(member.id), onRemoved); }}
          className={buttonClasses("secondary", "ms-auto text-bad")}
        >
          <Trash2 aria-hidden="true" size={16} /> {t("remove")}
        </button>
      </div>
      {message && <p role="status" className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>}
    </Card>
  );
}
