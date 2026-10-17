import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, View } from "react-native";
import { Redirect } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { Logo } from "../components/Logo";
import { Button, Card, Field, Screen, T } from "../components/ui";
import { useI18n } from "../i18n";
import { ApiError, publicApi, type Session } from "../lib/api";
import { useAuth } from "../lib/app";
import { APPLE_SIGN_IN, SITE_URL } from "../lib/config";
import { useTheme } from "../lib/theme";

const ERRORS = ["invalid_email", "invalid_code", "rate_limited", "provider_failed"];

/** Sign in with a one-time code by email (same accounts as the website); Apple when enabled. */
export default function Login() {
  const { t } = useI18n();
  const { dark } = useTheme();
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", maxWidth: 480, width: "100%", alignSelf: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 8 }}><Logo height={40} /></View>
        <Card style={{ gap: 16, padding: 20 }}>
          <View style={{ gap: 2 }}>
            <T weight="bold" size={22}>{t("login.title")}</T>
            <T tone="muted">{step === "email" ? t("login.subtitle") : `${t("login.codeSent")} ${email.trim()}`}</T>
          </View>

          {step === "email" && APPLE_SIGN_IN && Platform.OS === "ios" && (
            <>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={999} style={{ height: 48 }} onPress={apple}
              />
              <T size={13} tone="muted" style={{ textAlign: "center" }}>{t("login.or")}</T>
            </>
          )}

          {step === "email" ? (
            <>
              <Field
                label={t("login.email")} value={email} onChangeText={(v) => { setEmail(v); setError(null); }}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress"
                style={{ textAlign: "left", writingDirection: "ltr" }} returnKeyType="send" onSubmitEditing={send} error={error}
              />
              <Button title={busy ? t("login.sending") : t("login.sendCode")} onPress={send} loading={busy} disabled={!email.includes("@")} />
            </>
          ) : (
            <>
              <Field
                label={t("login.code")} value={code} onChangeText={(v) => { setCode(v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "").slice(0, 10)); setError(null); }}
                keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10}
                style={{ textAlign: "center", letterSpacing: 6, fontSize: 22 }} returnKeyType="go" onSubmitEditing={verify} error={error} autoFocus
              />
              <Button title={busy ? t("login.verifying") : t("login.verify")} onPress={verify} loading={busy} disabled={code.length < 6} />
              <Button title={t("login.changeEmail")} variant="ghost" onPress={() => { setStep("email"); setCode(""); setError(null); }} />
            </>
          )}
        </Card>
        <T size={12.5} tone="muted" style={{ textAlign: "center" }}>
          {t("login.agree")}{"\n"}
          <T size={12.5} tone="blue" onPress={() => Linking.openURL(`${SITE_URL}/terms`)} accessibilityRole="link">{t("login.terms")}</T>
          {"  ·  "}
          <T size={12.5} tone="blue" onPress={() => Linking.openURL(`${SITE_URL}/privacy`)} accessibilityRole="link">{t("login.privacy")}</T>
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}
