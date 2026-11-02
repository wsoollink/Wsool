import { useState } from "react";
import { Alert, Share, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Copy, KeyRound, Link2, Share2, Trash2 } from "lucide-react-native";
import { ProNote, SectionScreen, useSection } from "../../../components/editor";
import { Button, Card, Field, Pill, Row, Segmented, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { useTheme } from "../../../lib/theme";

type LinkRow = { id: string; name: string; url: string | null; views: number; lastViewedAt: string | null; expiresAt: string | null; expired: boolean };
type Data = { isPro: boolean; hasPassword: boolean; lockWhole: boolean; privateSections: string[]; links: LinkRow[] };
type Result = { ok?: boolean; url?: string; error?: "invalid" | "pro_only" | "limit" };
const DAYS = [0, 7, 30, 90] as const;

/** Private view (owner, Nov 2026): page password + a private link per brand. Same server actions as the website. */
export default function PrivateView() {
  const { t, lang } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("private");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [days, setDays] = useState<(typeof DAYS)[number]>(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [made, setMade] = useState<{ name: string; url: string } | null>(null);
  const [copied, setCopied] = useState("");
  const date = new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : "en", { dateStyle: "medium" });

  const run = async (call: () => Promise<Result>, ok: string, after?: (r: Result) => void) => {
    setBusy(true); setMsg(null);
    try {
      const r = await call();
      if (r.ok) { setMsg({ ok: true, text: ok }); after?.(r); await reload(); }
      else setMsg({ ok: false, text: t(`private.errors.${r.error ?? "invalid"}`) });
    } catch { setMsg({ ok: false, text: t("common.error") }); }
    finally { setBusy(false); }
  };
  const copy = async (url: string) => { await Clipboard.setStringAsync(url); setCopied(url); setTimeout(() => setCopied(""), 2000); };

  const sections = data && !data.lockWhole ? data.privateSections.map((s) => t(`appearance.section.${s}`)).join(lang === "ar" ? "، " : ", ") : "";

  return (
    <SectionScreen title={t("section.private")} subtitle={t("private.subtitle")} loading={!data && !error} error={error} onRetry={reload}>
      {data && (
        <>
          {!data.isPro ? <ProNote text={t("private.proOnly")} /> : null}
          <Card>
            <T weight="bold">{t("private.whatTitle")}</T>
            <T size={13.5} tone="muted">{data.lockWhole ? t("private.whatWhole") : sections ? t("private.whatSections", { list: sections }) : t("private.whatNone")}</T>
            <Button title={t("private.chooseSections")} variant="ghost" onPress={() => router.push("/page/appearance" as never)} />
          </Card>

          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Row><KeyRound size={18} color={colors.blue} /><T weight="bold">{t("private.passwordTitle")}</T></Row>
              <Pill tone={data.hasPassword ? "good" : "grey"}>{data.hasPassword ? t("private.on") : t("private.off")}</Pill>
            </Row>
            <T size={13.5} tone="muted">{t("private.passwordHint")}</T>
            <Field label={data.hasPassword ? t("private.newPassword") : t("private.password")} value={password} onChangeText={setPassword} autoCapitalize="none" autoCorrect={false}
              maxLength={64} hint={t("private.passwordRule")} editable={data.isPro} />
            <Button title={data.hasPassword ? t("private.change") : t("private.setPassword")} loading={busy} disabled={!data.isPro || password.trim().length < 4}
              onPress={() => run(() => rpc<Result>("savePagePassword", password), t("private.saved"), () => setPassword(""))} />
            {data.hasPassword ? (
              <Button title={t("private.remove")} variant="danger" disabled={busy}
                onPress={() => Alert.alert(t("private.remove"), t("private.removeConfirm"), [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("private.remove"), style: "destructive", onPress: () => run(() => rpc<Result>("savePagePassword", null), t("private.removed")) },
                ])} />
            ) : null}
          </Card>

          <Card>
            <Row><Link2 size={18} color={colors.blue} /><T weight="bold">{t("private.linksTitle")}</T></Row>
            <T size={13.5} tone="muted">{t("private.linksHint")}</T>
            <Field label={t("private.linkName")} placeholder={t("private.linkNamePh")} value={name} onChangeText={setName} maxLength={60} editable={data.isPro} />
            <T size={13} weight="bold">{t("private.linkDays")}</T>
            <Segmented label={t("private.linkDays")} value={days} onChange={setDays} options={DAYS.map((d) => ({ value: d, label: d ? t("private.days", { n: d }) : t("private.noEnd") }))} />
            <Button title={t("private.makeLink")} loading={busy} disabled={!data.isPro || !name.trim()}
              onPress={() => run(() => rpc<Result>("addPrivateLink", { name, days }), t("private.madeShort"), (r) => { if (r.url) setMade({ name, url: r.url }); setName(""); })} />
            {made ? (
              <View style={{ gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.good + "55", backgroundColor: colors.good + "12" }}>
                <T size={13.5} weight="bold" tone="good">{t("private.made", { name: made.name })}</T>
                <T size={13} selectable style={{ writingDirection: "ltr" }}>{made.url}</T>
                <Row>
                  <Button title={t("home.share")} icon={<Share2 size={16} color={colors.onBlue} />} onPress={() => Share.share({ message: made.url, url: made.url })} style={{ flex: 1 }} />
                  <Button title={copied === made.url ? t("home.copied") : t("home.copy")} variant="secondary" icon={<Copy size={16} color={colors.navy} />} onPress={() => copy(made.url)} />
                </Row>
              </View>
            ) : null}
          </Card>

          {msg ? <T size={13.5} tone={msg.ok ? "good" : "bad"} accessibilityLiveRegion="polite">{msg.text}</T> : null}

          <Card>
            {data.links.length === 0 ? <T size={13.5} tone="muted">{t("private.noLinks")}</T> : data.links.map((l, i) => (
              <View key={l.id} style={{ gap: 6, paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <T weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{l.name}</T>
                  {l.expired ? <Pill tone="warn">{t("private.expired")}</Pill> : null}
                </Row>
                <T size={12.5} tone="muted">
                  {[t("private.views", { n: l.views }), l.lastViewedAt ? t("private.lastOpened", { date: date.format(new Date(l.lastViewedAt)) }) : null,
                    l.expiresAt && !l.expired ? t("private.endsOn", { date: date.format(new Date(l.expiresAt)) }) : null].filter(Boolean).join(" · ")}
                </T>
                <Row>
                  {l.url && !l.expired ? <Button title={copied === l.url ? t("home.copied") : t("home.copy")} variant="secondary" icon={<Copy size={16} color={colors.navy} />} onPress={() => copy(l.url!)} style={{ flex: 1 }} /> : null}
                  <Button title={t("private.revoke")} variant="ghost" titleColor={colors.bad} icon={<Trash2 size={16} color={colors.bad} />} disabled={busy}
                    onPress={() => Alert.alert(t("private.revoke"), t("private.revokeConfirm", { name: l.name }), [
                      { text: t("common.cancel"), style: "cancel" },
                      { text: t("private.revoke"), style: "destructive", onPress: () => run(() => rpc<Result>("removePrivateLink", l.id), t("private.revoked")) },
                    ])} />
                </Row>
              </View>
            ))}
          </Card>
        </>
      )}
    </SectionScreen>
  );
}
