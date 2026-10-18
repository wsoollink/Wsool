import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, Share, View } from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { BadgeCheck, ChevronLeft, ChevronRight, Copy, ExternalLink, Lock, Share2 } from "lucide-react-native";
import { AreaChart } from "../../components/AreaChart";
import { Logo } from "../../components/Logo";
import { Button, Card, Panel, Pill, Row, Screen, Status, T } from "../../components/ui";
import { useI18n } from "../../i18n";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/app";
import { useTheme, align } from "../../lib/theme";

type Home = {
  name: string | null; username: string; url: string; published: boolean; photoUrl: string | null;
  plan: { label: "pro" | "trial" | "free"; pro: boolean; trialDaysLeft: number; periodEnd: string | null; cancelAtPeriodEnd: boolean };
  unread: number;
  stats: null | {
    views: number; whatsapp: number; email: number; prev: { views: number; whatsapp: number; email: number };
    topCountry: { code: string; share: number } | null;
    series: { day: string; views: number; prev: number }[];
  };
  numbersStale: boolean;
  completion: { key: string; done: boolean; section: string }[];
  accounts: { id: string; platform: string; handle: string; followers: number; verification: string }[];
};

const PLATFORM = { tiktok: "TikTok", instagram: "Instagram", x: "X", youtube: "YouTube", snapchat: "Snapchat", threads: "Threads", telegram: "Telegram", facebook: "Facebook", linkedin: "LinkedIn", pinterest: "Pinterest", twitch: "Twitch", jaco: "Jaco", discord: "Discord", spotify: "Spotify" } as Record<string, string>;
const VTONE = { verified: "good", expiring: "warn", in_review: "blue", rejected: "bad", expired: "grey", none: "grey" } as const;

/** Dashboard home: link, plan, last 30 days, completion and verification (same data as the website). */
export default function HomeScreen() {
  const { t, num, date, lang, rtl } = useI18n();
  const { colors } = useTheme();
  const { refreshMe } = useAuth();
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api<Home>("/home"));
    } catch (err) {
      if (err instanceof ApiError && err.code === "no_page") return refreshMe();
      setError(err instanceof ApiError && err.code !== "network" ? t("common.error") : t("common.offline"));
    }
  }, [t, refreshMe]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await Promise.all([load(), refreshMe()]); setRefreshing(false); };

  if (!data) return <Status loading={!error} error={error} onRetry={load} />;
  const Chevron = rtl ? ChevronLeft : ChevronRight;
  const s = data.stats;
  const change = (cur: number, before: number) => {
    if (!before) return null;
    const pct = Math.round(((cur - before) / before) * 100);
    return { text: `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${num(Math.abs(pct))}%`, good: pct >= 0 };
  };
  const region = (code: string) => { try { return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code; } catch { return code; } };
  const done = data.completion.filter((c) => c.done).length;
  const verified = data.accounts.filter((a) => a.verification === "verified" || a.verification === "expiring").length;
  const short = data.url.replace(/^https?:\/\//, "");

  const tiles = s ? [
    { label: t("home.stat.views"), value: num(s.views), delta: change(s.views, s.prev.views) },
    { label: t("home.stat.whatsapp"), value: num(s.whatsapp), delta: change(s.whatsapp, s.prev.whatsapp) },
    { label: t("home.stat.email"), value: num(s.email), delta: change(s.email, s.prev.email) },
    { label: t("home.stat.country"), value: s.topCountry ? region(s.topCountry.code) : "—", note: s.topCountry ? `${num(s.topCountry.share)}%` : undefined },
  ] : [];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}>
      <Row style={{ justifyContent: "space-between" }}>
        <Logo height={28} />
        <Pill tone={data.plan.label === "pro" ? "good" : data.plan.label === "trial" ? "blue" : "grey"}>{t(`plan.${data.plan.label}`)}</Pill>
      </Row>
      <View>
        <T weight="bold" size={22}>{t("home.hello", { name: (data.name || data.username).split(" ")[0] })}</T>
        {data.plan.label === "trial" && <T tone="muted">{t("plan.trialLeft", { days: num(data.plan.trialDaysLeft) })}</T>}
      </View>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <T size={12.5} tone="muted">{t("home.yourLink")}</T>
          <Pill tone={data.published ? "good" : "warn"}>{data.published ? t("home.published") : t("home.hidden")}</Pill>
        </Row>
        <T weight="bold" size={18} style={{ textAlign: align(rtl ? "right" : "left"), writingDirection: "ltr" }} numberOfLines={1}>{short}</T>
        <Row style={{ flexWrap: "wrap" }}>
          <Button title={t("home.share")} icon={<Share2 size={16} color={colors.onBlue} />} onPress={() => Share.share({ message: data.url, url: data.url })} style={{ flexGrow: 1 }} />
          <Button title={copied ? t("home.copied") : t("home.copy")} variant="secondary" icon={<Copy size={16} color={colors.navy} />} onPress={async () => { await Clipboard.setStringAsync(data.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }} />
          <Button title={t("home.view")} variant="secondary" icon={<ExternalLink size={16} color={colors.navy} />} onPress={() => Linking.openURL(data.url)} />
        </Row>
      </Card>

      {data.numbersStale && (
        <Pressable accessibilityRole="button" onPress={() => router.push("/section/accounts")}>
          <Card style={{ backgroundColor: colors.warn + "14", borderColor: colors.warn + "40" }}><T weight="bold" style={{ color: colors.warn }}>{t("home.numbersStale")}</T></Card>
        </Pressable>
      )}

      {s ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {tiles.map((x) => (
              <Card key={x.label} style={{ flexBasis: "47%", flexGrow: 1, gap: 4, padding: 14 }}>
                <T size={12.5} tone="muted">{x.label}</T>
                <T weight="black" size={x.value.length > 8 ? 16 : 24}>{x.value}</T>
                {"delta" in x && x.delta ? <T size={12} tone={x.delta.good ? "good" : "warn"} style={{ writingDirection: "ltr" }}>{x.delta.text} <T size={12} tone="muted">{t("home.vsPrev")}</T></T>
                  : "note" in x && x.note ? <T size={12} tone="muted">{x.note}</T> : <T size={12} tone="muted">{t("home.noCompare")}</T>}
              </Card>
            ))}
          </View>
          <Panel title={t("home.visits")} aside={t("home.last30")}>
            <AreaChart
              values={s.series.map((d) => d.views)} prev={s.series.map((d) => d.prev)}
              labels={s.series.map((d) => date(d.day))}
              ticks={[0, 10, 20, 29].map((i) => (s.series[i] ? date(s.series[i].day, { day: "numeric", month: "short" }) : ""))}
              valueText={(i) => num(s.series[i].views)}
              accessibilityLabel={`${t("home.visits")}: ${num(s.views)}`}
            />
          </Panel>
        </>
      ) : (
        <Card><Row><Lock size={18} color={colors.muted} /><T tone="muted" style={{ flex: 1 }}>{t("home.statsPro")}</T></Row></Card>
      )}

      <Panel title={t("home.completion")} aside={t("home.stepsDone", { done: num(done), total: num(data.completion.length) })}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.lineSoft, overflow: "hidden" }}>
          <View style={{ width: `${(done / data.completion.length) * 100}%`, height: 6, backgroundColor: colors.blue }} />
        </View>
        {done === data.completion.length ? <T tone="good">{t("home.complete")}</T> : data.completion.filter((c) => !c.done).slice(0, 4).map((c) => (
          <Pressable key={c.key} accessibilityRole="button" onPress={() => router.push(`/section/${c.section}` as never)} style={{ minHeight: 44, justifyContent: "center" }}>
            <Row style={{ justifyContent: "space-between" }}><T>{t(`home.todo.${c.key}`)}</T><Chevron size={18} color={colors.faint} /></Row>
          </Pressable>
        ))}
      </Panel>

      <Panel title={t("home.verification")} aside={data.accounts.length ? t("home.verifiedOf", { done: num(verified), total: num(data.accounts.length) }) : undefined}>
        {data.accounts.length === 0 ? <T tone="muted">{t("home.noAccounts")}</T> : data.accounts.map((a) => (
          <Row key={a.id} style={{ justifyContent: "space-between", minHeight: 40 }}>
            <View style={{ flexShrink: 1 }}>
              <T weight="bold">{PLATFORM[a.platform] ?? a.platform}</T>
              <T size={12.5} tone="muted" style={{ writingDirection: "ltr", textAlign: align(rtl ? "right" : "left") }}>@{a.handle} · {num(a.followers)}</T>
            </View>
            <Pill tone={VTONE[a.verification as keyof typeof VTONE] ?? "grey"}>{t(`home.vstatus.${a.verification}`)}</Pill>
          </Row>
        ))}
        {data.accounts.length > verified && (
          <Button title={t("section.verification")} variant="secondary" icon={<BadgeCheck size={16} color={colors.navy} />} onPress={() => router.push("/section/verification")} />
        )}
      </Panel>
    </Screen>
  );
}
