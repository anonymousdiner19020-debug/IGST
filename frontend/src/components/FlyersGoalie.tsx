import React, { useRef } from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

type Props = { size?: number };

const ORANGE = "#F74902";
const ORANGE_DK = "#C43800";
const BLACK = "#141414";
const WHITE = "#FFFFFF";

// Detailed front-facing Philadelphia Flyers goalie (shooter's perspective).
export function FlyersGoalie({ size = 90 }: Props) {
  const h = size * 1.45;
  const uid = useRef(`goalie_${Math.random().toString(36).slice(2, 8)}`).current;
  const jGrad = `${uid}_j`;
  const pGrad = `${uid}_p`;

  return (
    <Svg width={size} height={h} viewBox="0 0 100 145">
      <Defs>
        <LinearGradient id={jGrad} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF6A2A" />
          <Stop offset="1" stopColor={ORANGE_DK} />
        </LinearGradient>
        <LinearGradient id={pGrad} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.5" stopColor="#F1F1F1" />
          <Stop offset="1" stopColor="#D8D8D8" />
        </LinearGradient>
      </Defs>

      {/* goalie stick: paddle + blade on the ice */}
      <Path d="M20 70 L24 74 L20 128 L12 128 Z" fill="#B9791F" stroke={BLACK} strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x={6} y={126} width={30} height={9} rx={2} fill="#8A5A2B" stroke={BLACK} strokeWidth={1.5} />

      {/* skates + blades */}
      <Rect x={26} y={130} width={20} height={7} rx={2} fill={BLACK} />
      <Rect x={54} y={130} width={20} height={7} rx={2} fill={BLACK} />
      <Rect x={24} y={137} width={24} height={3} rx={1.5} fill="#AEB4BD" />
      <Rect x={52} y={137} width={24} height={3} rx={1.5} fill="#AEB4BD" />

      {/* leg pads with knee rolls */}
      {[26, 54].map((x) => (
        <G key={x}>
          <Rect x={x} y={64} width={22} height={68} rx={9} fill={`url(#${pGrad})`} stroke={BLACK} strokeWidth={2} />
          {/* vertical center channel */}
          <Line x1={x + 11} y1={70} x2={x + 11} y2={128} stroke="#C9C9C9" strokeWidth={1.5} />
          {/* knee rolls */}
          {[78, 96, 114].map((y) => (
            <Rect key={y} x={x + 2} y={y} width={18} height={9} rx={4} fill={WHITE} stroke="#C4C4C4" strokeWidth={1} />
          ))}
          {/* orange accent + strap */}
          <Rect x={x} y={70} width={4} height={58} rx={2} fill={ORANGE} />
          <Rect x={x + 18} y={70} width={4} height={58} rx={2} fill={ORANGE} />
        </G>
      ))}

      {/* jersey / chest protector (bulky shoulders) */}
      <Path
        d="M24 52 Q22 44 32 42 Q50 37 68 42 Q78 44 76 52 L80 82 Q50 90 20 82 Z"
        fill={`url(#${jGrad})`}
        stroke={BLACK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* black shoulder yoke */}
      <Path d="M32 43 Q50 38 68 43 L64 52 Q50 48 36 52 Z" fill={BLACK} />
      {/* white chest panel + number */}
      <Path d="M40 54 L60 54 L58 78 L42 78 Z" fill={WHITE} opacity={0.95} />
      <SvgText x={50} y={72} fontSize={14} fontWeight="bold" fill={ORANGE} textAnchor="middle">
        35
      </SvgText>

      {/* left arm + trapper (catch glove) */}
      <Path d="M24 56 Q12 58 10 70 L20 74 Q24 64 28 60 Z" fill={`url(#${jGrad})`} stroke={BLACK} strokeWidth={2} strokeLinejoin="round" />
      <Ellipse cx={12} cy={72} rx={12} ry={13} fill={`url(#${pGrad})`} stroke={BLACK} strokeWidth={2} />
      <Path d="M6 66 Q12 60 18 66" fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={12} cy={74} r={4} fill={ORANGE} />

      {/* right arm + blocker */}
      <Path d="M76 56 Q88 58 90 70 L80 74 Q76 64 72 60 Z" fill={`url(#${jGrad})`} stroke={BLACK} strokeWidth={2} strokeLinejoin="round" />
      <Rect x={80} y={58} width={16} height={26} rx={4} fill={`url(#${jGrad})`} stroke={BLACK} strokeWidth={2} />
      <Rect x={84} y={62} width={4} height={18} rx={2} fill={WHITE} />

      {/* neck */}
      <Rect x={44} y={38} width={12} height={8} fill={ORANGE_DK} />

      {/* mask / helmet */}
      <G>
        <Path d="M36 26 Q36 10 50 10 Q64 10 64 26 L63 34 Q50 40 37 34 Z" fill={WHITE} stroke={BLACK} strokeWidth={2} strokeLinejoin="round" />
        {/* orange crown swoosh */}
        <Path d="M37 20 Q50 12 63 20 L61 25 Q50 19 39 25 Z" fill={ORANGE} />
        {/* cage: vertical + horizontal bars */}
        <Path d="M42 15 L42 37 M50 13 L50 39 M58 15 L58 37" stroke={BLACK} strokeWidth={1.4} />
        <Path d="M38 22 L62 22 M37 28 L63 28 M39 34 L61 34" stroke={BLACK} strokeWidth={1.4} />
        {/* chin */}
        <Path d="M42 36 Q50 42 58 36" fill="none" stroke={BLACK} strokeWidth={2} />
      </G>
    </Svg>
  );
}

export default FlyersGoalie;
