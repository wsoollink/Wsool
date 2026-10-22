import { Redirect } from "expo-router";
import Tabs from "expo-router/js-tabs";
import { TabBar, TABS } from "../../components/TabBar";
import { useAuth } from "../../lib/app";

/** Signed in with a page: Home, My page (all sections), Insights, Notifications, Account, on a floating bar. */
export default function TabsLayout() {
  const { status, me } = useAuth();
  if (status === "signedOut") return <Redirect href="/login" />;
  if (me && !me.page) return <Redirect href="/onboarding" />;
  return (
    <Tabs backBehavior="history" screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...(props as unknown as Parameters<typeof TabBar>[0])} />}>
      {/* "page" and "account" are stacks of their own (page/_layout, account/_layout), so sections keep the bar. */}
      {TABS.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} />)}
    </Tabs>
  );
}
