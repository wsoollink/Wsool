import Svg, { Path } from "react-native-svg";
import { ICON_PATHS, type Platform } from "../lib/platforms";

/** Brand icon (decorative: give the surrounding control an accessible name). */
export function PlatformIcon({ platform, size = 20, color }: { platform: Platform | "whatsapp"; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path d={ICON_PATHS[platform]} fill={color} />
    </Svg>
  );
}
