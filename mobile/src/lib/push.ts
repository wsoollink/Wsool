import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";
import { storage } from "./storage";

/**
 * Phone notifications: asks permission once signed in, registers this phone's
 * Expo push token with the website (the server pushes every bell notification
 * to it). Skipped in the web preview and simulators.
 */
const TOKEN_KEY = "wsool.pushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function registerPush() {
  try {
    if (Platform.OS === "web" || !Device.isDevice) return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", { name: "Wsool", importance: Notifications.AndroidImportance.DEFAULT });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return; // set once the Expo (EAS) project exists
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api("/push-tokens", { method: "POST", body: { token, platform: Platform.OS } });
    await storage.set(TOKEN_KEY, token);
  } catch (err) {
    console.warn("[push] register failed", err);
  }
}

/** Before signing out: this phone stops getting the account's pushes. */
export async function unregisterPush() {
  try {
    const token = await storage.get(TOKEN_KEY);
    if (!token) return;
    await api("/push-tokens", { method: "DELETE", body: { token } }).catch(() => {});
    await storage.remove(TOKEN_KEY);
  } catch {}
}

/** Website paths in notifications → app screens. */
export function appRoute(href: string | undefined | null): string {
  if (!href) return "/";
  const section = href.match(/^\/dashboard\/([a-z]+)/)?.[1];
  if (!section) return "/";
  if (section === "notifications") return "/notifications";
  if (section === "analytics") return "/insights";
  if (section === "referrals" || section === "subscription") return `/account/${section}`;
  return `/page/${section}`;
}
