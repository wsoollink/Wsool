import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { Image } from "expo-image";
import { Store } from "lucide-react-native";
import { AddButton, ItemTools, move, ProNote, SaveBar, SectionScreen, useSaver, useSection } from "../../../components/editor";
import { Card, Field, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { pickImage, upload } from "../../../lib/media";
import { useTheme } from "../../../lib/theme";

type FileRef = { path: string | null; url: string | null };
type Coupon = { store: string; storeEn: string; description: string; descriptionEn: string; code: string; url: string; expiresOn: string; logo: FileRef };
type Data = {
  showEnglish: boolean; freeLimit: number | null;
  coupons: (Omit<Coupon, "logo"> & { logoUrl: string | null })[];
};
const MAX_COUPONS = 10;
const ltr = { textAlign: "left" as const, writingDirection: "ltr" as const };

/** "Discount coupons": the store's logo and name, the discount, the code, the tracking link, an optional end date. */
export default function Coupons() {
  const { t, num } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("coupons");
  const { status, message, save, touch } = useSaver();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  useEffect(() => {
    if (data) setCoupons(data.coupons.map(({ logoUrl, ...c }) => ({ ...c, logo: { path: null, url: logoUrl } })));
  }, [data]);
  const set = (i: number, patch: Partial<Coupon>) => { setCoupons((l) => l && l.map((x, j) => (j === i ? { ...x, ...patch } : x))); touch(); };

  const pickLogo = async (i: number) => {
    const file = await pickImage({ maxSide: 400 });
    if (!file || "error" in file) return;
    setUploading(i);
    const res = await upload("couponLogo", file);
    setUploading(null);
    if ("path" in res) set(i, { logo: { path: res.path, url: file.uri } });
  };
  const onSave = () => save(async () => {
    const res = await rpc<{ ok?: boolean; error?: string; index?: number }>("saveCoupons",
      (coupons ?? []).map((c) => ({ ...c, code: c.code.replace(/\s+/g, ""), logo: c.logo.path ? { path: c.logo.path, url: null } : { path: null, url: c.logo.url } })));
    const n = num((res.index ?? 0) + 1);
    if (res.error === "invalid_url") return t("coupons.badUrl", { n });
    if (res.error === "invalid_code") return t("coupons.badCode", { n });
    return !!res.ok;
  });

  return (
    <SectionScreen title={t("section.coupons")} subtitle={t("coupons.subtitle")} loading={!coupons && !error} error={error} onRetry={reload}
      footer={coupons && <SaveBar onSave={onSave} status={status} message={message} />}>
      {coupons && data && (
        <>
          {data.freeLimit !== null && coupons.length > data.freeLimit && <ProNote text={t("coupons.freeLimit", { n: num(data.freeLimit) })} />}
          {coupons.map((c, i) => (
            <Card key={i}>
              <Row style={{ justifyContent: "space-between" }}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("coupons.logo")} onPress={() => pickLogo(i)}
                  style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {c.logo.url ? <Image source={{ uri: c.logo.url }} style={{ width: 48, height: 48 }} contentFit="contain" /> : <Store size={22} color="#56607A" />}
                </Pressable>
                <ItemTools index={i} count={coupons.length} onMove={(a, b) => { setCoupons(move(coupons, a, b)); touch(); }} onRemove={() => { setCoupons(coupons.filter((_, j) => j !== i)); touch(); }} />
              </Row>
              {uploading === i && <T size={12.5} tone="muted">{t("editor.uploading")}</T>}
              <Field label={t("coupons.store")} value={c.store} onChangeText={(v) => set(i, { store: v })} maxLength={40} placeholder={t("coupons.storePh")} />
              <Field label={t("coupons.description")} value={c.description} onChangeText={(v) => set(i, { description: v })} maxLength={120} placeholder={t("coupons.descriptionPh")} />
              <Field label={t("coupons.code")} value={c.code} onChangeText={(v) => set(i, { code: v.replace(/\s+/g, "") })} maxLength={30} autoCapitalize="characters" autoCorrect={false} placeholder="IBRAHIM10" style={{ ...ltr, letterSpacing: 1.5, fontWeight: "700" }} />
              <Field label={t("coupons.url")} value={c.url} onChangeText={(v) => set(i, { url: v })} keyboardType="url" autoCapitalize="none" autoCorrect={false} placeholder="https://" style={ltr} />
              <Field label={t("coupons.expires")} hint={t("coupons.expiresHint")} value={c.expiresOn} onChangeText={(v) => set(i, { expiresOn: v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9-]/g, "").slice(0, 10) })} keyboardType="numbers-and-punctuation" placeholder="2026-12-31" style={ltr} />
              {data.showEnglish && (
                <>
                  <Field label={t("coupons.storeEn")} value={c.storeEn} onChangeText={(v) => set(i, { storeEn: v })} maxLength={40} style={ltr} />
                  <Field label={t("coupons.descriptionEn")} value={c.descriptionEn} onChangeText={(v) => set(i, { descriptionEn: v })} maxLength={120} style={ltr} />
                </>
              )}
            </Card>
          ))}
          <AddButton label={t("coupons.add")} disabled={coupons.length >= MAX_COUPONS}
            onPress={() => { setCoupons([...coupons, { store: "", storeEn: "", description: "", descriptionEn: "", code: "", url: "", expiresOn: "", logo: { path: null, url: null } }]); touch(); }} />
          <T size={12.5} tone="muted">{t("coupons.disclosure")}</T>
        </>
      )}
    </SectionScreen>
  );
}
