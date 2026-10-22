import { useCallback, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Bell } from "lucide-react-native";
import { Card, Group, Row, Screen, Status, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { api } from "../../../lib/api";
import { useCached } from "../../../lib/cached";
import { useAuth } from "../../../lib/app";
import { appRoute } from "../../../lib/push";
import { useTheme } from "../../../lib/theme";

type Item = { id: string; title: string; body: string; href: string; read: boolean; createdAt: string };

/** One notification row inside a group (unread ones tinted with a blue dot). */
function NotificationRow({ n, onPress, first }: { n: Item; onPress: () => void; first?: boolean }) {
  const { colors } = useTheme();
  const { date } = useI18n();
  const today = new Date(n.createdAt).toDateString() === new Date().toDateString();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !n.read }} onPress={onPress}
      style={({ pressed }) => ({ backgroundColor: pressed ? colors.hover : n.read ? "transparent" : colors.blue + "0F" })}>
      <Row style={{ paddingHorizontal: 14, gap: 12, alignItems: "flex-start" }}>
        <View style={{ width: 38, height: 38, borderRadius: 19, marginTop: 12, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" }}>
          <Bell size={18} color={colors.blue} />
        </View>
        <Row style={{ flex: 1, gap: 8, alignItems: "flex-start", paddingVertical: 12, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.line }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <T weight="bold" size={15} style={{ flex: 1 }}>{n.title}</T>
              <T size={12} tone="faint">{date(n.createdAt, today ? { hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short" })}</T>
            </Row>
            <T size={13.5} tone="muted">{n.body}</T>
          </View>
          {!n.read ? <View accessibilityLabel="•" style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue, marginTop: 8 }} /> : null}
        </Row>
      </Row>
    </Pressable>
  );
}

/** The bell: grouped by today / earlier; tapping one marks it read and opens its screen. */
export default function Notifications() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { refreshMe } = useAuth();
  const [items, setItems] = useCached<Item[]>("/notifications", (raw) => (raw as { items: Item[] }).items);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setError(null); setItems((await api<{ items: Item[] }>("/notifications")).items); } catch { setError(t("common.offline")); }
  }, [t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = async (n: Item) => {
    if (!n.read) {
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      api("/notifications/read", { method: "POST", body: { id: n.id } }).then(refreshMe).catch(() => {});
    }
    const route = appRoute(n.href);
    if (route !== "/notifications") router.push(route as never);
  };
  const markAll = async () => {
    setItems((list) => list?.map((x) => ({ ...x, read: true })) ?? null);
    await api("/notifications/read", { method: "POST", body: { all: true } }).catch(() => {});
    refreshMe();
  };

  if (!items) return <Status loading={!error} error={error} onRetry={load} />;
  const isToday = (n: Item) => new Date(n.createdAt).toDateString() === new Date().toDateString();
  const groups = [
    { title: t("notifications.today"), list: items.filter(isToday) },
    { title: t("notifications.earlier"), list: items.filter((n) => !isToday(n)) },
  ].filter((g) => g.list.length);

  return (
    <Screen
      title={t("notifications.title")}
      action={items.some((n) => !n.read) ? (
        <Pressable accessibilityRole="button" onPress={markAll} hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}>
          <T weight="bold" size={14.5} tone="blue">{t("notifications.markAll")}</T>
        </Pressable>
      ) : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.blue} />}
    >
      {groups.length === 0 ? <Card><T tone="muted">{t("notifications.empty")}</T></Card> : groups.map((g) => (
        <Group key={g.title} title={g.title}>
          {g.list.map((n) => <NotificationRow key={n.id} n={n} onPress={() => open(n)} />)}
        </Group>
      ))}
    </Screen>
  );
}
