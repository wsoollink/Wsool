import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Logo } from "../components/Logo";
import { Button, Field, T } from "../components/ui";
import { useI18n } from "../i18n";
import { ApiError, publicApi, type Session } from "../lib/api";
import { useAuth } from "../lib/app";
import { APPLE_SIGN_IN, SITE_URL } from "../lib/config";
import { useTheme } from "../lib/theme";

const ERRORS = ["invalid_email", "invalid_code", "rate_limited", "provider_failed"];

/** Sign in with a one-time code by email (same accounts as the website); Apple when enabled. */
export default function Login() {
  const { t } = useI18n();
  const { dark, colors } = useTheme();
  const { status, signIn } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "signedIn") return <Redirect href="/" />;
  const fail = (err: unknown) => {
    const c = err instanceof ApiError ? err.code : "failed";
    setError(t(`login.errors.${ERRORS.includes(c) ? c : "failed"}`));
  };

  const send = async () => {
    setBusy(true); setError(null);
    try {
      await publicApi("/auth/otp", { email: email.trim() });
      setStep("code");
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setError(null);
    try {
      await signIn(await publicApi<Session>("/auth/verify", { email: email.trim(), code: code.trim() }));
    } catch (err) { fail(err); } finally { setBusy(false); }
  };
  const apple = async () => {
    try {
      const nonce = Crypto.randomUUID();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
      const cred = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL, AppleAuthentication.AppleAuthenticationScope.FULL_NAME], nonce: hashed });
      if (!cred.identityToken) return;
      setBusy(true);
      await signIn(await publicApi<Session>("/auth/id-token", { provider: "apple", idToken: cred.identityToken, nonce }));
    } catch (err) {
      if ((err as { code?: string }).code !== "ERR_REQUEST_CANCELED") fail(err);
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#021941", overflow: "hidden" }}>
      <View pointerEvents="none" style={{ position: "absolute", top: -120, right: -100, width: 380, height: 380, borderRadius: 190, backgroundColor: "rgba(34,184,240,0.20)" }} />
      <View pointerEvents="none" style={{ position: "absolute", top: 120, left: -140, width: 320, height: 320, borderRadius: 160, backgroundColor: "rgba(10,108,255,0.30)" }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <SafeAreaView edges={["top"]} style={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32, gap: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
            <Logo height={40} onDark />
            <T weight="black" size={32} style={{ color: "#FFFFFF" }}>{t("login.headline")}</T>
            <T size={15} style={{ color: "rgba(255,255,255,0.8)" }}>{t("login.tagline")}</T>
          </SafeAreaView>
          <SafeAreaView edges={["bottom", "left", "right"]} style={{ backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}>
            <View style={{ padding: 22, paddingBottom: 18, gap: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
              <View style={{ gap: 2 }}>
                <T weight="bold" size={20}>{t("login.title")}</T>
                <T tone="muted" size={14}>{step === "email" ? t("login.subtitle") : `${t("login.codeSent")} ${email.trim()}`}</T>
              </View>

              {step === "email" && APPLE_SIGN_IN && Platform.OS === "ios" && (
                <>
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                    buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={16} style={{ height: 50 }} onPress={apple}
                  />
                  <T size={13} tone="muted" style={{ textAlign: "center" }}>{t("login.or")}</T>
                </>
              )}

              {step === "email" ? (
                <>
                  <Field
                    label={t("login.email")} value={email} onChangeText={(v) => { setEmail(v); setError(null); }}
                    keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
                    placeholder="name@email.com" style={{ textAlign: "left", writingDirection: "ltr" }} returnKeyType="send" onSubmitEditing={send} error={error}
                  />
                  <Button title={busy ? t("login.sending") : t("login.sendCode")} onPress={send} loading={busy} disabled={!email.includes("@")} style={{ minHeight: 52 }} />
                </>
              ) : (
                <>
                  <Field
                    label={t("login.code")} value={code} onChangeText={(v) => { setCode(v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "").slice(0, 10)); setError(null); }}
                    keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10}
                    style={{ textAlign: "center", letterSpacing: 6, fontSize: 22 }} returnKeyType="go" onSubmitEditing={verify} error={error} autoFocus
                  />
                  <Button title={busy ? t("login.verifying") : t("login.verify")} onPress={verify} loading={busy} disabled={code.length < 6} style={{ minHeight: 52 }} />
                  <Button title={t("login.changeEmail")} variant="ghost" onPress={() => { setStep("email"); setCode(""); setError(null); }} />
                </>
              )}
              <T size={12.5} tone="muted" style={{ textAlign: "center" }}>
                {t("login.agree")}{"\n"}
                <T size={12.5} tone="blue" onPress={() => Linking.openURL(`${SITE_URL}/terms`)} accessibilityRole="link">{t("login.terms")}</T>
                {"  ·  "}
                <T size={12.5} tone="blue" onPress={() => Linking.openURL(`${SITE_URL}/privacy`)} accessibilityRole="link">{t("login.privacy")}</T>
              </T>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
