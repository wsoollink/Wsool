import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { ImagePlus } from "lucide-react-native";
import { AddButton, ItemTools, move, ProNote, SaveBar, SectionScreen, useSaver, useSection } from "../../../components/editor";
import { Card, Field, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { pickImage, upload } from "../../../lib/media";
import { useTheme } from "../../../lib/theme";

type FileRef = { path: string | null; url: string | null };
type Link = { title: string; titleEn: string; url: string; image: FileRef };
type Service = { name: string; nameEn: string; description: string; descriptionEn: string; price: string; unit: string; unitEn: string };
type Data = {
  showEnglish: boolean; currency: string; freeLimits: { links: number; services: number } | null;
  links: { title: string; titleEn: string; url: string; imageUrl: string | null }[]; services: Service[];
};
const MAX_LINKS = 10, MAX_SERVICES = 12;

/** "My links" (store, course, map…) and "My services" (non-ad work with an optional price). */
export default function Links() {
  const { t, num } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("links");
  const { status, message, save, touch, dirty } = useSaver();
  const [links, setLinks] = useState<Link[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  useEffect(() => {
    if (!data) return;
    setLinks(data.links.map((l) => ({ title: l.title, titleEn: l.titleEn, url: l.url, image: { path: null, url: l.imageUrl } })));
    setServices(data.services);
  }, [data]);
  const setLink = (i: number, patch: Partial<Link>) => { setLinks((l) => l && l.map((x, j) => (j === i ? { ...x, ...patch } : x))); touch(); };
  const setService = (i: number, patch: Partial<Service>) => { setServices((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x))); touch(); };

  const pickLinkImage = async (i: number) => {
    const file = await pickImage({ maxSide: 800 });
    if (!file || "error" in file) return;
    setUploading(i);
    const res = await upload("linkImage", file);
    setUploading(null);
    if ("path" in res) setLink(i, { image: { path: res.path, url: file.uri } });
  };
  const onSave = () => save(async () => {
    const res = await rpc<{ ok?: boolean; error?: string; index?: number }>("saveLinksAndServices",
      (links ?? []).map((l) => ({ ...l, image: l.image.path ? { path: l.image.path, url: null } : { path: null, url: l.image.url } })), services);
    if (res.error === "invalid_url") return t("links.badUrl", { n: num((res.index ?? 0) + 1) });
    return !!res.ok;
  });

  return (
    <SectionScreen title={t("section.links")} dirty={dirty} subtitle={t("links.subtitle")} loading={!links && !error} error={error} onRetry={reload}
      footer={links && <SaveBar onSave={onSave} status={status} message={message} />}>
      {links && data && (
        <>
          {data.freeLimits && <ProNote text={t("links.freeLimit", { links: num(data.freeLimits.links), services: num(data.freeLimits.services) })} />}
          <T weight="bold" size={16}>{t("links.links")}</T>
          {links.map((l, i) => (
            <Card key={i}>
              <Row style={{ justifyContent: "space-between" }}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("links.image")} onPress={() => pickLinkImage(i)}
                  style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.hover, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {l.image.url ? <Image source={{ uri: l.image.url }} style={{ width: 56, height: 56 }} /> : <ImagePlus size={20} color={colors.muted} />}
                </Pressable>
                <ItemTools index={i} count={links.length} onMove={(a, b) => { setLinks(move(links, a, b)); touch(); }} onRemove={() => { setLinks(links.filter((_, j) => j !== i)); touch(); }} />
              </Row>
              {uploading === i && <T size={12.5} tone="muted">{t("editor.uploading")}</T>}
              <Field label={t("links.title")} value={l.title} onChangeText={(v) => setLink(i, { title: v })} maxLength={60} />
              {data.showEnglish && <Field label={t("links.titleEn")} value={l.titleEn} onChangeText={(v) => setLink(i, { titleEn: v })} maxLength={60} style={{ textAlign: "left", writingDirection: "ltr" }} />}
              <Field label={t("links.url")} value={l.url} onChangeText={(v) => setLink(i, { url: v })} keyboardType="url" autoCapitalize="none" placeholder="https://" style={{ textAlign: "left", writingDirection: "ltr" }} />
            </Card>
          ))}
          <AddButton label={t("links.addLink")} disabled={links.length >= MAX_LINKS} onPress={() => { setLinks([...links, { title: "", titleEn: "", url: "", image: { path: null, url: null } }]); touch(); }} />

          <T weight="bold" size={16} style={{ marginTop: 8 }}>{t("links.services")}</T>
          {services.map((s, i) => (
            <Card key={i}>
              <View style={{ alignItems: "flex-end" }}>
                <ItemTools index={i} count={services.length} onMove={(a, b) => { setServices(move(services, a, b)); touch(); }} onRemove={() => { setServices(services.filter((_, j) => j !== i)); touch(); }} />
              </View>
              <Field label={t("links.serviceName")} value={s.name} onChangeText={(v) => setService(i, { name: v })} maxLength={60} />
              <Field label={t("links.description")} value={s.description} onChangeText={(v) => setService(i, { description: v })} maxLength={300} multiline style={{ minHeight: 80, textAlignVertical: "top", paddingTop: 10 }} />
              <Row style={{ alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}><Field label={t("links.price", { currency: data.currency })} value={s.price} onChangeText={(v) => setService(i, { price: v })} keyboardType="decimal-pad" placeholder={t("links.onRequest")} /></View>
                <View style={{ flex: 1 }}><Field label={t("links.unit")} value={s.unit} onChangeText={(v) => setService(i, { unit: v })} maxLength={30} placeholder={t("links.unitHint")} /></View>
              </Row>
              {data.showEnglish && (
                <>
                  <Field label={t("links.serviceNameEn")} value={s.nameEn} onChangeText={(v) => setService(i, { nameEn: v })} maxLength={60} style={{ textAlign: "left", writingDirection: "ltr" }} />
                  <Field label={t("links.descriptionEn")} value={s.descriptionEn} onChangeText={(v) => setService(i, { descriptionEn: v })} maxLength={300} multiline style={{ minHeight: 80, textAlignVertical: "top", paddingTop: 10, textAlign: "left", writingDirection: "ltr" }} />
                  <Field label={t("links.unitEn")} value={s.unitEn} onChangeText={(v) => setService(i, { unitEn: v })} maxLength={30} style={{ textAlign: "left", writingDirection: "ltr" }} />
                </>
              )}
            </Card>
          ))}
          <AddButton label={t("links.addService")} disabled={services.length >= MAX_SERVICES} onPress={() => { setServices([...services, { name: "", nameEn: "", description: "", descriptionEn: "", price: "", unit: "", unitEn: "" }]); touch(); }} />
        </>
      )}
    </SectionScreen>
  );
}
