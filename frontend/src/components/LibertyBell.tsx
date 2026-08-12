import React from "react";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

type Props = {
  size?: number;
};

// A more realistic iconic Liberty Bell: bronze bell with an S-curve silhouette,
// flared sound-bow lip, crown loops, a wooden yoke with metal straps, and the
// famous jagged crack.
export function LibertyBell({ size = 24 }: Props) {
  const wood = "#6B4226";
  const woodLight = "#8A5A34";
  const outline = "#6E541C";
  const lipDark = "#8A6A24";
  const crack = "#2C2008";
  const uid = React.useId().replace(/:/g, "");
  return (
    <Svg width={size} height={size} viewBox="0 0 100 120">
      <Defs>
        <LinearGradient id={`bronze-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#EBCE73" />
          <Stop offset="0.5" stopColor="#C9A23F" />
          <Stop offset="1" stopColor="#8F6E28" />
        </LinearGradient>
      </Defs>

      {/* wooden yoke */}
      <Rect x={24} y={6} width={52} height={11} rx={4} fill={wood} />
      <Rect x={24} y={6} width={52} height={3.4} rx={2} fill={woodLight} />
      {/* metal straps + bolts */}
      <Rect x={39} y={5} width={4} height={13} rx={1} fill="#9A9A9A" />
      <Rect x={57} y={5} width={4} height={13} rx={1} fill="#9A9A9A" />
      <Circle cx={41} cy={11} r={1.2} fill="#5A5A5A" />
      <Circle cx={59} cy={11} r={1.2} fill="#5A5A5A" />

      {/* crown loops */}
      <Circle cx={50} cy={16} r={4.2} fill="none" stroke={`url(#bronze-${uid})`} strokeWidth={3} />
      <Path d="M43 24 C40 20 41 17 44 17 C47 17 47 21 46 24 Z" fill={`url(#bronze-${uid})`} stroke={outline} strokeWidth={1} />
      <Path d="M57 24 C60 20 59 17 56 17 C53 17 53 21 54 24 Z" fill={`url(#bronze-${uid})`} stroke={outline} strokeWidth={1} />

      {/* crown cap */}
      <Path d="M45 30 L55 30 L54 22 L46 22 Z" fill={`url(#bronze-${uid})`} stroke={outline} strokeWidth={1.2} strokeLinejoin="round" />

      {/* bell body (S-curve silhouette) */}
      <Path
        d="M42 30
           C40 40 36 52 34 64
           C32 76 27 85 22 94
           C21 96 20 98 20 99
           L80 99
           C80 98 79 96 78 94
           C73 85 68 76 66 64
           C64 52 60 40 58 30
           Z"
        fill={`url(#bronze-${uid})`}
        stroke={outline}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* left-side highlight */}
      <Path
        d="M44 33 C41 44 37 56 35 68 C33 78 30 85 27 92"
        fill="none"
        stroke="#F2DE9A"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.7}
      />

      {/* flared sound-bow lip */}
      <Path
        d="M22 92 C34 88 66 88 78 92 L80 99 L20 99 Z"
        fill={lipDark}
        stroke={outline}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M24 93.5 C35 90.5 65 90.5 76 93.5" stroke="#D9B24E" strokeWidth={1.4} strokeLinecap="round" opacity={0.8} />

      {/* clapper peeking from the mouth */}
      <Circle cx={50} cy={103} r={3} fill={`url(#bronze-${uid})`} stroke={outline} strokeWidth={1.2} />

      {/* the famous crack */}
      <G>
        <Path
          d="M55 99 L50 90 L56 81 L51 71 L57 62 L52 53"
          fill="none"
          stroke={crack}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}

export default LibertyBell;
