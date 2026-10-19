import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, Share, View } from "react-native";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { Bell, ChevronLeft, ChevronRight, Eye, Lock, Share2, type LucideIcon, BadgeCheck, Camera, FileText, Hash, Briefcase, Clapperboard, Tag, MessageCircle, Users, ChartPie, RefreshCw } from "lucide-react-native";
import { Avatar, Card, Row, Screen, Status, T } from "../../components/ui";
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

/** Icon and colour of each "finish your page" step. */
const TODO: Record<string, { Icon: LucideIcon; color: string }> = {
  photo: { Icon: Camera, color: "#0060E6" }, bio: { Icon: FileText, color: "#0060E6" }, accounts: { Icon: Users, color: "#7C4DFF" },
  tags: { Icon: Hash, color: "#0891B2" }, brands: { Icon: Briefcase, color: "#E8590C" }, work: { Icon: Clapperboard, color: "#E8590C" },
  rates: { Icon: Tag, color: "#0E8A5F" }, contact: { Icon: MessageCircle, color: "#16A34A" }, audience: { Icon: ChartPie, color: "#DB2777" },
  verify: { Icon: BadgeCheck, color: "#0369A1" },
};

/** Progress ring for the completion card. */
function Ring({ value, color, track }: { value: number; color: string; track: string }) {
  const r = 23, c = 2 * Math.PI * r;
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Circle cx={28} cy={28} r={r} stroke={track} strokeWidth={6} fill="none" />
      <Circle cx={28} cy={28} r={r} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - value)} transform="rotate(-90 28 28)" />
    </Svg>
  );
}

/** Home: greeting, the link card, last 30 days, and what's left to finish (app design, Oct 2026). */
export default function HomeScreen() {
  const { t, num, rtl } = useI18n();
  const { colors } = useTheme();
  const { refreshMe } = useAuth();
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
  const done = data.completion.filter((c) => c.done).length;
  const left = data.completion.filter((c) => !c.done);
  const short = data.url.replace(/^https?:\/\//, "");
  const hour = new Date().getHours();
  const tiles = s ? [
    { label: t("home.stat.views"), value: num(s.views), delta: change(s.views, s.prev.views) },
    { label: t("home.stat.whatsapp"), value: num(s.whatsapp), delta: change(s.whatsapp, s.prev.whatsapp) },
    { label: t("home.stat.email"), value: num(s.email), delta: change(s.email, s.prev.email) },
  ] : [];
  const onHero = "rgba(255,255,255,0.12)";

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}>
      <Row style={{ justifyContent: "space-between", paddingTop: 4 }}>
        <Pressable accessibilityRole="button" accessibilityHint={t("tabs.page")} onPress={() => router.push("/page")} style={{ flex: 1 }}>
          <Row style={{ gap: 12 }}>
            <Avatar uri={data.photoUrl} name={data.name || data.username} />
            <View style={{ flex: 1 }}>
              <T size={13} tone="muted">{hour < 12 ? t("greeting.morning") : t("greeting.evening")}</T>
              <T weight="black" size={22} numberOfLines={1}>{(data.name || data.username).split(" ")[0]}</T>
            </View>
          </Row>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={data.unread ? `${t("tabs.notifications")}, ${t("tabs.unread", { n: data.unread })}` : t("tabs.notifications")}
          onPress={() => router.push("/notifications")}
          style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.lineSoft }}>
          <Bell size={21} color={colors.navy} strokeWidth={1.8} />
          {data.unread ? <View style={{ position: "absolute", top: 11, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.bad, borderWidth: 2, borderColor: colors.card }} /> : null}
        </Pressable>
      </Row>

      <View style={{ borderRadius: 24, backgroundColor: colors.hero, padding: 18, gap: 12, overflow: "hidden" }}>
        <View pointerEvents="none" style={{ position: "absolute", top: -70, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(34,184,240,0.20)" }} />
        <View pointerEvents="none" style={{ position: "absolute", bottom: -90, left: 90, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(10,108,255,0.28)" }} />
        <Row style={{ justifyContent: "space-between" }}>
          <T size={13} style={{ color: "rgba(255,255,255,0.75)" }}>{t("home.yourLink")}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: data.published ? "rgba(76,217,160,0.16)" : "rgba(251,191,36,0.16)" }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: data.published ? "#4CD9A0" : "#FBBF24" }} />
            <T size={12.5} weight="bold" style={{ color: data.published ? "#7EE8BC" : "#FCD34D" }}>{data.published ? t("home.published") : t("home.hidden")}</T>
          </View>
        </Row>
        <T weight="bold" size={21} numberOfLines={1} style={{ color: "#FFFFFF", writingDirection: "ltr", textAlign: align(rtl ? "right" : "left") }}>{short}</T>
        <Row>
          <Pressable accessibilityRole="button" onPress={() => Share.share({ message: data.url, url: data.url })}
            style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: 16, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: pressed ? 0.85 : 1 })}>
            <Share2 size={17} color="#021941" /><T weight="bold" size={15} style={{ color: "#021941" }}>{t("home.share")}</T>
          </Pressable>
          <Pressable accessibilityRole="link" accessibilityLabel={t("home.view")} onPress={() => Linking.openURL(data.url)}
            style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 16, backgroundColor: onHero, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <Eye size={20} color="#FFFFFF" />
          </Pressable>
        </Row>
      </View>

      {data.numbersStale && (
        <Pressable accessibilityRole="button" onPress={() => router.push("/section/accounts")}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.warn + "14" }}>
            <RefreshCw size={18} color={colors.warn} /><T weight="bold" style={{ color: colors.warn, flex: 1 }}>{t("home.numbersStale")}</T>
          </Card>
        </Pressable>
      )}

      <View style={{ gap: 10 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <T weight="bold" size={18}>{t("home.last30")}</T>
          {s ? <Pressable accessibilityRole="link" onPress={() => router.push("/insights")} hitSlop={10}><T size={14} weight="bold" tone="blue">{t("home.details")}</T></Pressable> : null}
        </Row>
        {s ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {tiles.map((x) => (
              <Card key={x.label} style={{ flex: 1, minWidth: 0, padding: 12, gap: 2 }}>
                <T size={12} tone="muted" numberOfLines={2} style={{ minHeight: 32 }}>{x.label}</T>
                <T weight="black" size={22} numberOfLines={1} adjustsFontSizeToFit>{x.value}</T>
                {x.delta ? (
                  <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, borderRadius: 999, backgroundColor: (x.delta.good ? colors.good : colors.warn) + "1F" }}>
                    <T size={12} weight="bold" style={{ color: x.delta.good ? colors.good : colors.warn, writingDirection: "ltr" }}>{x.delta.text}</T>
                  </View>
                ) : <T size={12} tone="muted">{t("home.noCompare")}</T>}
              </Card>
            ))}
          </View>
        ) : (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Lock size={18} color={colors.muted} /><T tone="muted" style={{ flex: 1 }}>{t("home.statsPro")}</T></Card>
        )}
      </View>

      <Card style={{ gap: 0, paddingVertical: 12 }}>
        <Row style={{ gap: 14, paddingBottom: left.length ? 8 : 0 }}>
          <View style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center" }}>
            <Ring value={data.completion.length ? done / data.completion.length : 1} color={colors.blue} track={colors.blueSoft} />
            <T weight="bold" size={14} style={{ position: "absolute", textAlign: "center" }}>{num(Math.round((done / Math.max(1, data.completion.length)) * 100))}%</T>
          </View>
          <View style={{ flex: 1 }}>
            <T weight="bold" size={16}>{t("home.completeTitle")}</T>
            <T size={13} tone="muted">{left.length ? t("home.completeLeft", { n: num(left.length) }) : t("home.ready")}</T>
          </View>
        </Row>
        {left.slice(0, 3).map((c) => {
          const { Icon, color } = TODO[c.key] ?? { Icon: BadgeCheck, color: colors.blue };
          return (
            <Pressable key={c.key} accessibilityRole="button" onPress={() => router.push(`/section/${c.section}` as never)}>
              <Row style={{ minHeight: 52, gap: 12, borderTopWidth: 1, borderTopColor: colors.lineSoft }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: color + "1F", alignItems: "center", justifyContent: "center" }}><Icon size={18} color={color} /></View>
                <T weight="bold" size={15} style={{ flex: 1 }}>{t(`home.todo.${c.key}`)}</T>
                <Chevron size={18} color={colors.faint} />
              </Row>
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
