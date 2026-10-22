import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { useI18n } from "../../i18n";
import { useAuth } from "../../lib/app";
import { FONTS, useTheme } from "../../lib/theme";

/**
 * iPhone: the system tab bar (Liquid Glass on iOS 26), same five tabs as the floating bar on Android
 * (`_layout.tsx` + `TabBar`). Icons are SF Symbols, outline when idle and filled when selected.
 */
export default function TabsLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { status, me } = useAuth();
  if (status === "signedOut") return <Redirect href="/login" />;
  if (me && !me.page) return <Redirect href="/onboarding" />;
  const unread = me?.unread ?? 0;
  return (
    <NativeTabs tintColor={colors.blue} labelStyle={{ fontFamily: FONTS.bold, fontSize: 11 }} backBehavior="history">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="page">
        <NativeTabs.Trigger.Icon sf={{ default: "person.text.rectangle", selected: "person.text.rectangle.fill" }} />
        <NativeTabs.Trigger.Label>{t("tabs.page")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Icon sf="chart.bar.xaxis" />
        <NativeTabs.Trigger.Label>{t("tabs.stats")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <NativeTabs.Trigger.Icon sf={{ default: "bell", selected: "bell.fill" }} />
        <NativeTabs.Trigger.Label>{t("tabs.notifications")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={unread === 0}>{String(unread)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <NativeTabs.Trigger.Label>{t("tabs.account")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
