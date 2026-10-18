import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Redirect, router } from "expo-router";
import { Logo } from "../components/Logo";
import { Button, Card, Field, Screen, T } from "../components/ui";
import { useI18n } from "../i18n";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/app";
import { align } from "../lib/theme";

const ERRORS = ["length", "characters", "dots", "reserved", "extension", "taken"];
/** Same rule as the website (src/config/usernames.ts): lowercase as you type. */
const normalize = (v: string) => v.trim().toLowerCase().replace(/^@/, "").slice(0, 20);

/** Claim your username (= wsool.link/<username>), checked live with the server. */
export default function Onboarding() {
  const { t } = useI18n();
  const { status, me, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [check, setCheck] = useState<{ name: string; error: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (name.length < 3) { setCheck(null); return; }
    timer.current = setTimeout(async () => {
      try { setCheck(await api<{ name: string; error: string | null }>(`/username?name=${encodeURIComponent(name)}`)); } catch {}
    }, 400);
    return () => clearTimeout(timer.current);
  }, [name]);

  if (status === "signedOut") return <Redirect href="/login" />;
  if (me?.page) return <Redirect href="/home" />;

  const errorText = (code: string | null | undefined) => (code ? t(`onboarding.errors.${ERRORS.includes(code) ? code : "failed"}`) : null);
  const ok = check?.name === name && !check.error;
  const claim = async () => {
    setBusy(true); setFailed(null);
    try {
      await api("/onboarding", { method: "POST", body: { username: name } });
      await refreshMe();
      router.replace("/home");
    } catch (err) {
      setFailed(errorText(err instanceof ApiError ? err.code : "failed"));
    } finally { setBusy(false); }
  };

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", maxWidth: 480, width: "100%", alignSelf: "center" }}>
      <View style={{ alignItems: "center", marginBottom: 8 }}><Logo height={40} /></View>
      <Card style={{ gap: 16, padding: 20 }}>
        <View style={{ gap: 2 }}>
          <T weight="bold" size={22}>{t("onboarding.title")}</T>
          <T tone="muted">{t("onboarding.subtitle")}</T>
        </View>
        <View style={{ direction: "ltr" }}>
          <T size={13} tone="faint" style={{ textAlign: align("left"), writingDirection: "ltr" }}>wsool.link/<T size={13} weight="bold" style={{ textAlign: align("left") }}>{name || "username"}</T></T>
        </View>
        <Field
          label={t("onboarding.label")} value={name} onChangeText={(v) => { setName(normalize(v)); setFailed(null); }}
          autoCapitalize="none" autoCorrect={false} maxLength={20} style={{ textAlign: "left", writingDirection: "ltr" }}
          hint={name.length < 3 ? t("onboarding.rules") : check?.name !== name ? t("onboarding.checking") : ok ? t("onboarding.available") : null}
          error={failed ?? (check?.name === name ? errorText(check.error) : null)}
          returnKeyType="done" onSubmitEditing={() => ok && claim()}
        />
        <Button title={busy ? t("onboarding.saving") : t("onboarding.submit")} onPress={claim} loading={busy} disabled={!ok} />
      </Card>
    </Screen>
  );
}
