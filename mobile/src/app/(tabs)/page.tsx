import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, Share, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { BadgeCheck, Briefcase, Link2, MessageCircle, Palette, Pencil, Share2, Tag, TicketPercent, Users } from "lucide-react-native";
import { Toggle } from "../../components/editor";
import { Avatar, Button, Card, Group, IconTile, ListRow, Pill, Row, Screen, Status, T } from "../../components/ui";
import { useI18n } from "../../i18n";
import { api, ApiError, rpc } from "../../lib/api";
import { useCached } from "../../lib/cached";
import { useAuth } from "../../lib/app";
import { useTheme, align } from "../../lib/theme";

type Home = {
  name: string | null; username: string; url: string; published: boolean; photoUrl: string | null;
  plan: { pro: boolean };
  accounts: { id: string; verification: string }[];
};

/** My page: a preview card with the visibility switch, then every section of the page (app design, Oct 2026). */
export default function PageTab() {
  const { t, num, rtl } = useI18n();
  const { colors } = useTheme();
  const { refreshMe } = useAuth();
  const [data, setData] = useCached<Home>("/home");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setError(null); setData(await api<Home>("/home")); }
    catch (err) {
      if (err instanceof ApiError && err.code === "no_page") return refreshMe();
      setError(err instanceof ApiError && err.code !== "network" ? t("common.error") : t("common.offline"));
    }
  }, [t, refreshMe]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data) return <Status loading={!error} error={error} onRetry={load} />;
  const go = (s: string) => () => router.push(`/section/${s}` as never);
  const pending = data.accounts.filter((a) => a.verification === "in_review").length;
  const short = data.url.replace(/^https?:\/\//, "");

  const setPublished = async (on: boolean) => {
    setBusy(true);
    setData({ ...data, published: on });
    try {
      const res = await rpc<{ ok?: boolean; error?: string }>("setPublished", on);
      if (res?.error) {
        setData({ ...data, published: !on });
        if (res.error === "needs_name") Alert.alert(t("pageTab.needsName"));
      }
    } catch { setData({ ...data, published: !on }); }
    setBusy(false);
    refreshMe();
  };

  const share = (
    <Pressable accessibilityRole="button" accessibilityLabel={t("home.share")} onPress={() => Share.share({ message: data.url, url: data.url })}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.lineSoft }}>
      <Share2 size={19} color={colors.blue} />
    </Pressable>
  );

  return (
    <Screen title={t("tabs.page")} action={share}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.blue} />}>
      <T size={13.5} tone="muted" style={{ marginTop: -12, writingDirection: "ltr", textAlign: align(rtl ? "right" : "left") }}>{short}</T>

      <Card style={{ gap: 12 }}>
        <Row style={{ gap: 12 }}>
          <Avatar uri={data.photoUrl} name={data.name || data.username} size={52} />
          <View style={{ flex: 1 }}>
            <T weight="bold" size={17} numberOfLines={1}>{data.name || data.username}</T>
            <T size={13} tone={data.published ? "good" : "warn"}>{data.published ? t("home.published") : t("pageTab.hiddenNote")}</T>
          </View>
        </Row>
        <Row style={{ justifyContent: "space-between", minHeight: 44, borderTopWidth: 1, borderTopColor: colors.lineSoft, paddingTop: 8 }}>
          <T weight="bold" size={15}>{t("pageTab.visible")}</T>
          <Toggle label={t("pageTab.visible")} value={data.published} onChange={setPublished} disabled={busy} />
        </Row>
        <Row>
          <Button title={t("pageTab.preview")} variant="secondary" onPress={() => Linking.openURL(data.url)} style={{ flex: 1, minHeight: 42 }} />
          {data.plan.pro ? <Button title={t("pageTab.pdf")} variant="secondary" onPress={() => Linking.openURL(`${data.url}/pdf`)} style={{ flex: 1, minHeight: 42 }} /> : null}
        </Row>
      </Card>

      <Group title={t("pageTab.content")}>
        <ListRow icon={<IconTile color="#0060E6"><Pencil size={17} color="#fff" /></IconTile>} label={t("section.edit")} onPress={go("edit")} />
        <ListRow icon={<IconTile color="#7C4DFF"><Users size={17} color="#fff" /></IconTile>} label={t("section.accounts")} value={data.accounts.length ? t("pageTab.accounts", { n: num(data.accounts.length) }) : undefined} onPress={go("accounts")} />
        <ListRow icon={<IconTile color="#E8590C"><Briefcase size={17} color="#fff" /></IconTile>} label={t("section.work")} onPress={go("work")} />
        <ListRow icon={<IconTile color="#0E8A5F"><Tag size={17} color="#fff" /></IconTile>} label={t("section.rates")} badge={data.plan.pro ? undefined : <Pill tone="blue">PRO</Pill>} onPress={go("rates")} />
        <ListRow icon={<IconTile color="#0891B2"><Link2 size={17} color="#fff" /></IconTile>} label={t("section.links")} onPress={go("links")} />
        <ListRow icon={<IconTile color="#C2410C"><TicketPercent size={17} color="#fff" /></IconTile>} label={t("section.coupons")} onPress={go("coupons")} />
        <ListRow icon={<IconTile color="#16A34A"><MessageCircle size={17} color="#fff" /></IconTile>} label={t("section.contact")} onPress={go("contact")} />
      </Group>

      <Group title={t("pageTab.look")}>
        <ListRow icon={<IconTile color="#DB2777"><Palette size={17} color="#fff" /></IconTile>} label={t("section.appearance")} onPress={go("appearance")} />
        <ListRow icon={<IconTile color="#0369A1"><BadgeCheck size={17} color="#fff" /></IconTile>} label={t("section.verification")} badge={pending ? <Pill tone="warn">{t("pageTab.pending", { n: num(pending) })}</Pill> : undefined} onPress={go("verification")} />
      </Group>
    </Screen>
  );
}
