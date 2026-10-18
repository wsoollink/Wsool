import { Redirect } from "expo-router";
import Tabs from "expo-router/js-tabs";
import { TabBar, TABS } from "../../components/TabBar";
import { useAuth } from "../../lib/app";

/** Dashboard sections open inside the tabs (bar stays visible) without a button of their own. */
const SECTIONS = ["[key]", "accounts", "analytics", "appearance", "contact", "edit", "links", "rates", "referrals", "subscription", "verification", "work"];

/** Signed in with a page: Home, My page (all sections), Insights, Notifications, Account, on a floating bar. */
export default function TabsLayout() {
  const { status, me } = useAuth();
  if (status === "signedOut") return <Redirect href="/login" />;
  if (me && !me.page) return <Redirect href="/onboarding" />;
  return (
    <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...(props as unknown as Parameters<typeof TabBar>[0])} />}>
      {TABS.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} />)}
      {/* Hidden from the bar (the bar draws only TABS); not href: null, which redirects away from the route. */}
      {SECTIONS.map((s) => <Tabs.Screen key={s} name={`section/${s}`} />)}
    </Tabs>
  );
}
