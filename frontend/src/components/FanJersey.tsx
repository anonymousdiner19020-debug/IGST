import React, { useRef } from "react";
import Svg, { ClipPath, Defs, G, Line, Path, Text as SvgText } from "react-native-svg";

type Props = { size?: number; color?: string; number?: string; pinstripe?: boolean };

const TEE_PATH =
  "M22 10 L42 10 L54 20 L47 28 L44 26 L44 54 Q44 56 42 56 L22 56 Q20 56 20 54 L20 26 L17 28 L10 20 Z";

// Realistic baseball jersey pieces (Phillies home look).
const TORSO = "M21 13 L43 13 L43 55 Q43 58 40 58 L24 58 Q21 58 21 55 Z";
const LEFT_SLEEVE = "M22 13 L7 21 L11 32 L23 25 Z";
const RIGHT_SLEEVE = "M42 13 L57 21 L53 32 L41 25 Z";
const PHILS_BLUE = "#79BDEE";

// A sports jersey. Default: solid team color with a white number.
// pinstripe=true: realistic white Phillies-style jersey with red pinstripes.
export function FanJersey({ size = 28, color = "#004C54", number = "1", pinstripe = false }: Props) {
  // Stable unique id so multiple jerseys don't share a clipPath on web.
  const idRef = useRef(`jersey_${Math.random().toString(36).slice(2, 9)}`);
  const clipId = idRef.current;

  if (pinstripe) {
    const stripeXs = [10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54];
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={TORSO} />
            <Path d={LEFT_SLEEVE} />
            <Path d={RIGHT_SLEEVE} />
          </ClipPath>
        </Defs>

        {/* Phillies-blue fabric base */}
        <Path d={LEFT_SLEEVE} fill={PHILS_BLUE} />
        <Path d={RIGHT_SLEEVE} fill={PHILS_BLUE} />
        <Path d={TORSO} fill={PHILS_BLUE} />

        {/* subtle darker pinstripes clipped to the fabric */}
        <G clipPath={`url(#${clipId})`}>
          {stripeXs.map((x) => (
            <Line key={x} x1={x} y1={8} x2={x} y2={60} stroke="#5AA0D6" strokeWidth={0.8} opacity={0.6} />
          ))}
        </G>

        {/* white outlines over the fabric */}
        <Path d={LEFT_SLEEVE} fill="none" stroke="#FFFFFF" strokeWidth={0.8} strokeLinejoin="round" />
        <Path d={RIGHT_SLEEVE} fill="none" stroke="#FFFFFF" strokeWidth={0.8} strokeLinejoin="round" />
        <Path d={TORSO} fill="none" stroke="#FFFFFF" strokeWidth={0.8} strokeLinejoin="round" />

        {/* red sleeve cuff bands */}
        <Line x1={9} y1={21.5} x2={12.5} y2={31.5} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        <Line x1={55} y1={21.5} x2={51.5} y2={31.5} stroke={color} strokeWidth={1.4} strokeLinecap="round" />

        {/* back crew collar: red trim with white inner line */}
        <Path d="M26 13 Q32 16.5 38 13" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M27.5 13.6 Q32 15.6 36.5 13.6" fill="none" stroke="#FFFFFF" strokeWidth={0.9} strokeLinecap="round" />

        {/* big back number in red outlined in white (Phillies style) */}
        <SvgText
          x={32}
          y={41}
          fontSize={17}
          fontWeight="bold"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth={1}
          paintOrder="stroke"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {number}
        </SvgText>
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* body + sleeves */}
      <Path d={TEE_PATH} fill={color} stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round" />
      {/* collar */}
      <Path d="M26 10 Q32 18 38 10" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
      <SvgText x={32} y={44} fontSize={22} fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        {number}
      </SvgText>
    </Svg>
  );
}

export default FanJersey;
