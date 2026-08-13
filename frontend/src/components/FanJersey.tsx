import React from "react";
import Svg, { Path, Text as SvgText } from "react-native-svg";

type Props = { size?: number; color?: string; number?: string };

// A simple sports jersey in a team's colors, with a big number on the front.
export function FanJersey({ size = 28, color = "#004C54", number = "1" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* body + sleeves */}
      <Path
        d="M22 10 L42 10 L54 20 L47 28 L44 26 L44 54 Q44 56 42 56 L22 56 Q20 56 20 54 L20 26 L17 28 L10 20 Z"
        fill={color}
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* collar */}
      <Path d="M26 10 Q32 18 38 10" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
      <SvgText
        x={32}
        y={44}
        fontSize={22}
        fontWeight="bold"
        fill="#FFFFFF"
        textAnchor="middle"
      >
        {number}
      </SvgText>
    </Svg>
  );
}

export default FanJersey;
