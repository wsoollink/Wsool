import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Row, Status, T } from "../../components/ui";
import { useI18n } from "../../i18n";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/app";
import { appRoute } from "../../lib/push";
import { useTheme } from "../../lib/theme";

type Item = { id: string; title: string; body: string; href: string; read: boolean; createdAt: string };

/** The bell: newest first; tapping one marks it read and opens its screen. */
export default function Notifications() {
  const { t, date } = useI18n();
  const { colors } = useTheme();
  const { refreshMe } = useAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setError(null); setItems((await api<{ items: Item[] }>("/notifications")).items); } catch { setError(t("common.offline")); }
  }, [t]);
  useEffect(() => { load(); }, [load]);

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
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.blue} />}
        ListHeaderComponent={
          <Row style={{ justifyContent: "space-between", marginBottom: 4 }}>
            <T weight="bold" size={22}>{t("notifications.title")}</T>
            {items.some((n) => !n.read) && <Button title={t("notifications.markAll")} variant="ghost" onPress={markAll} style={{ paddingHorizontal: 8 }} />}
          </Row>
        }
        ListEmptyComponent={<Card><T tone="muted">{t("notifications.empty")}</T></Card>}
        renderItem={({ item: n }) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: !n.read }} onPress={() => open(n)}>
            <Card style={{ gap: 4, ...(n.read ? {} : { borderColor: colors.blue + "55", backgroundColor: colors.blue + "0D" }) }}>
              <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <T weight="bold" style={{ flex: 1 }}>{n.title}</T>
                {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.bad, marginTop: 8 }} />}
              </Row>
              <T tone="muted" size={14}>{n.body}</T>
              <T tone="faint" size={12}>{date(n.createdAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</T>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
