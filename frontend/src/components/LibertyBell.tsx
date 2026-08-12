import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type Props = { size?: number };

// Flat cartoon Liberty Bell: amber bell with ridge lines, wooden yoke,
// grey side posts, strap hanger, and clapper.
export function LibertyBell({ size = 24 }: Props) {
  const orange = "#F5A623";
  const orangeStrap = "#F7B23A";
  const lip = "#E8890F";
  const ridge = "#DE7C0E";
  const wood = "#7B3F10";
  const woodLight = "#9A4E15";
  const post = "#6E6E6E";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* grey side posts */}
      <Rect x={16} y={30} width={7} height={64} rx={3.5} fill={post} />
      <Rect x={77} y={30} width={7} height={64} rx={3.5} fill={post} />

      {/* wooden yoke */}
      <Rect x={20} y={24} width={60} height={16} rx={6} fill={wood} />
      <Rect x={20} y={24} width={60} height={6} rx={3} fill={woodLight} />
      <Rect x={14} y={33} width={11} height={11} rx={2.5} fill={wood} />
      <Rect x={75} y={33} width={11} height={11} rx={2.5} fill={wood} />

      {/* strap hanger */}
      <Path d="M45 30 L55 30 L59 50 L50 45 L41 50 Z" fill={orangeStrap} />

      {/* bell body */}
      <Path
        d="M34 60 C32 52 37 47 50 47 C63 47 68 52 66 60 C68 70 74 78 81 85 L19 85 C26 78 32 70 34 60 Z"
        fill={orange}
      />
      {/* shoulder ridge lines */}
      <Path d="M37 57 C42 55 58 55 63 57" stroke={ridge} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M35 61 C42 59 58 59 65 61" stroke={ridge} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M34 65 C42 63 58 63 66 65" stroke={ridge} strokeWidth={2.6} strokeLinecap="round" fill="none" />

      {/* flared lip */}
      <Path d="M15 84 C28 79 72 79 85 84 L88 92 C74 88 26 88 12 92 Z" fill={lip} />

      {/* clapper crack */}
      <Path d="M52 66 L45 83 L54 90" stroke={ridge} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* clapper knob */}
      <Circle cx={50} cy={92} r={6} fill={orange} />
    </Svg>
  );
}

export default LibertyBell;
