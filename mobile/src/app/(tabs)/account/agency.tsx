import { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { Building2 } from "lucide-react-native";
import { SectionScreen, SwitchRow, useSection } from "../../../components/editor";
import { Button, Card, Panel, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { haptic } from "../../../lib/haptics";
import { useTheme } from "../../../lib/theme";

type Perms = { content: boolean; rates: boolean; contact: boolean };
type Data = {
  graceDays: number;
  invites: { id: string; agency: string; requested: Perms }[];
  active: { agency: string; since: string | null; perms: Perms; showOnPage: boolean; pageUrl: string | null } | null;
  activity: { id: string; who: string | null; section: string; at: string }[];
};
type Result = { ok?: boolean; error?: string };
const KEYS = ["content", "rates", "contact"] as const;

/** The three permission switches (an invite's choice, or the linked agency's live permissions). */
function PermSwitches({ value, onChange }: { value: Perms; onChange: (p: Perms) => void }) {
  const { t } = useI18n();
  return (
    <View>
      {KEYS.map((k) => (
        <SwitchRow key={k} label={t(`agency.perm.${k}`)} hint={t(`agency.permHelp.${k}`)} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />
      ))}
    </View>
  );
}

/** One invite: pick what the agency may edit, then accept or decline. */
function Invite({ invite, onDone }: { invite: Data["invites"][number]; onDone: () => Promise<void> }) {
  const { t } = useI18n();
  const [perms, setPerms] = useState(invite.requested);
  const [busy, setBusy] = useState<"" | "accept" | "decline">("");
  const [error, setError] = useState(false);
  const run = async (kind: "accept" | "decline") => {
    setBusy(kind); setError(false);
    try {
      const r = await rpc<Result>(kind === "accept" ? "acceptAgency" : "declineAgency", ...(kind === "accept" ? [invite.id, perms] : [invite.id]));
      if (r.ok) { haptic("success"); await onDone(); } else { setError(true); haptic("error"); }
    } catch { setError(true); haptic("error"); }
    finally { setBusy(""); }
  };
  return (
    <Card>
      <T weight="bold" size={16}>{t("agency.inviteTitle", { agency: invite.agency })}</T>
      <T size={13.5} tone="muted">{t("agency.inviteBody", { agency: invite.agency })}</T>
      <T size={13} weight="bold">{t("agency.perms")}</T>
      <PermSwitches value={perms} onChange={setPerms} />
      <T size={12.5} tone="muted">{t("agency.proNote")}</T>
      {error ? <T size={13.5} tone="bad">{t("agency.error")}</T> : null}
      <Row>
        <Button title={busy === "accept" ? t("agency.accepting") : t("agency.accept")} loading={busy === "accept"} disabled={!!busy} onPress={() => run("accept")} style={{ flex: 1 }} />
        <Button title={t("agency.decline")} variant="secondary" disabled={!!busy} onPress={() => run("decline")} />
      </Row>
    </Card>
  );
}

/** The creator's side of agencies (same as the website's Agency section): invites, permissions, listing, recent changes, unlinking. */
export default function AgencyScreen() {
  const { t, date } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("agency");
  const [perms, setPerms] = useState<Perms | null>(null);
  const [onPage, setOnPage] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPerms(data?.active?.perms ?? null); setOnPage(data?.active?.showOnPage ?? null); }, [data]);

  const savePerms = async (next: Perms) => {
    const before = perms;
    setPerms(next); setMsg(null); haptic("tap");
    try {
      const r = await rpc<Result>("updateAgencyPerms", next);
      if (r.ok) setMsg({ ok: true, text: t("agency.saved") }); else { setPerms(before); setMsg({ ok: false, text: t("agency.error") }); }
    } catch { setPerms(before); setMsg({ ok: false, text: t("agency.error") }); }
  };
  const saveOnPage = async (v: boolean) => {
    setOnPage(v); haptic("tap");
    try { const r = await rpc<Result>("setAgencyPageVisibility", v); if (!r.ok) setOnPage(!v); } catch { setOnPage(!v); }
  };
  const unlink = (agency: string) =>
    Alert.alert(t("agency.unlink"), t("agency.confirmUnlink", { agency }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("agency.unlink"), style: "destructive", onPress: async () => {
          setBusy(true);
          try { const r = await rpc<Result>("unlinkAgency"); if (r.ok) { haptic("success"); await reload(); } else setMsg({ ok: false, text: t("agency.error") }); }
          catch { setMsg({ ok: false, text: t("agency.error") }); }
          finally { setBusy(false); }
        },
      },
    ]);

  const sectionName = (s: string) => {
    const key = `agency.section.${s}`;
    const v = t(key);
    return v === key ? s : v;
  };

  return (
    <SectionScreen parent="account" title={t("section.agency")} subtitle={t("agency.subtitle")} loading={!data && !error} error={error} onRetry={reload}>
      {data && !data.active && data.invites.length === 0 ? (
        <Card>
          <Row style={{ alignItems: "flex-start" }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.lineSoft, alignItems: "center", justifyContent: "center" }}>
              <Building2 size={20} color={colors.muted} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <T weight="bold">{t("agency.emptyTitle")}</T>
              <T size={13.5} tone="muted">{t("agency.emptyBody")}</T>
            </View>
          </Row>
        </Card>
      ) : null}

      {data?.invites.map((inv) => <Invite key={inv.id} invite={inv} onDone={reload} />)}

      {data?.active && perms ? (
        <>
          <Card>
            <T weight="bold" size={16}>{t("agency.activeTitle", { agency: data.active.agency })}</T>
            {data.active.since ? <T size={12.5} tone="muted">{t("agency.since", { date: date(data.active.since, { dateStyle: "medium" }) })}</T> : null}
            <T size={13} weight="bold">{t("agency.perms")}</T>
            <PermSwitches value={perms} onChange={savePerms} />
            <SwitchRow label={t("agency.showOnPage")} hint={data.active.pageUrl ? t("agency.showOnPageHintLink", { link: data.active.pageUrl }) : t("agency.showOnPageHint")}
              value={onPage ?? data.active.showOnPage} onChange={saveOnPage} />
            <T size={12.5} tone="muted">{t("agency.never")}</T>
            {msg ? <T size={13.5} tone={msg.ok ? "good" : "bad"} accessibilityLiveRegion="polite">{msg.text}</T> : null}
          </Card>

          <Panel title={t("agency.activityTitle")}>
            {data.activity.length === 0 ? (
              <T size={13.5} tone="muted" style={{ padding: 16 }}>{t("agency.noActivity")}</T>
            ) : data.activity.map((a, i) => (
              <View key={a.id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.lineSoft, gap: 2 }}>
                <T size={14}>
                  <T size={14} weight="bold" style={{ writingDirection: "ltr" }}>{a.who ?? "—"}</T>{" "}{t("agency.edited", { section: sectionName(a.section) })}
                </T>
                <T size={12.5} tone="muted">{date(a.at, { dateStyle: "medium", timeStyle: "short" })}</T>
              </View>
            ))}
          </Panel>

          <Card>
            <T size={13.5} tone="muted">{t("agency.graceNote", { days: data.graceDays })}</T>
            <Button title={t("agency.unlink")} variant="danger" disabled={busy} loading={busy} onPress={() => unlink(data.active!.agency)} />
          </Card>
        </>
      ) : null}
    </SectionScreen>
  );
}
