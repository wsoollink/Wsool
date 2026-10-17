import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { FONTS, RADIUS, useTheme } from "../lib/theme";

type Weight = "regular" | "bold" | "black";

/** Text in Noto Kufi Arabic (the brand font); `black` = the big-number cut. */
export function T({ weight = "regular", tone, size = 15, style, ...props }: TextProps & { weight?: Weight; tone?: "muted" | "faint" | "blue" | "good" | "warn" | "bad" | "onBlue"; size?: number }) {
  const { colors } = useTheme();
  const { rtl } = useI18n();
  const color = tone ? colors[tone] : colors.navy;
  return <Text {...props} style={[{ fontFamily: FONTS[weight], fontSize: size, color, lineHeight: Math.round(size * (weight === "black" ? 1.25 : 1.7)), textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" }, style]} />;
}

/** Page wrapper: safe area, app background, optional scroll and pull to refresh. */
export function Screen({ children, scroll = true, refreshControl, contentStyle }: { children: ReactNode; scroll?: boolean; refreshControl?: React.ReactElement; contentStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const body = [{ padding: 16, gap: 14 }, contentStyle];
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[...body, { paddingBottom: 32 }]} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, ...body]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/** White card from the dashboard design (radius 14, hairline border). */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: RADIUS.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: padded ? 16 : 0, gap: 10, shadowColor: "#0A1E46", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } }, style]}>
      {children}
    </View>
  );
}

/** Card with a title row and a divider (Panel on the website). */
export function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Card padded={false} style={{ gap: 0 }}>
      <Row style={{ justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lineSoft }}>
        <T weight="bold">{title}</T>
        {typeof aside === "string" ? <T size={12.5} tone="muted">{aside}</T> : aside}
      </Row>
      <View style={{ padding: 16, gap: 10 }}>{children}</View>
    </Card>
  );
}

/** Horizontal row that follows the reading direction (React Native flips it in RTL). */
export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, style]}>{children}</View>;
}

/** Pill button: primary (blue), secondary (card + border) or ghost. 48px high (44px+ touch target). */
export function Button({ title, onPress, variant = "primary", loading, disabled, icon, style, ...rest }: PressableProps & { title: string; variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const bg = variant === "primary" ? colors.blue : variant === "secondary" ? colors.card : "transparent";
  const fg = variant === "primary" ? colors.onBlue : variant === "danger" ? colors.bad : colors.navy;
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress} disabled={disabled || loading} {...rest}
      style={({ pressed }) => [{
        minHeight: 48, borderRadius: RADIUS.pill, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: bg, borderWidth: variant === "secondary" ? StyleSheet.hairlineWidth : 0, borderColor: colors.line,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <T weight="bold" style={{ color: fg }}>{title}</T>
    </Pressable>
  );
}

/** Labelled text field (16px+ text, error under it, linked for screen readers). */
export function Field({ label, error, hint, style, ...props }: TextInputProps & { label: string; error?: string | null; hint?: string | null; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  const { rtl } = useI18n();
  return (
    <View style={{ gap: 6 }}>
      <T weight="bold" size={13.5}>{label}</T>
      <TextInput
        accessibilityLabel={label} placeholderTextColor={colors.faint}
        {...props}
        style={[{ minHeight: 48, borderRadius: RADIUS.input, borderWidth: 1, borderColor: error ? colors.bad : colors.line, backgroundColor: colors.card, paddingHorizontal: 14, fontSize: 16, fontFamily: FONTS.regular, color: colors.navy, textAlign: rtl ? "right" : "left" }, style]}
      />
      {hint ? <T size={12.5} tone="muted">{hint}</T> : null}
      {error ? <T size={13} tone="bad" accessibilityLiveRegion="polite">{error}</T> : null}
    </View>
  );
}

const PILL = { good: "good", warn: "warn", bad: "bad", blue: "blue", grey: "muted" } as const;
/** Small status badge. */
export function Pill({ tone = "grey", children }: { tone?: keyof typeof PILL; children: string }) {
  const { colors } = useTheme();
  const c = colors[PILL[tone]];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, backgroundColor: c + "1A" }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
      <T size={11.5} weight="bold" style={{ color: c, lineHeight: 18 }}>{children}</T>
    </View>
  );
}

/** Full-screen loading / error state. */
export function Status({ loading, error, onRetry }: { loading?: boolean; error?: string | null; onRetry?: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24, backgroundColor: colors.bg }}>
      {loading ? <ActivityIndicator color={colors.blue} size="large" /> : <T tone="muted" style={{ textAlign: "center" }}>{error}</T>}
      {!loading && onRetry ? <Button title={t("common.retry")} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}
