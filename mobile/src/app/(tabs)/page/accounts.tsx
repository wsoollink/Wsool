import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ChevronDown, Sparkles } from "lucide-react-native";
import { PlatformIcon } from "../../../components/PlatformIcon";
import { AddButton, Chips, ItemTools, move, PickerSheet, ProNote, SectionScreen, useSection } from "../../../components/editor";
import { Button, Card, Field, Pill, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { api, rpc } from "../../../lib/api";
import { pickImage, upload } from "../../../lib/media";
import { autoFilled, BOT_PLATFORMS, BRAND_COLORS, CONNECT_AUDIENCE, LINK_PLATFORMS, PLATFORM_NAMES, PLATFORMS, type Platform } from "../../../lib/platforms";
import { useTheme } from "../../../lib/theme";

type Share = { label: string; percent: number };
type Audience = { gender: Share[]; ages: Share[]; countries: Share[]; cities: Share[] };
type Account = { id: string | null; platform: Platform; handle: string; followers: string; link: string; verificationStatus?: string };
type Connection = { status: "active" | "error"; lastSyncAt: string | null; name: string | null };
type Data = {
  accounts: { id: string; platform: Platform; handle: string; followers: number; link: string; verificationStatus: string; views: number | null; audience: Audience | null; connection: Connection | null }[];
  viewsMonth: string | null; audienceLocked: boolean;
  /** Platforms the creator can link (their keys are set on the server). */
  connectable: Platform[];
};
const AGES = ["13-17", "18-24", "25-34", "35-44", "45+"];
const COUNTRIES = ["SA", "AE", "KW", "QA", "BH", "OM", "EG", "JO", "IQ", "MA", "DZ", "TN", "LB", "YE", "SY", "PS", "SD", "LY", "TR", "US", "GB", "DE", "FR", "CA", "IN", "PK", "ID", "MY"];
const MAX_ACCOUNTS = 12;
const digits = (v: string, max = 11) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "").slice(0, max);
const emptyAudience = (): Audience => ({ gender: [], ages: [], countries: [], cities: [] });
/** A platform's finer age groups (YouTube 45-54, 55-64, 65+) folded into the manual form's 45+. */
const manualAges = (list: Share[]): Share[] => {
  if (list.every((s) => AGES.includes(s.label))) return list;
  const older = list.filter((s) => !AGES.includes(s.label)).reduce((sum, s) => sum + s.percent, 0);
  const kept = list.find((s) => s.label === "45+")?.percent ?? 0;
  return [...list.filter((s) => AGES.includes(s.label) && s.label !== "45+"), { label: "45+", percent: Math.min(100, kept + older) }];
};
const pct = (list: Share[], label: string) => String(list.find((s) => s.label === label)?.percent ?? "");
const setPct = (list: Share[], label: string, v: string) => {
  const n = Number(digits(v, 3));
  const rest = list.filter((s) => s.label !== label);
  return v === "" ? rest : [...rest, { label, percent: Math.min(100, n) }];
};
const total = (list: Share[]) => list.reduce((s, x) => s + x.percent, 0);
const monthStart = (ago: number) => { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - ago, 1)); };

/** Accounts & followers, monthly views per account, and audience data (Pro on the page). */
export default function Accounts() {
  const { t, num, date, lang, rtl } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("accounts");
  const [list, setList] = useState<Account[] | null>(null);
  const [picker, setPicker] = useState<number | null>(null);
  const [state, setState] = useState<Record<string, string>>({});
  const [monthsAgo, setMonthsAgo] = useState(0);
  const [views, setViews] = useState<Record<string, string>>({});
  const [audience, setAudience] = useState<Record<string, Audience>>({});
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setList(data.accounts.map((a) => ({ id: a.id, platform: a.platform, handle: a.handle, followers: String(a.followers), link: a.link, verificationStatus: a.verificationStatus })));
    setViews(Object.fromEntries(data.accounts.map((a) => [a.id, a.views === null ? "" : String(a.views)])));
    setAudience(Object.fromEntries(data.accounts.map((a) => [a.id, a.audience ? (autoFilled("audience", a.platform, a.connection) ? a.audience : { ...a.audience, ages: manualAges(a.audience.ages) }) : emptyAudience()])));
    if (data.viewsMonth) {
      const m = new Date(data.viewsMonth), n = new Date();
      setMonthsAgo(Math.min(2, Math.max(0, (n.getUTCFullYear() - m.getUTCFullYear()) * 12 + n.getUTCMonth() - m.getUTCMonth())));
    }
  }, [data]);
  const mark = (key: string, v: string) => setState((s) => ({ ...s, [key]: v }));
  const setItem = (i: number, patch: Partial<Account>) => { setList((l) => l && l.map((x, j) => (j === i ? { ...x, ...patch } : x))); mark("accounts", ""); };

  const saveAccounts = async () => {
    if (!list) return;
    mark("accounts", "saving");
    try {
      const res = await rpc<{ ok?: boolean }>("saveAccounts", list.map((a) => ({
        id: a.id, platform: a.platform, handle: a.handle.trim(), followers: Number(a.followers) || 0, ...(LINK_PLATFORMS.includes(a.platform) && { link: a.link.trim() }),
      })));
      mark("accounts", res.ok ? "saved" : "failed");
      if (res.ok) reload();
    } catch { mark("accounts", "failed"); }
  };
  const saveViews = async () => {
    if (!data) return;
    mark("views", "saving");
    try {
      const res = await rpc<{ ok?: boolean }>("saveMonthlyViews", { monthsAgo, byAccount: data.accounts.map((a) => ({ accountId: a.id, views: views[a.id] ? Number(views[a.id]) : null })) });
      mark("views", res.ok ? "saved" : "failed");
    } catch { mark("views", "failed"); }
  };
  const saveAudience = async (id: string) => {
    mark(`aud:${id}`, "saving");
    try {
      const res = await rpc<{ ok?: boolean; error?: string }>("saveAudience", id, audience[id]);
      mark(`aud:${id}`, res.ok ? "saved" : res.error === "over_100" ? "over" : "failed");
    } catch { mark(`aud:${id}`, "failed"); }
  };
  const readShot = async (id: string) => {
    const file = await pickImage({ maxSide: 2000 });
    if (!file || "error" in file) return;
    mark(`aud:${id}`, "reading");
    const up = await upload("audienceShot", file);
    if (!("path" in up)) return mark(`aud:${id}`, "failed");
    const res = await rpc<{ ok?: boolean; audience?: Audience & { agesUncertain: boolean }; error?: string }>("readAudienceShot", id, up.path);
    if (!res.ok || !res.audience) return mark(`aud:${id}`, res.error === "limit" ? "limit" : res.error === "not_stats" ? "not_stats" : "failed");
    const read = res.audience;
    setAudience((all) => {
      const cur = all[id] ?? emptyAudience();
      return { ...all, [id]: { gender: read.gender.length ? read.gender : cur.gender, ages: read.ages.length ? read.ages : cur.ages, countries: read.countries.length ? read.countries : cur.countries, cities: read.cities.length ? read.cities : cur.cities } };
    });
    mark(`aud:${id}`, read.agesUncertain ? "uncertain" : "filled");
  };

  // Platform sign-in in the phone's browser; the server sends it back to wsool://connect?status=ok|error&code=.
  const connect = async (id: string, platform: Platform) => {
    mark(`conn:${id}`, "busy");
    try {
      const { url } = await api<{ url: string }>(`/connect/${platform}`, { method: "POST", body: { accountId: id } });
      // Telegram: open the bot's "add to channel" screen in Telegram, then the creator comes back and checks.
      if (BOT_PLATFORMS.includes(platform)) {
        await Linking.openURL(url);
        return mark(`conn:${id}`, "waiting");
      }
      const res = await WebBrowser.openAuthSessionAsync(url, "wsool://connect");
      if (res.type !== "success") return mark(`conn:${id}`, "");
      const q = new URL(res.url.replace(/^wsool:\/\//, "https://app/")).searchParams;
      mark(`conn:${id}`, q.get("status") === "ok" ? "done" : `error:${q.get("code") ?? "failed"}`);
      reload();
    } catch { mark(`conn:${id}`, "error:failed"); }
  };
  // Telegram "Check the link": asks the server, which asks Telegram whether the bot is an admin of the channel.
  const checkLink = async (id: string) => {
    mark(`conn:${id}`, "checking");
    try {
      const res = await rpc<{ ok?: true; error?: string }>("checkBotConnection", id);
      if (res.ok) { mark(`conn:${id}`, "done"); reload(); }
      else mark(`conn:${id}`, `check:${res.error ?? "gone"}`);
    } catch { mark(`conn:${id}`, "check:gone"); }
  };
  const unlink = (id: string, platform: Platform) =>
    Alert.alert(t("accounts.connect.unlink"), t("accounts.connect.confirmUnlink", { platform: PLATFORM_NAMES[platform] }), [
      { text: t("accounts.connect.cancel"), style: "cancel" },
      { text: t("accounts.connect.unlink"), style: "destructive", onPress: async () => {
        mark(`conn:${id}`, "busy");
        try { await rpc("disconnectAccount", id); mark(`conn:${id}`, ""); reload(); } catch { mark(`conn:${id}`, "error:failed"); }
      } },
    ]);
  // In the platform's own colour, with its logo and name (owner, Oct 2026).
  const brandButton = (a: Account, title: string, busy: boolean) => {
    const fg = a.platform === "snapchat" ? "#000000" : "#FFFFFF";
    return (
      <Button title={title} loading={busy} onPress={() => connect(a.id!, a.platform)} icon={<PlatformIcon platform={a.platform} size={18} color={fg} />}
        style={{ backgroundColor: BRAND_COLORS[a.platform] }} titleColor={fg} />
    );
  };
  const connectBox = (a: Account) => {
    const saved = a.id ? data?.accounts.find((x) => x.id === a.id) : undefined;
    const conn = saved?.connection ?? null;
    if (!data?.connectable.includes(a.platform) && !conn) return null;
    const name = PLATFORM_NAMES[a.platform];
    const s = a.id ? state[`conn:${a.id}`] : undefined;
    const note = s === "done" ? <T size={13} tone="good" accessibilityLiveRegion="polite">{t("accounts.connect.done", { platform: name })}</T>
      : s?.startsWith("error:") ? <T size={13} tone="bad" accessibilityLiveRegion="polite">{t(`accounts.connect.errors.${s.slice(6)}`)}</T> : null;
    if (conn && saved?.platform === a.platform) {
      return (
        <View style={{ gap: 6, padding: 12, borderRadius: 10, backgroundColor: colors.blueSoft }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Pill tone={conn.status === "active" ? "good" : "bad"}>{t(conn.status === "active" ? "accounts.connect.linked" : "accounts.connect.stopped")}</Pill>
            <T size={13} tone="blue" accessibilityRole="button" onPress={() => unlink(a.id!, a.platform)} style={{ paddingVertical: 10 }}>{t("accounts.connect.unlink")}</T>
          </Row>
          {conn.name ? <T size={13}>{t("accounts.connect.linkedTo", { name: conn.name })}</T> : null}
          <T size={12.5} tone="muted">{conn.status === "active" ? `${t("accounts.connect.auto")}${conn.lastSyncAt ? ` · ${t("accounts.connect.lastSync", { date: date(conn.lastSyncAt) })}` : ""}` : t("accounts.connect.stoppedTitle", { platform: name })}</T>
          {conn.status === "error" ? brandButton(a, t("accounts.connect.againOn", { platform: name }), s === "busy") : null}
          {note}
        </View>
      );
    }
    if (!data?.connectable.includes(a.platform)) return null;
    return (
      <View style={{ gap: 8, padding: 12, borderRadius: 10, backgroundColor: colors.blueSoft }}>
        <T weight="bold" size={14}>{t("accounts.connect.title", { platform: name })}</T>
        <T size={12.5} tone="muted">{a.id && saved?.platform === a.platform ? t(CONNECT_AUDIENCE.includes(a.platform) ? "accounts.connect.why" : "accounts.connect.whyFollowers") : t("accounts.connect.saveFirst")}</T>
        {a.id && saved?.platform === a.platform
          ? brandButton(a, t("accounts.connect.button", { platform: name }), s === "busy")
          : null}
        {a.id && saved?.platform === a.platform && BOT_PLATFORMS.includes(a.platform) && (
          <View style={{ gap: 4 }}>
            {[1, 2, 3].map((n) => <T key={n} size={12.5}>{`${n}. ${t(`accounts.connect.botStep${n}`, { handle: `\u2066@${a.handle}\u2069` })}`}</T>)}
            <Button title={t("accounts.connect.check")} variant="secondary" loading={s === "checking"} onPress={() => checkLink(a.id!)} />
            {s?.startsWith("check:") ? <T size={13} tone="bad" accessibilityLiveRegion="polite">{t(`accounts.connect.checkErrors.${s.slice(6)}`, { handle: `\u2066@${a.handle}\u2069` })}</T> : null}
          </View>
        )}
        {note}
      </View>
    );
  };

  const status = (key: string) => {
    const s = state[key];
    if (!s) return null;
    const tone = s === "saved" || s === "filled" ? "good" : s === "saving" || s === "reading" ? "muted" : "bad";
    return <T size={13} tone={tone} accessibilityLiveRegion="polite">{t(`accounts.status.${s}`)}</T>;
  };
  const region = (code: string) => { try { return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code; } catch { return code; } };

  return (
    <SectionScreen title={t("section.accounts")} subtitle={t("accounts.subtitle")} loading={!list && !error} error={error} onRetry={reload}>
      {list && data && (
        <>
          <T weight="bold" size={16}>{t("accounts.accounts")}</T>
          {list.map((a, i) => {
            const linked = !!a.id && !!data.accounts.find((x) => x.id === a.id && x.platform === a.platform)?.connection;
            return (
            <Card key={a.id ?? `new-${i}`}>
              <Row style={{ justifyContent: "space-between" }}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("accounts.platform")} onPress={() => setPicker(i)} disabled={linked}
                  style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line }}>
                  <PlatformIcon platform={a.platform} size={18} color={colors.navy} /><T weight="bold">{PLATFORM_NAMES[a.platform]}</T><ChevronDown size={16} color={colors.muted} />
                </Pressable>
                {a.verificationStatus === "verified" ? <Pill tone="good">{t("home.vstatus.verified")}</Pill> : a.verificationStatus === "in_review" ? <Pill tone="blue">{t("home.vstatus.in_review")}</Pill> : null}
              </Row>
              {LINK_PLATFORMS.includes(a.platform) && (
                <Field label={t(a.platform === "discord" ? "accounts.serverLink" : "accounts.link")} value={a.link} onChangeText={(v) => setItem(i, { link: v })} editable={!linked} keyboardType="url" autoCapitalize="none" placeholder="https://" style={{ textAlign: "left", writingDirection: "ltr" }} />
              )}
              <Row style={{ alignItems: "flex-start" }}>
                <View style={{ flex: 1.2 }}><Field label={t("accounts.handle")} value={a.handle} onChangeText={(v) => setItem(i, { handle: v })} editable={!linked} autoCapitalize="none" placeholder="@username" style={{ textAlign: "left", writingDirection: "ltr" }} /></View>
                <View style={{ flex: 1 }}><Field label={a.platform === "discord" ? t("accounts.members") : t("accounts.followers")} value={a.followers} onChangeText={(v) => setItem(i, { followers: digits(v, 10) })} editable={!linked} keyboardType="number-pad" style={{ textAlign: "left", writingDirection: "ltr" }} /></View>
              </Row>
              {a.followers ? <T size={12.5} tone="muted">{num(Number(a.followers))}</T> : null}
              {linked ? <T size={12.5} tone="muted">{t("accounts.connect.locked")}</T> : null}
              {connectBox(a)}
              <ItemTools index={i} count={list.length} onMove={(x, y) => { setList(move(list, x, y)); mark("accounts", ""); }} onRemove={() => { setList(list.filter((_, j) => j !== i)); mark("accounts", ""); }} />
            </Card>
            );
          })}
          <AddButton label={t("accounts.add")} disabled={list.length >= MAX_ACCOUNTS} onPress={() => { setList([...list, { id: null, platform: "tiktok", handle: "", followers: "", link: "" }]); mark("accounts", ""); }} />
          <T size={12.5} tone="muted">{t("accounts.resetHint")}</T>
          {status("accounts")}
          <Button title={state.accounts === "saving" ? t("editor.saving") : t("accounts.saveAccounts")} onPress={saveAccounts} loading={state.accounts === "saving"} />

          {data.accounts.length > 0 && (
            <Card style={{ marginTop: 8 }}>
              <T weight="bold" size={16}>{t("accounts.views")}</T>
              <T size={12.5} tone="muted">{t("accounts.viewsHint")}</T>
              <Chips value={[String(monthsAgo)]} onChange={([v]) => { setMonthsAgo(Number(v)); mark("views", ""); }}
                options={[0, 1, 2].map((ago) => ({ value: String(ago), label: date(monthStart(ago), { month: "long", year: "numeric", timeZone: "UTC" }) }))} />
              {data.accounts.map((a) => {
                const auto = autoFilled("views", a.platform, a.connection);
                return (
                  <Row key={a.id}>
                    <Row style={{ width: 120 }}><PlatformIcon platform={a.platform} size={16} color={colors.navy} /><T size={13.5}>{PLATFORM_NAMES[a.platform]}</T></Row>
                    <View style={{ flex: 1 }}><Field label={t("accounts.viewsLabel", { platform: PLATFORM_NAMES[a.platform] })} value={views[a.id] ?? ""} editable={!auto} hint={auto ? t("accounts.viewsAuto", { platform: PLATFORM_NAMES[a.platform] }) : null} onChangeText={(v) => { setViews({ ...views, [a.id]: digits(v, 11) }); mark("views", ""); }} keyboardType="number-pad" style={{ textAlign: "left", writingDirection: "ltr" }} /></View>
                  </Row>
                );
              })}
              {status("views")}
              <Button title={t("accounts.saveViews")} variant="secondary" onPress={saveViews} loading={state.views === "saving"} />
            </Card>
          )}

          {data.accounts.length > 0 && <T weight="bold" size={16} style={{ marginTop: 8 }}>{t("accounts.audience")}</T>}
          {data.audienceLocked && data.accounts.length > 0 && <ProNote text={t("accounts.audiencePro")} />}
          {data.accounts.map((a) => {
            const au = audience[a.id] ?? emptyAudience();
            const isOpen = open === a.id;
            return (
              <Card key={a.id}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen(isOpen ? null : a.id)} style={{ minHeight: 44, justifyContent: "center" }}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Row><PlatformIcon platform={a.platform} size={18} color={colors.navy} /><T weight="bold">{PLATFORM_NAMES[a.platform]}</T><T size={12.5} tone="muted">@{a.handle}</T></Row>
                    <ChevronDown size={18} color={colors.muted} style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }} />
                  </Row>
                </Pressable>
                {isOpen && autoFilled("audience", a.platform, a.connection) && (
                  <View style={{ gap: 10 }}>
                    <T size={13} tone="good">{t("accounts.audienceAutoHint", { platform: PLATFORM_NAMES[a.platform] })}</T>
                    {([["gender", t("accounts.gender"), (s: string) => t(`accounts.${s}`)], ["ages", t("accounts.ages"), (s: string) => `\u2066${s}\u2069`], ["countries", t("accounts.countries"), region], ["cities", t("accounts.cities"), (s: string) => s]] as const)
                      .filter(([k]) => au[k].length)
                      .map(([k, title, label]) => (
                        <View key={k} style={{ gap: 6 }}>
                          <T weight="bold" size={14}>{title}</T>
                          {au[k].map((s) => (
                            <Row key={s.label}>
                              {/* Age ranges read left to right ("65+", not "+65"). */}
                              <T size={13.5} style={[{ width: 110 }, k === "ages" && { writingDirection: "ltr", textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>{label(s.label)}</T>
                              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: "hidden" }}><View style={{ width: `${Math.min(100, s.percent)}%`, height: 8, backgroundColor: colors.blue }} /></View>
                              <T size={13} tone="muted" style={{ width: 44, textAlign: "right" }}>{num(s.percent)}%</T>
                            </Row>
                          ))}
                        </View>
                      ))}
                    {(["gender", "ages", "countries", "cities"] as const).every((k) => !au[k].length) ? <T size={13} tone="muted">{t("accounts.audienceAutoEmpty")}</T> : null}
                  </View>
                )}
                {isOpen && !autoFilled("audience", a.platform, a.connection) && (
                  <View style={{ gap: 12 }}>
                    <Button title={state[`aud:${a.id}`] === "reading" ? t("accounts.reading") : t("accounts.fromShot")} variant="secondary" icon={<Sparkles size={16} color={colors.blue} />} onPress={() => readShot(a.id)} loading={state[`aud:${a.id}`] === "reading"} />
                    <T weight="bold" size={14}>{t("accounts.gender")}</T>
                    <Row>
                      {["female", "male"].map((g) => (
                        <View key={g} style={{ flex: 1 }}><Field label={`${t(`accounts.${g}`)} %`} value={pct(au.gender, g)} keyboardType="number-pad" onChangeText={(v) => setAudience({ ...audience, [a.id]: { ...au, gender: setPct(au.gender, g, v) } })} /></View>
                      ))}
                    </Row>
                    <T weight="bold" size={14}>{t("accounts.ages")} <T size={12.5} tone={total(au.ages) > 100 ? "bad" : "muted"}>({num(total(au.ages))}%)</T></T>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {AGES.map((g) => (
                        <View key={g} style={{ width: "30%", flexGrow: 1 }}><Field label={g} value={pct(au.ages, g)} keyboardType="number-pad" onChangeText={(v) => setAudience({ ...audience, [a.id]: { ...au, ages: setPct(au.ages, g, v) } })} /></View>
                      ))}
                    </View>
                    <T weight="bold" size={14}>{t("accounts.countries")}</T>
                    <Chips multi max={5} value={au.countries.map((c) => c.label)} onChange={(codes) => setAudience({ ...audience, [a.id]: { ...au, countries: codes.map((c) => au.countries.find((x) => x.label === c) ?? { label: c, percent: 0 }) } })}
                      options={[...new Set([...au.countries.map((c) => c.label), ...COUNTRIES])].map((c) => ({ value: c, label: region(c) }))} />
                    {au.countries.map((c) => (
                      <Field key={c.label} label={`${region(c.label)} %`} value={String(c.percent || "")} keyboardType="number-pad" onChangeText={(v) => setAudience({ ...audience, [a.id]: { ...au, countries: setPct(au.countries, c.label, v || "0") } })} />
                    ))}
                    <T weight="bold" size={14}>{t("accounts.cities")}</T>
                    {[0, 1, 2, 3, 4].slice(0, Math.min(5, au.cities.length + 1)).map((k) => {
                      const c = au.cities[k];
                      return (
                        <Row key={k} style={{ alignItems: "flex-start" }}>
                          <View style={{ flex: 1.6 }}><Field label={t("accounts.city")} value={c?.label ?? ""} maxLength={40} onChangeText={(v) => {
                            const cities = [...au.cities]; cities[k] = { label: v, percent: c?.percent ?? 0 };
                            setAudience({ ...audience, [a.id]: { ...au, cities: cities.filter((x) => x.label.trim() || x.percent) } });
                          }} /></View>
                          <View style={{ flex: 1 }}><Field label="%" value={c ? String(c.percent || "") : ""} keyboardType="number-pad" editable={!!c} onChangeText={(v) => {
                            const cities = [...au.cities]; cities[k] = { label: c!.label, percent: Math.min(100, Number(digits(v, 3)) || 0) };
                            setAudience({ ...audience, [a.id]: { ...au, cities } });
                          }} /></View>
                        </Row>
                      );
                    })}
                    {status(`aud:${a.id}`)}
                    <Button title={t("accounts.saveAudience")} onPress={() => saveAudience(a.id)} loading={state[`aud:${a.id}`] === "saving"} />
                  </View>
                )}
              </Card>
            );
          })}

          <PickerSheet visible={picker !== null} title={t("accounts.platform")} onClose={() => setPicker(null)}
            onPick={(p) => picker !== null && setItem(picker, { platform: p })}
            options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_NAMES[p], icon: <PlatformIcon platform={p} size={20} color={colors.navy} /> }))} />
        </>
      )}
    </SectionScreen>
  );
}
