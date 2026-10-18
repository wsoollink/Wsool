import { Platform } from "react-native";
import { Redirect } from "expo-router";
import Tabs from "expo-router/js-tabs";
import { Bell, House, Menu } from "lucide-react-native";
import { useI18n } from "../../i18n";
import { useAuth } from "../../lib/app";
import { FONTS, useTheme } from "../../lib/theme";

/** Dashboard sections open inside the tabs (bar stays visible) without a button of their own. */
const SECTIONS = ["[key]", "accounts", "analytics", "appearance", "contact", "edit", "links", "rates", "referrals", "subscription", "verification", "work"];

/** Bottom tabs once signed in with a page: Home, Notifications (unread badge), More (all sections). */
export default function TabsLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { status, me } = useAuth();
  if (status === "signedOut") return <Redirect href="/login" />;
  if (me && !me.page) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        // Phones add their own bottom inset; the web preview has none, so it gets a little more room.
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, ...(Platform.OS === "web" && { height: 60, paddingBottom: 6 }) },
        // Noto Kufi is tall: a fixed line height keeps the labels inside the bar.
        tabBarLabelStyle: { fontFamily: FONTS.bold, fontSize: 11, lineHeight: 15 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t("tabs.home"), tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen
        name="notifications"
        options={{ title: t("tabs.notifications"), tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />, tabBarBadge: me?.unread ? (me.unread > 9 ? "9+" : me.unread) : undefined, tabBarBadgeStyle: { backgroundColor: colors.bad } }}
      />
      <Tabs.Screen name="more" options={{ title: t("tabs.more"), tabBarIcon: ({ color, size }) => <Menu color={color} size={size} /> }} />
      {/* Hidden with tabBarButton, not href: null (Expo Router redirects away from hidden tabs). */}
      {SECTIONS.map((s) => <Tabs.Screen key={s} name={`section/${s}`} options={{ tabBarButton: () => null, tabBarItemStyle: { display: "none" } }} />)}
    </Tabs>
  );
}
