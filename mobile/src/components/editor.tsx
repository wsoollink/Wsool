import { useCallback, useState, type ReactNode } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { router, useFocusEffect, usePreventRemove } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react-native";
import { useI18n } from "../i18n";
import { api, ApiError } from "../lib/api";
import { useCached } from "../lib/cached";
import { TOUCH, useTheme } from "../lib/theme";
import { ANDROID, Button, Card, Row, Status, T, TAB_BAR_SPACE } from "./ui";
import { haptic } from "../lib/haptics";

/**
 * Loads a dashboard section's data (/section/<key>) with reload. Sections stay
 * mounted inside the tabs, so the data is fetched again each time one opens.
 */
export function useSection<D>(key: string) {
  const { t } = useI18n();
  const [data, setData] = useCached<D>(`/section/${key}`);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setError(null); setData(await api<D>(`/section/${key}`)); }
    catch (err) { setError(err instanceof ApiError && err.code !== "network" ? t("common.error") : t("common.offline")); }
  }, [key, t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return { data, error, reload: load, setData };
}

/**
 * A section page: a bar with back (to the tab it belongs to) and the title (iPhone: in the middle; Android: after the arrow), a short
 * description, the scrolling body, and an optional save button floating above the tab bar.
 * `tab` = the screen is itself a tab (Insights): large title, no back button.
 */
export function SectionScreen({ title, subtitle, children, footer, loading, error, onRetry, tab, parent = "page", dirty = false }: {
  title: string; subtitle?: string; children?: ReactNode; footer?: ReactNode; loading?: boolean; error?: string | null; onRetry?: () => void;
  tab?: boolean; parent?: "page" | "account" | "home";
  /** Unsaved edits: going back (button, edge swipe, Android back) asks first. */
  dirty?: boolean;
}) {
  const { colors } = useTheme();
  const { rtl, t } = useI18n();
  const [leaving, setLeaving] = useState(false);
  usePreventRemove(dirty && !leaving, ({ repeat }) => {
    Alert.alert(t("editor.unsavedTitle"), t("editor.unsavedText"), [
      { text: t("editor.keepEditing"), style: "cancel" },
      // Let the screen go once the guard is off (after the re-render), then repeat the blocked "back".
      { text: t("editor.discard"), style: "destructive", onPress: () => { setLeaving(true); setTimeout(repeat, 60); } },
    ]);
  });
  const Back = rtl ? ChevronRight : ChevronLeft;
  const Arrow = rtl ? ArrowRight : ArrowLeft;
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/${parent}` as never));
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      {tab ? null : ANDROID ? (
        // Android (Material top app bar): back arrow, then the title at the start.
        <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={back} android_ripple={{ color: colors.line, borderless: true, radius: 24 }}
            style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
            <Arrow size={24} color={colors.navy} />
          </Pressable>
          <T weight="bold" size={19} numberOfLines={1} maxFontSizeMultiplier={1.3} accessibilityRole="header" style={{ flex: 1 }}>{title}</T>
        </View>
      ) : (
        // iPhone: "‹ My page" back button and the title in the middle.
        <View style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.lineSoft }}>
          <T weight="bold" size={17} numberOfLines={1} maxFontSizeMultiplier={1.3} accessibilityRole="header" style={{ position: "absolute", left: 90, right: 90, textAlign: "center" }}>{title}</T>
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={back} hitSlop={6}
            style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", minHeight: 44, paddingHorizontal: 6 }}>
            <Back size={24} color={colors.blue} strokeWidth={2.2} />
            <T size={16} weight="bold" tone="blue" maxFontSizeMultiplier={1.3}>{t(`tabs.${parent}`)}</T>
          </Pressable>
        </View>
      )}
      {loading || error ? <Status loading={loading} error={error} onRetry={onRetry} /> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={{ padding: 16, paddingTop: tab ? 12 : 14, gap: 16, paddingBottom: footer ? TAB_BAR_SPACE + 76 : TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
            {tab ? <T weight="black" size={30} accessibilityRole="header">{title}</T> : null}
            {subtitle ? <T size={13.5} tone="muted" style={{ marginTop: tab ? -10 : 0 }}>{subtitle}</T> : null}
            {children}
          </ScrollView>
          {footer}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

export type SaveStatus = "" | "saving" | "saved" | "failed";

/** One save for the whole section, floating just above the tab bar (like the website's SaveBar). */
export function SaveBar({ onSave, status, message, disabled }: { onSave: () => void; status: SaveStatus; message?: string | null; disabled?: boolean }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const note = status === "saved" || status === "failed" || message;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: Math.max(insets.bottom, 10) + 80, gap: 6, alignItems: "stretch" }}>
      {note ? (
        <View style={{ alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
          <T size={13} tone={status === "failed" ? "bad" : "good"} accessibilityLiveRegion="polite" style={{ textAlign: "center" }}>
            {message ?? (status === "saved" ? t("editor.saved") : t("editor.failed"))}
          </T>
        </View>
      ) : null}
      <Button title={status === "saving" ? t("editor.saving") : t("editor.save")} onPress={onSave} loading={status === "saving"} disabled={disabled}
        style={{ minHeight: 52, shadowColor: "#0060E6", shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }} />
    </View>
  );
}

/**
 * Saves through an action and tracks its status; `run` returns true when it worked.
 * `touch()` marks an edit, so `dirty` stays true until a save works (SectionScreen warns before leaving).
 */
export function useSaver() {
  const [status, setStatus] = useState<SaveStatus>("");
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const save = useCallback(async (run: () => Promise<boolean | string>) => {
    setStatus("saving"); setMessage(null);
    try {
      const res = await run();
      if (res === true) { setStatus("saved"); setDirty(false); haptic("success"); }
      else { setStatus("failed"); if (typeof res === "string") setMessage(res); haptic("error"); }
    } catch { setStatus("failed"); haptic("error"); }
  }, []);
  const touch = useCallback(() => { setStatus((s) => (s === "saving" ? s : "")); setMessage(null); setDirty(true); }, []);
  return { status, message, save, touch, dirty };
}

/** On/off switch (our own drawing, so it looks the same on iOS, Android and in RTL). */
export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => { haptic("tap"); onChange(!value); }}
      hitSlop={8} style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: value ? colors.blue : colors.switchOff, alignItems: value ? "flex-end" : "flex-start", opacity: disabled ? 0.5 : 1, direction: "ltr" }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }} />
    </Pressable>
  );
}

/** On/off row with a label (and hint), 48px tall. */
export function SwitchRow({ label, hint, value, onChange, disabled }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Row style={{ minHeight: 48, justifyContent: "space-between" }}>
      <View style={{ flex: 1 }}>
        <T weight="bold" size={14}>{label}</T>
        {hint ? <T size={12.5} tone="muted">{hint}</T> : null}
      </View>
      <Toggle label={label} value={value} onChange={onChange} disabled={disabled} />
    </Row>
  );
}

/** Pill choices (one or many). */
export function Chips<V extends string>({ options, value, onChange, multi, max }: {
  options: { value: V; label: string; locked?: boolean }[]; value: V[]; onChange: (v: V[]) => void; multi?: boolean; max?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = value.includes(o.value);
        const toggle = () => {
          if (o.locked) return;
          if (!multi) return onChange([o.value]);
          if (on) return onChange(value.filter((v) => v !== o.value));
          if (max && value.length >= max) return;
          onChange([...value, o.value]);
        };
        return (
          <Pressable key={o.value} accessibilityRole={multi ? "checkbox" : "radio"} accessibilityState={{ checked: on, disabled: o.locked }} onPress={toggle} android_ripple={{ color: colors.line }}
            style={{ minHeight: TOUCH, paddingHorizontal: 14, borderRadius: 999, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1,
              borderColor: on ? colors.blue : colors.line, backgroundColor: on ? colors.blue + "1A" : colors.card, opacity: o.locked ? 0.5 : 1 }}>
            {on ? <Check size={14} color={colors.blue} /> : null}
            <T size={13.5} weight="bold" style={{ color: on ? colors.blue : colors.navy }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Move up / down / remove buttons for one item in a list. */
export function ItemTools({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (from: number, to: number) => void; onRemove: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const btn = { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: colors.hover };
  return (
    <Row style={{ gap: 6 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("editor.moveUp")} disabled={index === 0} onPress={() => onMove(index, index - 1)} style={[btn, index === 0 && { opacity: 0.35 }]}><ArrowUp size={17} color={colors.navy} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t("editor.moveDown")} disabled={index === count - 1} onPress={() => onMove(index, index + 1)} style={[btn, index === count - 1 && { opacity: 0.35 }]}><ArrowDown size={17} color={colors.navy} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t("editor.remove")} onPress={onRemove} style={[btn, { backgroundColor: colors.bad + "14" }]}><Trash2 size={17} color={colors.bad} /></Pressable>
    </Row>
  );
}

export const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** "+ Add" dashed button under a list. */
export function AddButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} android_ripple={{ color: colors.line }}
      style={{ minHeight: 48, borderRadius: 14, overflow: "hidden", borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.line, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, opacity: disabled ? 0.5 : 1 }}>
      <Plus size={18} color={colors.blue} /><T weight="bold" tone="blue">{label}</T>
    </Pressable>
  );
}

/** Bottom sheet with a list of choices (e.g. pick a platform). */
export function PickerSheet<V extends string>({ visible, title, options, onPick, onClose }: {
  visible: boolean; title: string; options: { value: V; label: string; icon?: ReactNode }[]; onPick: (v: V) => void; onClose: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(10,12,16,0.45)" }} onPress={onClose} accessibilityLabel={t("editor.close")} />
      <View style={{ maxHeight: "70%", backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 24 }}>
        <Row style={{ justifyContent: "space-between", padding: 16 }}>
          <T weight="bold" size={17}>{title}</T>
          <Pressable accessibilityRole="button" accessibilityLabel={t("editor.close")} onPress={onClose} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><X size={20} color={colors.navy} /></Pressable>
        </Row>
        <ScrollView>
          {options.map((o) => (
            <Pressable key={o.value} accessibilityRole="button" onPress={() => { onPick(o.value); onClose(); }} android_ripple={{ color: colors.line }}
              style={{ minHeight: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: colors.lineSoft }}>
              {o.icon}<T>{o.label}</T>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Small notice for Free creators (feature shows on the page with Pro only). */
export function ProNote({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Card style={{ backgroundColor: colors.blue + "10", borderColor: colors.blue + "40" }}><T size={13.5} tone="blue">{text}</T></Card>;
}

/** Arabic / English switch for bilingual fields. */
export function LangTabs({ value, onChange }: { value: "ar" | "en"; onChange: (l: "ar" | "en") => void }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.hover }}>
      {(["ar", "en"] as const).map((l) => (
        <Pressable key={l} accessibilityRole="tab" accessibilityState={{ selected: value === l }} onPress={() => onChange(l)} hitSlop={4}
          style={{ flex: 1, minHeight: TOUCH - 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: value === l ? colors.card : "transparent" }}>
          <T weight="bold" size={13.5} tone={value === l ? undefined : "muted"}>{l === "ar" ? "العربية" : "English"}</T>
        </Pressable>
      ))}
    </View>
  );
}
