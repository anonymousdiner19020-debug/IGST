import React from "react";
import Svg, { Line, Path, Text as SvgText } from "react-native-svg";

type Props = {
  size?: number;
  body?: string;
  number?: string;
  name?: string;
  numberColor?: string;
  outline?: string;
  trim?: string;
};

const TORSO = "M21 13 L43 13 L43 55 Q43 58 40 58 L24 58 Q21 58 21 55 Z";
const LEFT_SLEEVE = "M22 13 L7 21 L11 32 L23 25 Z";
const RIGHT_SLEEVE = "M42 13 L57 21 L53 32 L41 25 Z";

// Generic baseball/football jersey BACK view: solid body, player name arched
// above a big centered number. Used by the Eagles matching mini-game.
export function JerseyBack({
  size = 64,
  body = "#128A3C",
  number = "1",
  name = "",
  numberColor = "#FFFFFF",
  outline = "#000000",
  trim = "#FFFFFF",
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* fabric */}
      <Path d={LEFT_SLEEVE} fill={body} stroke={trim} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={RIGHT_SLEEVE} fill={body} stroke={trim} strokeWidth={0.8} strokeLinejoin="round" />
      <Path d={TORSO} fill={body} stroke={trim} strokeWidth={0.8} strokeLinejoin="round" />

      {/* sleeve cuff trim aligned to the sleeve edges */}
      <Line x1={7} y1={21} x2={11} y2={32} stroke={numberColor} strokeWidth={1.4} strokeLinecap="round" />
      <Line x1={57} y1={21} x2={53} y2={32} stroke={numberColor} strokeWidth={1.4} strokeLinecap="round" />

      {/* back crew collar */}
      <Path d="M26 13 Q32 16.5 38 13" fill="none" stroke={numberColor} strokeWidth={1.6} strokeLinecap="round" />

      {/* player name arched above the number */}
      {name ? (
        <SvgText
          x={32}
          y={25}
          fontSize={6}
          fontWeight="bold"
          fill={numberColor}
          stroke={outline}
          strokeWidth={0.4}
          paintOrder="stroke"
          textAnchor="middle"
          textLength={30}
          lengthAdjust="spacingAndGlyphs"
        >
          {name.toUpperCase()}
        </SvgText>
      ) : null}

      {/* big centered number */}
      <SvgText
        x={32}
        y={44}
        fontSize={18}
        fontWeight="bold"
        fill={numberColor}
        stroke={outline}
        strokeWidth={1.1}
        paintOrder="stroke"
        textAnchor="middle"
      >
        {number}
      </SvgText>
    </Svg>
  );
}

export default JerseyBack;
