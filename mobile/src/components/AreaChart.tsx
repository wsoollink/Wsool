import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";
import { useTheme } from "../lib/theme";
import { T } from "./ui";

/** Smooth line through the points (same shape as the website chart). */
function smooth(values: number[], w: number, h: number, max: number) {
  const n = values.length;
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => h - (v / max) * (h - 8) - 4;
  let d = `M ${x(0)} ${y(values[0])}`;
  for (let i = 1; i < n; i++) {
    const cx = (x(i - 1) + x(i)) / 2;
    d += ` C ${cx} ${y(values[i - 1])}, ${cx} ${y(values[i])}, ${x(i)} ${y(values[i])}`;
  }
  return d;
}

/**
 * Current period as a filled line, previous period dashed. Time runs left to
 * right in both languages (like the website). Tap a point to see its value.
 */
export function AreaChart({ values, prev, labels, ticks, valueText, height = 170, accessibilityLabel }: {
  values: number[]; prev?: number[]; labels: string[]; ticks: string[]; valueText: (i: number) => string; height?: number; accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...values, ...(prev ?? []));
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const pick = (px: number) => setActive(Math.max(0, Math.min(values.length - 1, Math.round((px / w) * (values.length - 1)))));
  const line = w ? smooth(values, w, height, max) : "";
  // A point picked on a longer period (30 days) doesn't exist after switching to 7: ignore it.
  const shown = active !== null && active < values.length ? active : null;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ gap: 6, direction: "ltr" }}>
      <View
        onLayout={onLayout} style={{ height }}
        onStartShouldSetResponder={() => true} onResponderGrant={(e) => pick(e.nativeEvent.locationX)} onResponderMove={(e) => pick(e.nativeEvent.locationX)}
      >
        {w > 0 && (
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.blue} stopOpacity={0.22} />
                <Stop offset="1" stopColor={colors.blue} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => <Line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke={colors.lineSoft} strokeDasharray="3 4" />)}
            {prev && <Path d={smooth(prev, w, height, max)} stroke={colors.faint} strokeWidth={1.5} strokeDasharray="4 4" fill="none" />}
            <Path d={`${line} L ${w} ${height} L 0 ${height} Z`} fill="url(#fill)" />
            <Path d={line} stroke={colors.blue} strokeWidth={2.2} fill="none" />
            {shown !== null && <Line x1={(shown / Math.max(1, values.length - 1)) * w} x2={(shown / Math.max(1, values.length - 1)) * w} y1={0} y2={height} stroke={colors.faint} />}
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {ticks.map((t, i) => <T key={i} size={12} tone="faint" maxFontSizeMultiplier={1.3}>{t}</T>)}
      </View>
      {shown !== null && <T size={12.5} tone="muted" style={{ textAlign: "center" }}>{labels[shown]} · {valueText(shown)}</T>}
    </View>
  );
}
