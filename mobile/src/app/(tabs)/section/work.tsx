import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Film, ImagePlus, Link2 } from "lucide-react-native";
import { AddButton, Chips, ItemTools, LangTabs, move, ProNote, SaveBar, SectionScreen, useSaver, useSection } from "../../../components/editor";
import { Button, Card, Field, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { pickImage, pickVideo, upload } from "../../../lib/media";
import { PLATFORM_NAMES, PLATFORMS, type Platform } from "../../../lib/platforms";
import { useTheme } from "../../../lib/theme";

type FileRef = { path: string | null; url: string | null };
type Text = { brand: string; type: string };
type Brand = { name: string; logo: FileRef };
type Work = { platform: Platform | null; link: string | null; video: FileRef; thumb: FileRef; ar: Text; en: Text };
type Data = {
  langs: ("ar" | "en")[]; primary: "ar" | "en"; freeLimit: number | null;
  brands: { name: string; url: string | null }[];
  works: { platform: Platform | null; videoUrl: string | null; linkUrl: string | null; thumbUrl: string | null; ar: Text; en: Text }[];
};
const MAX_BRANDS = 30, MAX_WORKS = 30;
/** Saved files go back as their URL; new uploads as their storage path (checked again by the server). */
const ref = (f: FileRef) => (f.path ? { path: f.path, url: null } : { path: null, url: f.url });

/** Brand logos (scrolling strip on the page) and past work (uploaded video or a TikTok / Instagram / YouTube link). */
export default function WorkScreen() {
  const { t, num } = useI18n();
  const { colors } = useTheme();
  const { data, error, reload } = useSection<Data>("work");
  const brandsSaver = useSaver();
  const worksSaver = useSaver();
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  useEffect(() => {
    if (!data) return;
    setBrands(data.brands.map((b) => ({ name: b.name, logo: { path: null, url: b.url } })));
    setWorks(data.works.map((w) => ({ platform: w.platform, link: w.linkUrl, video: { path: null, url: w.videoUrl }, thumb: { path: null, url: w.thumbUrl }, ar: w.ar, en: w.en })));
    setLang(data.primary);
  }, [data]);
  const setWork = (i: number, patch: Partial<Work>) => { setWorks((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x))); worksSaver.touch(); };

  const addBrand = async () => {
    const file = await pickImage({ maxSide: 800, png: true });
    if (!file || "error" in file) return;
    setBusy("brand");
    const res = await upload("logo", file);
    setBusy(null);
    if ("path" in res) { setBrands((b) => [...(b ?? []), { name: "", logo: { path: res.path, url: file.uri } }]); brandsSaver.touch(); }
  };
  const pickWorkVideo = async (i: number) => {
    const picked = await pickVideo();
    if (!picked || "error" in picked) return;
    setBusy(`work:${i}`);
    const v = await upload("video", picked.video);
    const c = picked.cover ? await upload("thumb", picked.cover) : null;
    setBusy(null);
    if ("path" in v) setWork(i, { link: null, video: { path: v.path, url: picked.video.uri }, thumb: c && "path" in c ? { path: c.path, url: picked.cover!.uri } : works[i].thumb });
  };
  const pickCover = async (i: number) => {
    const file = await pickImage({ maxSide: 900 });
    if (!file || "error" in file) return;
    setBusy(`cover:${i}`);
    const res = await upload("thumb", file);
    setBusy(null);
    if ("path" in res) setWork(i, { thumb: { path: res.path, url: file.uri } });
  };
  const checkLink = async (i: number) => {
    const link = works[i].link?.trim();
    if (!link) return;
    setBusy(`link:${i}`);
    const res = await rpc<{ link?: string; platform?: Platform; cover?: { path: string; url: string } | null; error?: string }>("checkWorkLink", link).catch(() => ({ error: "failed" as const }));
    setBusy(null);
    if ("link" in res && res.link) setWork(i, { link: res.link, platform: res.platform ?? works[i].platform, ...(res.cover && { thumb: { path: res.cover.path, url: res.cover.url } }) });
    else worksSaver.save(async () => t("work.badLink"));
  };

  return (
    <SectionScreen title={t("section.work")} subtitle={t("work.subtitle")} loading={!brands && !error} error={error} onRetry={reload}
      footer={brands && <SaveBar onSave={() => worksSaver.save(async () => {
        const res = await rpc<{ ok?: boolean; error?: string }>("saveWorks", works.map((w) => ({ platform: w.platform, link: w.link, video: ref(w.video), thumb: ref(w.thumb), ar: w.ar, en: w.en })));
        return res.ok ? true : res.error === "bad_link" ? t("work.badLink") : res.error === "missing_file" ? t("work.missingFile") : false;
      })} status={worksSaver.status} message={worksSaver.message} />}>
      {brands && data && (
        <>
          <Card>
            <T weight="bold" size={16}>{t("work.brands")}</T>
            <T size={12.5} tone="muted">{t("work.brandsHint")}</T>
            {brands.map((b, i) => (
              <Row key={i} style={{ alignItems: "flex-end" }}>
                <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                  {b.logo.url ? <Image source={{ uri: b.logo.url }} style={{ width: 56, height: 56 }} contentFit="contain" /> : null}
                </View>
                <View style={{ flex: 1 }}><Field label={t("work.brandName")} value={b.name} maxLength={60} onChangeText={(v) => { setBrands(brands.map((x, j) => (j === i ? { ...x, name: v } : x))); brandsSaver.touch(); }} /></View>
                <ItemTools index={i} count={brands.length} onMove={(a, c) => { setBrands(move(brands, a, c)); brandsSaver.touch(); }} onRemove={() => { setBrands(brands.filter((_, j) => j !== i)); brandsSaver.touch(); }} />
              </Row>
            ))}
            {busy === "brand" && <T size={12.5} tone="muted">{t("editor.uploading")}</T>}
            <AddButton label={t("work.addBrand")} disabled={brands.length >= MAX_BRANDS || busy === "brand"} onPress={addBrand} />
            {brandsSaver.status === "saved" || brandsSaver.status === "failed" ? <T size={13} tone={brandsSaver.status === "saved" ? "good" : "bad"}>{brandsSaver.status === "saved" ? t("editor.saved") : t("editor.failed")}</T> : null}
            <Button title={t("work.saveBrands")} variant="secondary" loading={brandsSaver.status === "saving"}
              onPress={() => brandsSaver.save(async () => !!(await rpc<{ ok?: boolean }>("saveBrands", brands.filter((b) => b.name.trim()).map((b) => ({ name: b.name, ...ref(b.logo) })))).ok)} />
          </Card>

          <T weight="bold" size={16} style={{ marginTop: 8 }}>{t("work.works")}</T>
          {data.freeLimit !== null && <ProNote text={t("work.freeLimit", { n: num(data.freeLimit) })} />}
          {data.langs.length > 1 && <LangTabs value={lang} onChange={setLang} />}
          {works.map((w, i) => (
            <Card key={i}>
              <Row style={{ alignItems: "flex-start" }}>
                <Pressable accessibilityRole="button" accessibilityLabel={t("work.cover")} onPress={() => pickCover(i)}
                  style={{ width: 72, height: 110, borderRadius: 12, backgroundColor: colors.hover, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  {w.thumb.url ? <Image source={{ uri: w.thumb.url }} style={{ width: 72, height: 110 }} contentFit="cover" /> : <ImagePlus size={20} color={colors.muted} />}
                </Pressable>
                <View style={{ flex: 1, gap: 8 }}>
                  <Chips value={[w.link !== null ? "link" : "video"]} onChange={([m]) => setWork(i, m === "link" ? { link: w.link ?? "", video: { path: null, url: null } } : { link: null })}
                    options={[{ value: "video", label: t("work.video") }, { value: "link", label: t("work.link") }]} />
                  {w.link === null ? (
                    <Button title={w.video.url ? t("work.replaceVideo") : t("work.pickVideo")} variant="secondary" icon={<Film size={16} color={colors.navy} />} onPress={() => pickWorkVideo(i)} loading={busy === `work:${i}`} />
                  ) : (
                    <>
                      <Field label={t("work.postLink")} value={w.link} onChangeText={(v) => setWork(i, { link: v })} keyboardType="url" autoCapitalize="none" placeholder="https://www.tiktok.com/@…" style={{ textAlign: "left", writingDirection: "ltr" }} onEndEditing={() => checkLink(i)} />
                      <Button title={t("work.checkLink")} variant="ghost" icon={<Link2 size={16} color={colors.blue} />} onPress={() => checkLink(i)} loading={busy === `link:${i}`} />
                    </>
                  )}
                  {busy === `cover:${i}` && <T size={12.5} tone="muted">{t("editor.uploading")}</T>}
                </View>
              </Row>
              <Field label={t("work.brand")} value={w[lang].brand} maxLength={60} onChangeText={(v) => setWork(i, { [lang]: { ...w[lang], brand: v } })} />
              <Field label={t("work.type")} value={w[lang].type} maxLength={60} onChangeText={(v) => setWork(i, { [lang]: { ...w[lang], type: v } })} placeholder={t("work.typeHint")} />
              {w.link === null && (
                <Chips value={w.platform ? [w.platform] : []} onChange={([p]) => setWork(i, { platform: p })} options={PLATFORMS.slice(0, 8).map((p) => ({ value: p, label: PLATFORM_NAMES[p] }))} />
              )}
              <ItemTools index={i} count={works.length} onMove={(a, c) => { setWorks(move(works, a, c)); worksSaver.touch(); }} onRemove={() => { setWorks(works.filter((_, j) => j !== i)); worksSaver.touch(); }} />
            </Card>
          ))}
          <AddButton label={t("work.addWork")} disabled={works.length >= MAX_WORKS} onPress={() => { setWorks([...works, { platform: null, link: null, video: { path: null, url: null }, thumb: { path: null, url: null }, ar: { brand: "", type: "" }, en: { brand: "", type: "" } }]); worksSaver.touch(); }} />
        </>
      )}
    </SectionScreen>
  );
}
