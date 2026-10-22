import { Linking, View } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { CircleDollarSign, CreditCard, FileText, LifeBuoy, Star } from "lucide-react-native";
import { Avatar, Button, Card, Group, IconTile, ListRow, Row, Screen, Segmented, T } from "../../../components/ui";
import { useI18n, type Lang } from "../../../i18n";
import { useAuth } from "../../../lib/app";
import { SITE_URL } from "../../../lib/config";
import { useTheme, type ThemeMode } from "../../../lib/theme";

const TRIAL_DAYS = 14;

/** Account: who's signed in, the plan (read only: no purchases in the app), commission, preferences, help, sign out. */
export default function AccountTab() {
  const { t, num, lang, setLang } = useI18n();
  const { colors, mode, setMode } = useTheme();
  const { me, signOut } = useAuth();
  const plan = me?.plan;
  const name = me?.page?.name || me?.page?.username || "";
  const used = plan?.label === "trial" ? Math.min(1, Math.max(0, (TRIAL_DAYS - plan.trialDaysLeft) / TRIAL_DAYS)) : 0;

  return (
    <Screen title={t("tabs.account")}>
      <Row style={{ gap: 14 }}>
        <Avatar uri={me?.page?.photoUrl} name={name} size={58} />
        <View style={{ flex: 1 }}>
          <T weight="black" size={20} numberOfLines={1}>{name}</T>
          <T size={13} tone="muted" numberOfLines={1} ellipsizeMode="middle" style={{ writingDirection: "ltr" }}>{me?.user.email}</T>
        </View>
      </Row>

      {plan ? (
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Row style={{ gap: 8 }}>
              <IconTile color={colors.hero} size={30}><Star size={15} color="#7DD3FC" fill="#7DD3FC" /></IconTile>
              <T weight="bold" size={16}>{plan.pro ? t("plan.pro") : t("plan.free")}</T>
            </Row>
            {plan.label === "trial" ? (
              <View style={{ paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.blueSoft }}><T size={12.5} weight="bold" tone="blue">{t("plan.trial")}</T></View>
            ) : null}
          </Row>
          {plan.label === "trial" ? (
            <>
              <Row style={{ justifyContent: "space-between" }}>
                <T size={13} tone="muted">{t("account.daysLeft", { n: num(plan.trialDaysLeft) })}</T>
                <T size={13} tone="muted">{t("account.ofDays", { n: num(TRIAL_DAYS) })}</T>
              </Row>
              <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: TRIAL_DAYS, now: TRIAL_DAYS - plan.trialDaysLeft }} style={{ height: 8, borderRadius: 4, backgroundColor: colors.lineSoft, overflow: "hidden" }}>
                <View style={{ width: `${used * 100}%`, height: 8, borderRadius: 4, backgroundColor: colors.blue }} />
              </View>
            </>
          ) : null}
        </Card>
      ) : null}

      <Group title={t("account.money")}>
        <ListRow icon={<IconTile color="#E8590C"><CircleDollarSign size={17} color="#fff" /></IconTile>} label={t("section.referrals")} onPress={() => router.push("/account/referrals")} />
        <ListRow icon={<IconTile color="#0060E6"><CreditCard size={17} color="#fff" /></IconTile>} label={t("section.subscription")} onPress={() => router.push("/account/subscription")} />
      </Group>

      <View style={{ gap: 6 }}>
        <T size={13} weight="bold" tone="muted" style={{ paddingHorizontal: 14 }}>{t("account.prefs")}</T>
        <Card style={{ gap: 12 }}>
          <T weight="bold" size={15}>{t("more.language")}</T>
          <Segmented<Lang> label={t("more.language")} value={lang} onChange={setLang} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
          <T weight="bold" size={15}>{t("more.theme")}</T>
          <Segmented<ThemeMode> label={t("more.theme")} value={mode} onChange={setMode} options={[{ value: "system", label: t("more.themeSystem") }, { value: "light", label: t("more.themeLight") }, { value: "dark", label: t("more.themeDark") }]} />
        </Card>
      </View>

      <Group title={t("account.help")}>
        <ListRow icon={<IconTile color="#16A34A"><LifeBuoy size={17} color="#fff" /></IconTile>} label={t("more.support")} onPress={() => Linking.openURL("mailto:support@wsool.link")} />
        <ListRow icon={<IconTile color="#64748B"><FileText size={17} color="#fff" /></IconTile>} label={t("account.legal")} onPress={() => Linking.openURL(`${SITE_URL}/terms`)} />
      </Group>

      <Button title={t("more.signOut")} variant="danger" onPress={signOut} style={{ backgroundColor: colors.card }} />
      <T size={12} tone="faint" style={{ textAlign: "center" }}>{t("more.version", { v: Constants.expoConfig?.version ?? "1.0.0" })}</T>
    </Screen>
  );
}
