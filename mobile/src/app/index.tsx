import { Redirect } from "expo-router";
import { Status } from "../components/ui";
import { useI18n } from "../i18n";
import { useAuth } from "../lib/app";

/** Start: sign-in, onboarding (no page yet) or the dashboard. */
export default function Index() {
  const { status, me, error, refreshMe } = useAuth();
  const { t } = useI18n();
  if (status === "loading") return <Status loading />;
  if (status === "signedOut") return <Redirect href="/login" />;
  if (!me) return <Status error={error === "network" ? t("common.offline") : t("common.error")} onRetry={refreshMe} />;
  if (!me.page) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
