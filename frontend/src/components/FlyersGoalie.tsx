import React from "react";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

type Props = { size?: number };

const ORANGE = "#F74902";
const BLACK = "#0E0E0E";
const WHITE = "#FFFFFF";
const PADW = "#F3F3F3";

// Front-facing Philadelphia Flyers goalie (shooter's perspective).
export function FlyersGoalie({ size = 90 }: Props) {
  const h = size * 1.4;
  return (
    <Svg width={size} height={h} viewBox="0 0 100 140">
      {/* stick along the ice */}
      <Line x1={6} y1={128} x2={70} y2={122} stroke="#8A5A2B" strokeWidth={4} strokeLinecap="round" />
      <Rect x={4} y={120} width={12} height={14} rx={2} fill="#8A5A2B" stroke={BLACK} strokeWidth={1.5} />

      {/* leg pads */}
      <Rect x={26} y={72} width={20} height={58} rx={7} fill={PADW} stroke={BLACK} strokeWidth={2} />
      <Rect x={54} y={72} width={20} height={58} rx={7} fill={PADW} stroke={BLACK} strokeWidth={2} />
      {[86, 100, 114].map((y) => (
        <G key={y}>
          <Line x1={26} y1={y} x2={46} y2={y} stroke={ORANGE} strokeWidth={2} />
          <Line x1={54} y1={y} x2={74} y2={y} stroke={ORANGE} strokeWidth={2} />
        </G>
      ))}
      {/* skates */}
      <Rect x={24} y={128} width={24} height={8} rx={3} fill={BLACK} />
      <Rect x={52} y={128} width={24} height={8} rx={3} fill={BLACK} />

      {/* jersey torso */}
      <Path d="M30 46 Q50 40 70 46 L74 78 Q50 84 26 78 Z" fill={ORANGE} stroke={BLACK} strokeWidth={2} strokeLinejoin="round" />
      {/* shoulder caps */}
      <Path d="M28 48 Q22 50 22 60 L30 60 Z" fill={BLACK} />
      <Path d="M72 48 Q78 50 78 60 L70 60 Z" fill={BLACK} />
      {/* white chest stripe + P */}
      <Rect x={44} y={50} width={12} height={26} rx={2} fill={WHITE} opacity={0.9} />

      {/* catching glove (left) */}
      <Circle cx={16} cy={64} r={11} fill={WHITE} stroke={BLACK} strokeWidth={2} />
      <Circle cx={16} cy={64} r={4} fill={ORANGE} />
      {/* blocker (right) */}
      <Rect x={78} y={54} width={16} height={22} rx={3} fill={ORANGE} stroke={BLACK} strokeWidth={2} />

      {/* mask / helmet */}
      <Circle cx={50} cy={30} r={14} fill={WHITE} stroke={BLACK} strokeWidth={2} />
      <Path d="M50 16 L50 44 M42 20 L42 40 M58 20 L58 40" stroke={ORANGE} strokeWidth={1.6} />
      <Path d="M40 30 L60 30 M40 25 L60 25 M40 35 L60 35" stroke={BLACK} strokeWidth={1} opacity={0.5} />
    </Svg>
  );
}

export default FlyersGoalie;
