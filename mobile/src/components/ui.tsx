import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react-native";
import { useI18n } from "../i18n";
import { FONTS, RADIUS, useTheme, align } from "../lib/theme";

/** The app design (Oct 2026) sets every text about 12% smaller than the sizes the screens pass. */
const TEXT_SCALE = 0.88;
/** Room under scrolling content for the floating tab bar. */
export const TAB_BAR_SPACE = 120;

type Weight = "regular" | "bold" | "black";

/** Text in Noto Kufi Arabic (the brand font); `black` = the big-number cut. */
export function T({ weight = "regular", tone, size = 15, style, ...props }: TextProps & { weight?: Weight; tone?: "muted" | "faint" | "blue" | "good" | "warn" | "bad" | "onBlue"; size?: number }) {
  const { colors } = useTheme();
  const { rtl } = useI18n();
  const color = tone ? colors[tone] : colors.navy;
  const px = size * TEXT_SCALE;
  return <Text {...props} style={[{ fontFamily: FONTS[weight], fontSize: px, color, lineHeight: Math.round(px * (weight === "black" ? 1.25 : 1.55)), textAlign: align(rtl ? "right" : "left"), writingDirection: rtl ? "rtl" : "ltr" }, style]} />;
}

/** Page wrapper: safe area, app background, optional large title (iOS style), scroll and pull to refresh. */
export function Screen({ children, scroll = true, refreshControl, contentStyle, title, subtitle, action, tabs = true }: {
  children: ReactNode; scroll?: boolean; refreshControl?: React.ReactElement; contentStyle?: StyleProp<ViewStyle>;
  title?: string; subtitle?: string; action?: ReactNode; tabs?: boolean;
}) {
  const { colors } = useTheme();
  const body = [{ paddingHorizontal: 16, paddingTop: 12, gap: 16 }, contentStyle];
  const head = title ? (
    <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
      <View style={{ flex: 1 }}>
        <T weight="black" size={30} accessibilityRole="header">{title}</T>
        {subtitle ? <T size={13.5} tone="muted">{subtitle}</T> : null}
      </View>
      {action}
    </Row>
  ) : null;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={[...body, { paddingBottom: tabs ? TAB_BAR_SPACE : 32 }]} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
          {head}{children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, ...body]}>{head}{children}</View>
      )}
    </SafeAreaView>
  );
}

/** White card from the app design (radius 20, soft shadow; a hairline edge in dark mode). */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { colors, dark } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: RADIUS.card, borderWidth: dark ? StyleSheet.hairlineWidth : 0, borderColor: colors.line, padding: padded ? 16 : 0, gap: 10, shadowColor: "#021941", shadowOpacity: dark ? 0 : 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: dark ? 0 : 1 }, style]}>
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
        minHeight: 48, borderRadius: RADIUS.button, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: variant === "secondary" ? colors.input : bg, borderWidth: 0,
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
      <T weight="bold" size={14}>{label}</T>
      <TextInput
        accessibilityLabel={label} placeholderTextColor={colors.faint}
        {...props}
        style={[{ minHeight: 50, borderRadius: RADIUS.input, borderWidth: 1.5, borderColor: error ? colors.bad : colors.line, backgroundColor: colors.input, paddingHorizontal: 14, fontSize: 15, fontFamily: FONTS.regular, color: colors.navy, textAlign: rtl ? "right" : "left" }, style]}
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

/** Round photo, or a person icon on a soft blue disc (an Arabic first letter alone, like «إ», reads badly). */
export function Avatar({ uri, size = 46 }: { uri?: string | null; name?: string | null; size?: number }) {
  const { colors } = useTheme();
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center" }}>
      <UserRound size={size * 0.5} color={colors.blue} strokeWidth={1.8} />
    </View>
  );
}

/** Small rounded square with a white icon (iOS settings style). */
export function IconTile({ color, children, size = 32 }: { color: string; children: ReactNode; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

/** Grouped list (iOS inset style): optional small title, white rounded block, optional footer note. Rows get dividers between them. */
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<{ first?: boolean }>[];
  return (
    <View style={{ gap: 6 }}>
      {title ? <T size={13} weight="bold" tone="muted" style={{ paddingHorizontal: 14 }}>{title}</T> : null}
      <Card padded={false} style={{ gap: 0, overflow: "hidden" }}>
        {rows.map((r, i) => cloneElement(r, { first: i === 0 }))}
      </Card>
      {footer ? <T size={12.5} tone="muted" style={{ paddingHorizontal: 14 }}>{footer}</T> : null}
    </View>
  );
}

/** One row of a Group: icon tile, label (+ note), value or badge, chevron when it opens something. */
export function ListRow({ icon, label, note, value, badge, onPress, first, danger, trailing, accessibilityLabel }: {
  icon?: ReactNode; label: string; note?: string; value?: string; badge?: ReactNode; onPress?: () => void; first?: boolean; danger?: boolean; trailing?: ReactNode; accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const { rtl } = useI18n();
  const Chevron = rtl ? ChevronLeft : ChevronRight;
  const body = (
    <Row style={{ paddingHorizontal: 14, gap: 12 }}>
      {icon}
      <Row style={{ flex: 1, minHeight: 52, paddingVertical: 8, gap: 8, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.line }}>
        <View style={{ flex: 1 }}>
          <T weight="bold" size={15} tone={danger ? "bad" : undefined}>{label}</T>
          {note ? <T size={12.5} tone="muted">{note}</T> : null}
        </View>
        {badge}
        {value ? <T size={14} tone="muted" numberOfLines={1} style={{ maxWidth: 160 }}>{value}</T> : null}
        {trailing}
        {onPress && !trailing ? <Chevron size={17} color={colors.faint} /> : null}
      </Row>
    </Row>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? colors.hover : "transparent" })}>
      {body}
    </Pressable>
  );
}

/** iOS-style segmented control (radio group). */
export function Segmented<V extends string | number>({ options, value, onChange, label }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string }) {
  const { colors, dark } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", gap: 2, padding: 3, borderRadius: 13, backgroundColor: colors.track }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.value)}
            style={{ flex: 1, minHeight: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: on ? (dark ? colors.hover : colors.card) : "transparent", shadowColor: "#021941", shadowOpacity: on && !dark ? 0.12 : 0, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: on && !dark ? 1 : 0 }}>
            <T weight="bold" size={14} tone={on ? undefined : "muted"}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
