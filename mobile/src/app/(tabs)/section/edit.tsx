import { useEffect, useState, type ReactNode } from "react";
import { Linking, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Camera, FileText, X } from "lucide-react-native";
import { AddButton, Chips, ItemTools, LangTabs, move, SectionScreen, SwitchRow, useSaver, useSection, type SaveStatus } from "../../../components/editor";
import { Button, Card, Field, Pill, Row, T } from "../../../components/ui";
import { useI18n } from "../../../i18n";
import { rpc } from "../../../lib/api";
import { useAuth } from "../../../lib/app";
import { pickDocument, pickImage, upload } from "../../../lib/media";
import { useTheme } from "../../../lib/theme";

type Lang = "ar" | "en";
type Texts = { fullName: string; specialty: string; bio: string; city: string; country: string };
type License = { name: string; nameEn: string; number: string; filePath: string | null; fileUrl: string | null; verificationStatus?: string };
type Data = {
  primary: Lang; enEnabled: boolean; langs: Lang[]; showEnglish: boolean;
  username: string; url: string; published: boolean; nextUsernameChange: string | null;
  photoUrl: string | null; photoShape: "full" | "circle"; logoUrl: string | null;
  texts: Record<Lang, Texts>;
  categories: { id: string; nameAr: string; nameEn: string }[]; pickedCategories: string[];
  tags: Record<Lang, string[]>;
  licenses: License[];
};
const FIELDS: (keyof Texts)[] = ["fullName", "specialty", "bio", "city", "country"];
const MAX = { fullName: 80, specialty: 80, bio: 500, city: 60, country: 60 };
const USERNAME_ERRORS = ["length", "characters", "dots", "reserved", "extension", "taken", "same", "cooldown"];

/** Section card with its own save button and status (each part saves on its own, like the website). */
function Part({ title, hint, children, onSave, status, message, saveLabel }: { title: string; hint?: string; children: ReactNode; onSave?: () => void; status?: SaveStatus; message?: string | null; saveLabel?: string }) {
  const { t } = useI18n();
  return (
    <Card>
      <T weight="bold" size={16}>{title}</T>
      {hint ? <T size={12.5} tone="muted">{hint}</T> : null}
      {children}
      {status === "saved" || status === "failed" || message ? <T size={13} tone={status === "failed" ? "bad" : "good"} accessibilityLiveRegion="polite">{message ?? (status === "saved" ? t("editor.saved") : t("editor.failed"))}</T> : null}
      {onSave ? <Button title={status === "saving" ? t("editor.saving") : saveLabel ?? t("editor.save")} variant="secondary" onPress={onSave} loading={status === "saving"} /> : null}
    </Card>
  );
}

/** Edit page: publish, username, photo and logo, texts in both languages, categories, tags, licenses. */
export default function Edit() {
  const { t, lang: uiLang, date } = useI18n();
  const { colors } = useTheme();
  const { refreshMe } = useAuth();
  const { data, error, reload } = useSection<Data>("edit");
  const [d, setD] = useState<Data | null>(null);
  const [username, setUsername] = useState("");
  const [tab, setTab] = useState<Lang>("ar");
  const [tagDraft, setTagDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const pub = useSaver(), user = useSaver(), photo = useSaver(), texts = useSaver(), cats = useSaver(), tags = useSaver(), lic = useSaver();
  const [textErrors, setTextErrors] = useState<Record<string, string>>({});
  useEffect(() => { if (data) { setD(data); setUsername(data.username); setTab(data.primary); } }, [data]);
  const set = (patch: Partial<Data>) => setD((x) => (x ? { ...x, ...patch } : x));

  const togglePublish = (v: boolean) => pub.save(async () => {
    const res = await rpc<{ ok?: boolean; error?: string }>("setPublished", v);
    if (res.ok) { set({ published: v }); refreshMe(); return true; }
    return res.error === "needs_name" ? t("edit.needsName") : false;
  });
  const changeUsername = () => user.save(async () => {
    const res = await rpc<{ ok?: boolean; username?: string; error?: string; nextChange?: string }>("changeUsername", username);
    if (res.ok && res.username) { set({ username: res.username }); refreshMe(); return true; }
    if (res.error === "cooldown" && res.nextChange) return t("edit.cooldown", { date: date(res.nextChange, { day: "numeric", month: "long" }) });
    return t(`onboarding.errors.${USERNAME_ERRORS.includes(res.error ?? "") ? res.error : "failed"}`, {});
  });
  const pickPhoto = async (kind: "photo" | "logo") => {
    const file = await pickImage(kind === "logo" ? { maxSide: 800, png: true } : {});
    if (!file || "error" in file) return;
    setBusy(kind);
    photo.save(async () => {
      const up = await upload(kind, file);
      if (!("path" in up)) { setBusy(null); return false; }
      const res = await rpc<{ ok?: boolean; url?: string | null }>(kind === "photo" ? "savePhoto" : "saveLogo", up.path);
      setBusy(null);
      if (res.ok) { set(kind === "photo" ? { photoUrl: res.url ?? file.uri } : { logoUrl: res.url ?? file.uri }); if (kind === "photo") refreshMe(); }
      return !!res.ok;
    });
  };
  const removeImage = (kind: "photo" | "logo") => photo.save(async () => {
    const res = await rpc<{ ok?: boolean }>(kind === "photo" ? "savePhoto" : "saveLogo", null);
    if (res.ok) set(kind === "photo" ? { photoUrl: null } : { logoUrl: null });
    return !!res.ok;
  });
  const saveTexts = () => texts.save(async () => {
    if (!d) return false;
    const fields: Record<string, string | boolean> = { primaryLang: d.primary, enEnabled: d.enEnabled };
    for (const l of ["ar", "en"] as Lang[]) for (const f of FIELDS) fields[`${l}.${f}`] = d.texts[l][f];
    const res = await rpc<{ ok?: boolean; errors?: Record<string, string> }>("saveProfile", fields);
    setTextErrors(res.errors ?? {});
    if (res.ok) refreshMe();
    return res.ok ? true : res.errors ? t("edit.checkFields") : false;
  });
  const saveLicenses = () => lic.save(async () => {
    if (!d) return false;
    const res = await rpc<{ ok?: boolean }>("saveLicenses", d.licenses.filter((l) => l.name.trim() && l.number.trim()).map((l) => ({ name: l.name, nameEn: l.nameEn, number: l.number, filePath: l.filePath, fileUrl: l.filePath ? null : l.fileUrl })));
    return !!res.ok;
  });
  const addLicenseFile = async (i: number) => {
    const file = await pickDocument();
    if (!file || !d) return;
    setBusy(`lic:${i}`);
    const res = await upload("license", file);
    setBusy(null);
    if ("path" in res) { set({ licenses: d.licenses.map((l, j) => (j === i ? { ...l, filePath: res.path, fileUrl: file.uri } : l)) }); lic.touch(); }
  };

  // Same rule as the website (pageLanguages): Arabic pages can add English; English pages are English only.
  const langs: Lang[] = !d ? ["ar"] : d.primary === "ar" ? (d.enEnabled ? ["ar", "en"] : ["ar"]) : ["en"];
  const lang: Lang = langs.includes(tab) ? tab : langs[0];
  return (
    <SectionScreen title={t("section.edit")} subtitle={t("edit.subtitle")} loading={!d && !error} error={error} onRetry={reload}>
      {d && (
        <>
          <Part title={t("edit.publishTitle")} status={pub.status} message={pub.message}>
            <SwitchRow label={d.published ? t("edit.published") : t("edit.hidden")} hint={t("edit.publishHint")} value={d.published} onChange={togglePublish} />
            <T size={13} tone="blue" accessibilityRole="link" onPress={() => Linking.openURL(d.url)} style={{ writingDirection: "ltr" }}>{d.url.replace(/^https?:\/\//, "")}</T>
          </Part>

          <Part title={t("edit.username")} hint={d.nextUsernameChange ? t("edit.cooldown", { date: date(d.nextUsernameChange, { day: "numeric", month: "long" }) }) : t("edit.usernameHint")}
            onSave={username !== d.username ? changeUsername : undefined} status={user.status} message={user.message} saveLabel={t("edit.changeUsername")}>
            <Field label={t("onboarding.label")} value={username} onChangeText={(v) => { setUsername(v.trim().toLowerCase().slice(0, 20)); user.touch(); }} autoCapitalize="none" autoCorrect={false} style={{ textAlign: "left", writingDirection: "ltr" }} editable={!d.nextUsernameChange} />
          </Part>

          <Part title={t("edit.photo")} status={photo.status} message={photo.message}>
            <Row style={{ alignItems: "flex-start" }}>
              <Pressable accessibilityRole="button" accessibilityLabel={t("edit.changePhoto")} onPress={() => pickPhoto("photo")}
                style={{ width: 96, height: 96, borderRadius: d.photoShape === "circle" ? 48 : 16, backgroundColor: colors.hover, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                {d.photoUrl ? <Image source={{ uri: d.photoUrl }} style={{ width: 96, height: 96 }} contentFit="cover" /> : <Camera size={26} color={colors.muted} />}
              </Pressable>
              <View style={{ flex: 1, gap: 8 }}>
                <Button title={busy === "photo" ? t("editor.uploading") : t("edit.changePhoto")} variant="secondary" onPress={() => pickPhoto("photo")} loading={busy === "photo"} />
                {d.photoUrl ? <Button title={t("edit.removePhoto")} variant="danger" onPress={() => removeImage("photo")} /> : null}
              </View>
            </Row>
            <T weight="bold" size={14}>{t("edit.shape")}</T>
            <Chips value={[d.photoShape]} onChange={([s]) => { set({ photoShape: s }); photo.save(async () => !!(await rpc<{ ok?: boolean }>("savePhotoShape", s)).ok); }}
              options={[{ value: "full", label: t("edit.shapeFull") }, { value: "circle", label: t("edit.shapeCircle") }]} />
            <T weight="bold" size={14}>{t("edit.logo")}</T>
            <T size={12.5} tone="muted">{t("edit.logoHint")}</T>
            <Row>
              {d.logoUrl ? <Image source={{ uri: d.logoUrl }} style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#fff" }} contentFit="contain" /> : null}
              <Button title={busy === "logo" ? t("editor.uploading") : d.logoUrl ? t("edit.changeLogo") : t("edit.addLogo")} variant="secondary" onPress={() => pickPhoto("logo")} loading={busy === "logo"} style={{ flex: 1 }} />
              {d.logoUrl ? <Pressable accessibilityRole="button" accessibilityLabel={t("edit.removeLogo")} onPress={() => removeImage("logo")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><X size={20} color={colors.bad} /></Pressable> : null}
            </Row>
          </Part>

          <Part title={t("edit.about")} onSave={saveTexts} status={texts.status} message={texts.message}>
            <T weight="bold" size={14}>{t("edit.primaryLang")}</T>
            <Chips value={[d.primary]} onChange={([l]) => { set({ primary: l }); texts.touch(); }} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
            {d.primary === "ar" && <SwitchRow label={t("edit.enEnabled")} hint={t("edit.secondLangHint")} value={d.enEnabled} onChange={(v) => { set({ enEnabled: v }); texts.touch(); }} />}
            {langs.length > 1 && <LangTabs value={lang} onChange={setTab} />}
            {FIELDS.map((f) => (
              <Field key={`${lang}.${f}`} label={t(`edit.fields.${f}`)} value={d.texts[lang][f]} maxLength={MAX[f]} multiline={f === "bio"}
                onChangeText={(v) => { set({ texts: { ...d.texts, [lang]: { ...d.texts[lang], [f]: v } } }); texts.touch(); }}
                style={[f === "bio" && { minHeight: 110, textAlignVertical: "top", paddingTop: 10 }, lang === "en" && { textAlign: "left", writingDirection: "ltr" }]}
                error={textErrors[`${lang}.${f}`] ? t(textErrors[`${lang}.${f}`] === "required" ? "edit.required" : "edit.invalid") : null}
                hint={f === "bio" ? `${d.texts[lang].bio.length}/500` : undefined} />
            ))}
          </Part>

          <Part title={t("edit.categories")} hint={t("edit.categoriesHint")} onSave={() => cats.save(async () => !!(await rpc<{ ok?: boolean }>("saveCategories", d.pickedCategories)).ok)} status={cats.status} message={cats.message}>
            <Chips multi max={2} value={d.pickedCategories} onChange={(ids) => { set({ pickedCategories: ids }); cats.touch(); }}
              options={d.categories.map((c) => ({ value: c.id, label: uiLang === "ar" ? c.nameAr : c.nameEn }))} />
          </Part>

          <Part title={t("edit.tags")} hint={t("edit.tagsHint")} status={tags.status} message={tags.message}
            onSave={() => tags.save(async () => (await Promise.all(langs.map((l) => rpc<{ ok?: boolean }>("saveTags", l, d.tags[l])))).every((r) => r.ok))}>
            {langs.length > 1 && <LangTabs value={lang} onChange={setTab} />}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {d.tags[lang].map((tag, i) => (
                <Pressable key={`${tag}-${i}`} accessibilityRole="button" accessibilityLabel={`${t("editor.remove")} ${tag}`} onPress={() => { set({ tags: { ...d.tags, [lang]: d.tags[lang].filter((_, j) => j !== i) } }); tags.touch(); }}
                  style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.hover, flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <T size={13.5}>{tag}</T><X size={14} color={colors.muted} />
                </Pressable>
              ))}
            </View>
            {d.tags[lang].length < 12 && (
              <Field label={t("edit.addTag")} value={tagDraft} maxLength={18} onChangeText={setTagDraft} returnKeyType="done"
                onSubmitEditing={() => { const v = tagDraft.trim(); if (v && !d.tags[lang].includes(v)) { set({ tags: { ...d.tags, [lang]: [...d.tags[lang], v] } }); tags.touch(); } setTagDraft(""); }}
                hint={t("edit.tagHint")} style={lang === "en" ? { textAlign: "left", writingDirection: "ltr" } : undefined} />
            )}
          </Part>

          <Part title={t("edit.licenses")} hint={t("edit.licensesHint")} onSave={saveLicenses} status={lic.status} message={lic.message}>
            {d.licenses.map((l, i) => {
              const setL = (patch: Partial<License>) => { set({ licenses: d.licenses.map((x, j) => (j === i ? { ...x, ...patch } : x)) }); lic.touch(); };
              return (
                <View key={i} style={{ gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
                  {l.verificationStatus === "verified" ? <Pill tone="good">{t("home.vstatus.verified")}</Pill> : null}
                  <Field label={t("edit.licenseName")} value={l.name} maxLength={60} onChangeText={(v) => setL({ name: v })} placeholder={t("edit.licenseNameHint")} />
                  {d.showEnglish && <Field label={t("edit.licenseNameEn")} value={l.nameEn} maxLength={60} onChangeText={(v) => setL({ nameEn: v })} style={{ textAlign: "left", writingDirection: "ltr" }} />}
                  <Field label={t("edit.licenseNumber")} value={l.number} maxLength={60} onChangeText={(v) => setL({ number: v })} style={{ textAlign: "left", writingDirection: "ltr" }} />
                  <Button title={busy === `lic:${i}` ? t("editor.uploading") : l.fileUrl ? t("edit.replaceFile") : t("edit.addFile")} variant="secondary" icon={<FileText size={16} color={colors.navy} />} onPress={() => addLicenseFile(i)} loading={busy === `lic:${i}`} />
                  <ItemTools index={i} count={d.licenses.length} onMove={(a, b) => { set({ licenses: move(d.licenses, a, b) }); lic.touch(); }} onRemove={() => { set({ licenses: d.licenses.filter((_, j) => j !== i) }); lic.touch(); }} />
                </View>
              );
            })}
            <AddButton label={t("edit.addLicense")} disabled={d.licenses.length >= 10} onPress={() => { set({ licenses: [...d.licenses, { name: "", nameEn: "", number: "", filePath: null, fileUrl: null }] }); lic.touch(); }} />
          </Part>
        </>
      )}
    </SectionScreen>
  );
}
