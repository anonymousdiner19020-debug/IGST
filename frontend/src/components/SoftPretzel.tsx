import React from "react";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

type Props = { size?: number };

const SALT = [
  [50, 12], [64, 16], [72, 26], [74, 40], [66, 50], [40, 15], [30, 24], [26, 40],
  [50, 46], [72, 58], [78, 70], [72, 86], [52, 96], [30, 90], [23, 72], [28, 56],
  [45, 30], [58, 34], [42, 78], [60, 82],
];

// Classic soft pretzel: glossy twisted brown knot with salt speckles.
export function SoftPretzel({ size = 32 }: Props) {
  const dark = "#6E3B10";
  const brown = "#BC6B22";
  const hi = "#DE9646";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 108">
      {/* dark outline rings */}
      <Ellipse cx={50} cy={34} rx={25} ry={24} stroke={dark} strokeWidth={21} fill="none" />
      <Ellipse cx={50} cy={72} rx={27} ry={26} stroke={dark} strokeWidth={21} fill="none" />
      {/* brown body rings */}
      <Ellipse cx={50} cy={34} rx={25} ry={24} stroke={brown} strokeWidth={15} fill="none" />
      <Ellipse cx={50} cy={72} rx={27} ry={26} stroke={brown} strokeWidth={15} fill="none" />
      {/* center twist knot */}
      <Path
        d="M36 52 C44 45 56 45 64 52 C56 59 44 59 36 52 Z"
        fill={brown}
        stroke={dark}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {/* glossy highlights */}
      <Ellipse cx={50} cy={34} rx={25} ry={24} stroke={hi} strokeWidth={4} fill="none" opacity={0.55} />
      <Ellipse cx={50} cy={72} rx={27} ry={26} stroke={hi} strokeWidth={4} fill="none" opacity={0.55} />
      {/* salt */}
      {SALT.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={1.7} fill="#F3ECD8" />
      ))}
    </Svg>
  );
}

export default SoftPretzel;
