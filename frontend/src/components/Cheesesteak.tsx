import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

type Props = { size?: number };

// Cartoon Philly cheesesteak: hoagie roll, brown steak pile, and melty cheese with drips.
export function Cheesesteak({ size = 32 }: Props) {
  const outline = "#2B1A0E";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 72">
      {/* bottom roll */}
      <Path
        d="M10 44 C8 36 16 32 28 32 L72 32 C86 32 94 38 92 46 C90 56 78 62 62 62 L34 62 C20 62 12 54 10 44 Z"
        fill="#CE9A54"
        stroke={outline}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {/* top roll */}
      <Path
        d="M16 32 C16 18 32 12 52 12 C74 12 90 18 90 30 C90 35 85 38 78 38 L24 38 C19 38 16 36 16 32 Z"
        fill="#E6B36A"
        stroke={outline}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {/* top roll highlight + sesame */}
      <Path d="M26 22 C34 17 66 17 80 22" stroke="#F3D9A6" strokeWidth={4} strokeLinecap="round" opacity={0.85} />
      <Circle cx={34} cy={26} r={1.4} fill="#F6E3B4" />
      <Circle cx={46} cy={23} r={1.4} fill="#F6E3B4" />
      <Circle cx={60} cy={24} r={1.4} fill="#F6E3B4" />
      <Circle cx={71} cy={28} r={1.4} fill="#F6E3B4" />

      {/* steak filling */}
      <Path
        d="M20 36 C30 32 44 35 54 37 C66 39 76 37 84 40 C86 47 78 52 66 53 C50 55 32 54 22 49 C16 46 16 40 20 36 Z"
        fill="#7B4A2A"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <Path d="M30 42 C40 40 52 43 62 42" stroke="#5C3418" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <Path d="M33 47 C44 46 56 48 66 46" stroke="#5C3418" strokeWidth={2} strokeLinecap="round" opacity={0.5} />

      {/* melty cheese with drips */}
      <Path
        d="M40 35 C52 34 66 36 78 40 C82 44 80 50 74 51 L74 58 C70 60 68 55 68 52 C64 53 60 53 56 52 L56 60 C52 62 50 56 51 52 C46 51 42 49 40 46 C36 43 36 37 40 35 Z"
        fill="#F4C531"
        stroke={outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <Path d="M46 39 C56 38 66 40 74 43" stroke="#FBE08A" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
    </Svg>
  );
}

export default Cheesesteak;
