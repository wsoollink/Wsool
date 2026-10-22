import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, ChartColumn, CircleUserRound, House, IdCard, type LucideIcon } from "lucide-react-native";
import { useI18n } from "../i18n";
import { useAuth } from "../lib/app";
import { useTheme } from "../lib/theme";
import { T } from "./ui";

/** The five tabs, in reading order; sections live in the stacks of "page" and "account". */
export const TABS: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: "home", label: "tabs.home", Icon: House },
  { name: "page", label: "tabs.page", Icon: IdCard },
  { name: "insights", label: "tabs.stats", Icon: ChartColumn },
  { name: "notifications", label: "tabs.notifications", Icon: Bell },
  { name: "account", label: "tabs.account", Icon: CircleUserRound },
];

/** What Expo Router's js-tabs passes to a custom tab bar (BottomTabBarProps): there is no `navigation` object. */
type Props = {
  state: { index: number; routes: { key: string; name: string }[] };
  emitter: { emit: (e: { type: "tabPress"; target: string; canPreventDefault: true }) => { defaultPrevented: boolean } };
  navigateToTab: (routeKey: string) => void;
};

/** Floating capsule tab bar from the app design: the active tab sits on a soft blue pill. */
export function TabBar({ state, emitter, navigateToTab }: Props) {
  const { t } = useI18n();
  const { colors, dark } = useTheme();
  const { me } = useAuth();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name ?? "home";
  const active = current;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        position: "absolute", left: 14, right: 14, bottom: Math.max(insets.bottom, 10) + (Platform.OS === "web" ? 6 : 4),
        minHeight: 66, paddingVertical: 7, borderRadius: 33, backgroundColor: colors.tabBar, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 7,
        borderWidth: dark ? 1 : 0, borderColor: colors.line,
        shadowColor: "#021941", shadowOpacity: dark ? 0.5 : 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
      }}
    >
      {TABS.map(({ name, label, Icon }) => {
        const on = name === active;
        const route = state.routes.find((r) => r.name === name);
        const press = () => {
          if (!route) return;
          const e = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!e.defaultPrevented && route.name !== current) navigateToTab(route.key);
        };
        const badge = name === "notifications" && (me?.unread ?? 0) > 0;
        return (
          <Pressable
            key={name} accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={badge ? `${t(label)}, ${t("tabs.unread", { n: me?.unread ?? 0 })}` : t(label)}
            onPress={press}
            style={{ minHeight: 52, flex: 1, maxWidth: 84, paddingHorizontal: 4, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: on ? colors.blueSoft : "transparent" }}
          >
            <View>
              <Icon size={21} color={on ? colors.blue : colors.muted} strokeWidth={on ? 2.2 : 1.8} />
              {badge ? <View style={{ position: "absolute", top: -1, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.bad, borderWidth: 2, borderColor: colors.card }} /> : null}
            </View>
            <T size={12} weight="bold" maxFontSizeMultiplier={1.3} adjustsFontSizeToFit minimumFontScale={0.85} style={{ color: on ? colors.blue : colors.muted, textAlign: "center" }} numberOfLines={1}>{t(label)}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
