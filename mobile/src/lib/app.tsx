import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DevSettings, I18nManager, Platform, Pressable, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { I18nProvider, useI18n, type Lang } from "../i18n";
import { T } from "../components/ui";
import { api, ApiError, loadSession, onSessionChange, setApiLang, setSession, type Session } from "./api";
import { registerPush, unregisterPush } from "./push";
import { storage } from "./storage";
import { DARK, LIGHT, ThemeContext, type ThemeMode } from "./theme";

export type Me = {
  user: { id: string; email: string };
  page: { username: string; published: boolean; photoUrl: string | null; name: string | null; primaryLang: string; enEnabled: boolean } | null;
  plan: { label: "pro" | "trial" | "free"; pro: boolean; status: string; trialDaysLeft: number; periodEnd: string | null; cancelAtPeriodEnd: boolean };
  unread: number;
};

type AuthState = {
  status: "loading" | "signedOut" | "signedIn";
  me: Me | null;
  /** Network/server problem while loading the account (shown with a retry). */
  error: string | null;
  signIn: (s: Session) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AppProvider");
  return ctx;
};

const LANG_KEY = "wsool.lang";
const THEME_KEY = "wsool.theme";

const DIR_RELOAD_KEY = "wsool.dirReload";

/**
 * Arabic layouts are right-to-left: native apps switch direction with one
 * reload, the web preview sets <html dir>. Returns true when the direction
 * still doesn't match (the app then asks for a restart instead of reloading
 * again: a reload loop showed a blank screen on Android).
 */
async function applyDirection(lang: Lang): Promise<boolean> {
  const rtl = lang === "ar";
  if (Platform.OS === "web") {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    return false;
  }
  if (I18nManager.isRTL === rtl) {
    await storage.remove(DIR_RELOAD_KEY);
    return false;
  }
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(rtl);
  if ((await storage.get(DIR_RELOAD_KEY)) === lang) return true;
  await storage.set(DIR_RELOAD_KEY, lang);
  try { await Updates.reloadAsync(); } catch { try { DevSettings.reload(); } catch {} }
  return true;
}

/** Shown when the layout direction needs a full restart of the app. */
function RestartNotice({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { colors } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 80, padding: 14, borderRadius: 14, backgroundColor: colors.navy, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <T size={13} style={{ flex: 1, color: colors.bg }}>{t("common.restartForDirection")}</T>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={12} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
        <T size={18} style={{ color: colors.bg }}>✕</T>
      </Pressable>
    </View>
  );
}

/** Everything the screens share: language, theme, session and the signed-in account. */
export function AppProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [lang, setLangState] = useState<Lang | null>(null);
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restart, setRestart] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      setError(null);
      setMe(await api<Me>("/me"));
      setStatus("signedIn");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await setSession(null);
        setStatus("signedOut");
      } else {
        setError(err instanceof ApiError ? err.code : "network");
        setStatus("signedIn");
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = (await storage.get(LANG_KEY)) as Lang | null;
      // Arabic first (CLAUDE.md section 3); English is one tap away in More.
      const l: Lang = stored === "en" ? "en" : "ar";
      setApiLang(l);
      setRestart(await applyDirection(l));
      setLangState(l);
      const t = (await storage.get(THEME_KEY)) as ThemeMode | null;
      if (t) setModeState(t);
      if (await loadSession()) await refreshMe();
      else setStatus("signedOut");
    })();
    return onSessionChange((s) => { if (!s) { setMe(null); setStatus("signedOut"); } });
  }, [refreshMe]);

  useEffect(() => { if (status === "signedIn" && me) registerPush(); }, [status, me?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLang = useCallback((l: Lang) => {
    storage.set(LANG_KEY, l).then(() => { setApiLang(l); setLangState(l); applyDirection(l).then(setRestart); });
  }, []);
  const setMode = useCallback((m: ThemeMode) => { setModeState(m); storage.set(THEME_KEY, m); }, []);

  const auth = useMemo<AuthState>(() => ({
    status, me, error, refreshMe,
    signIn: async (s) => { await setSession(s); await refreshMe(); },
    signOut: async () => { await unregisterPush(); await setSession(null); },
  }), [status, me, error, refreshMe]);

  const dark = mode === "dark" || (mode === "system" && scheme === "dark");
  const theme = useMemo(() => ({ colors: dark ? DARK : LIGHT, dark, mode, setMode }), [dark, mode, setMode]);

  if (!lang) return null;
  return (
    <ThemeContext.Provider value={theme}>
      <I18nProvider lang={lang} setLang={setLang}>
        <AuthContext.Provider value={auth}>
          {children}
          {restart && <RestartNotice onClose={() => setRestart(false)} />}
        </AuthContext.Provider>
      </I18nProvider>
    </ThemeContext.Provider>
  );
}
