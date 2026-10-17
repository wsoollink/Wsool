import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * Small key/value storage: the phone's encrypted keychain/keystore on iOS and
 * Android (session tokens live here), localStorage in the web preview.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.setItem(key, value); } catch {}
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.removeItem(key); } catch {}
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
