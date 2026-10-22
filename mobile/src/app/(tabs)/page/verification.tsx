import { useState } from "react";
import { View } from "react-native";
import { BadgeCheck, Camera } from "lucide-react-native";
import { PlatformIcon } from "../../../components/PlatformIcon";
import { ProNote, SectionScreen, useSection } from "../../../components/editor";
import { Button, Card, Pill, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { pickImage, upload } from "../../../lib/media";
import { PLATFORM_NAMES, type Platform } from "../../../lib/platforms";
import { useTheme } from "../../../lib/theme";

type Status = "none" | "in_review" | "verified" | "expiring" | "expired" | "rejected";
type Account = { id: string; platform: Platform; handle: string; followers: number; status: Status; verifiedUntil: string | null; daysLeft: number; pendingSince: string | null; rejectReason: string | null };
type License = { id: string; name: string; number: string; hasFile: boolean; rejectReason: string | null; status: "none" | "in_review" | "verified" | "rejected" };
type Data = { isPro: boolean; accounts: Account[]; licenses: License[] };
type Check = { skipped: true; reason: string } | { skipped?: false; readId: string; read: { followers: number | null; username: string | null }; comparison: { overall: "match" | "check" | "unreadable"; followers: string; username: string } };
type Draft = { accountId: string; path: string; check: Check | null };
const TONE = { verified: "good", expiring: "warn", in_review: "blue", rejected: "bad", expired: "grey", none: "grey" } as const;

/**
 * Verify each account with a screenshot of its profile (username + followers).
 * The AI reads it first so the creator can fix a wrong number before sending;
 * staff decide within 48h. Licenses with a file can be sent too.
 */
export default function Verification() {
  const { t, num, date } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("verification");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; tone: "good" | "bad" | "muted" } | null>(null);

  const start = async (a: Account) => {
    const file = await pickImage({ maxSide: 2400 });
    if (!file || "error" in file) return;
    setBusy(a.id); setMessage(null);
    const up = await upload("verification", file);
    if (!("path" in up)) { setBusy(null); return setMessage({ id: a.id, text: t("verify.uploadFailed"), tone: "bad" }); }
    setDraft({ accountId: a.id, path: up.path, check: null });
    const check = await rpc<Check>("checkScreenshot", a.id, up.path).catch(() => null);
    setDraft({ accountId: a.id, path: up.path, check });
    setBusy(null);
  };
  const useRead = async () => {
    if (!draft?.check || draft.check.skipped) return;
    setBusy(draft.accountId);
    const res = await rpc<{ ok?: boolean; followers?: number }>("applyReadFollowers", draft.check.readId).catch(() => ({ ok: false }));
    setBusy(null);
    if (res.ok) { setMessage({ id: draft.accountId, text: t("verify.followersUpdated"), tone: "good" }); reload(); }
  };
  const send = async () => {
    if (!draft) return;
    setBusy(draft.accountId);
    const readId = draft.check && !draft.check.skipped ? draft.check.readId : null;
    const res = await rpc<{ ok?: boolean }>("submitVerification", draft.accountId, draft.path, readId).catch(() => ({ ok: false }));
    setBusy(null);
    setMessage({ id: draft.accountId, text: res.ok ? t("verify.sent") : t("editor.failed"), tone: res.ok ? "good" : "bad" });
    if (res.ok) { setDraft(null); reload(); }
  };
  const act = async (id: string, action: string) => {
    setBusy(id);
    const res = await rpc<{ ok?: boolean }>(action, id).catch(() => ({ ok: false }));
    setBusy(null);
    if (!res.ok) setMessage({ id, text: t("editor.failed"), tone: "bad" });
    reload();
  };
  const reason = (code: string | null) => (code ? t(`verify.reasons.${code}`) : null);

  return (
    <SectionScreen title={t("section.verification")} subtitle={t("verify.subtitle")} loading={!data && !error} error={error} onRetry={reload}>
      {data && (
        <>
          {!data.isPro && <ProNote text={t("verify.freeNote")} />}
          {data.accounts.length === 0 && <Card><T tone="muted">{t("verify.noAccounts")}</T></Card>}
          {data.accounts.map((a) => {
            const mine = draft?.accountId === a.id ? draft : null;
            const check = mine?.check;
            const canStart = a.status === "none" || a.status === "rejected" || a.status === "expired" || a.status === "expiring";
            return (
              <Card key={a.id}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Row style={{ flexShrink: 1 }}>
                    <PlatformIcon platform={a.platform} size={22} color={colors.navy} />
                    <View style={{ flexShrink: 1 }}>
                      <T weight="bold">{PLATFORM_NAMES[a.platform]}</T>
                      <T size={12.5} tone="muted" style={{ writingDirection: "ltr" }}>@{a.handle} · {num(a.followers)}</T>
                    </View>
                  </Row>
                  <Pill tone={TONE[a.status]}>{t(`home.vstatus.${a.status}`)}</Pill>
                </Row>
                {a.status === "verified" && a.verifiedUntil && <T size={12.5} tone="muted">{t("verify.until", { date: date(a.verifiedUntil, { day: "numeric", month: "long", year: "numeric" }) })}</T>}
                {a.status === "expiring" && <T size={12.5} tone="warn">{t("verify.expiring", { n: num(a.daysLeft) })}</T>}
                {a.status === "in_review" && <T size={12.5} tone="muted">{t("verify.inReview")}</T>}
                {a.status === "rejected" && a.rejectReason && <T size={12.5} tone="bad">{reason(a.rejectReason)}</T>}

                {mine ? (
                  <View style={{ gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.hover }}>
                    {!check ? <T tone="muted">{t("verify.reading")}</T>
                      : check.skipped ? <T tone="muted">{t("verify.noRead")}</T>
                      : check.comparison.overall === "match" ? <T tone="good" weight="bold">{t("verify.match")}</T>
                      : check.comparison.overall === "unreadable" ? <T tone="warn">{t("verify.unreadable")}</T>
                      : (
                        <>
                          <T tone="warn" weight="bold">{t("verify.differs")}</T>
                          {check.comparison.followers !== "match" && check.read.followers !== null && (
                            <Button title={t("verify.useRead", { n: num(check.read.followers) })} variant="secondary" onPress={useRead} loading={busy === a.id} />
                          )}
                        </>
                      )}
                    <Button title={t("verify.send")} onPress={send} loading={busy === a.id && !!check} disabled={!check && busy === a.id} />
                    <Button title={t("verify.cancelDraft")} variant="ghost" onPress={() => setDraft(null)} />
                  </View>
                ) : canStart ? (
                  <Button title={busy === a.id ? t("editor.uploading") : a.status === "expiring" || a.status === "expired" ? t("verify.renew") : t("verify.start")} icon={<Camera size={16} color={colors.onBlue} />} onPress={() => start(a)} loading={busy === a.id} />
                ) : a.status === "in_review" ? (
                  <Button title={t("verify.cancel")} variant="secondary" onPress={() => act(a.id, "cancelVerification")} loading={busy === a.id} />
                ) : null}
                {message?.id === a.id && <T size={13} tone={message.tone}>{message.text}</T>}
              </Card>
            );
          })}
          <T size={12.5} tone="muted">{t("verify.howTo")}</T>

          {data.licenses.length > 0 && <T weight="bold" size={16} style={{ marginTop: 8 }}>{t("verify.licenses")}</T>}
          {data.licenses.map((l) => (
            <Card key={l.id}>
              <Row style={{ justifyContent: "space-between" }}>
                <Row style={{ flexShrink: 1 }}><BadgeCheck size={20} color={colors.navy} /><View style={{ flexShrink: 1 }}><T weight="bold">{l.name}</T><T size={12.5} tone="muted">{l.number}</T></View></Row>
                <Pill tone={TONE[l.status]}>{t(`home.vstatus.${l.status}`)}</Pill>
              </Row>
              {l.status === "rejected" && l.rejectReason && <T size={12.5} tone="bad">{reason(l.rejectReason)}</T>}
              {!l.hasFile && l.status !== "verified" ? <T size={12.5} tone="muted">{t("verify.licenseNeedsFile")}</T>
                : l.status === "none" || l.status === "rejected" ? <Button title={t("verify.sendLicense")} variant="secondary" onPress={() => act(l.id, "submitLicense")} loading={busy === l.id} />
                : l.status === "in_review" ? <Button title={t("verify.cancel")} variant="ghost" onPress={() => act(l.id, "cancelLicense")} loading={busy === l.id} /> : null}
              {message?.id === l.id && <T size={13} tone={message.tone}>{message.text}</T>}
            </Card>
          ))}
        </>
      )}
    </SectionScreen>
  );
}
