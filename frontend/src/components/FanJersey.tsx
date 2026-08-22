import React, { useRef } from "react";
import Svg, { ClipPath, Defs, G, Line, Path, Text as SvgText } from "react-native-svg";

type Props = { size?: number; color?: string; number?: string; pinstripe?: boolean };

const BODY_PATH =
  "M22 10 L42 10 L54 20 L47 28 L44 26 L44 54 Q44 56 42 56 L22 56 Q20 56 20 54 L20 26 L17 28 L10 20 Z";

// A simple sports jersey. Default: solid team color with a white number.
// pinstripe=true: white jersey with team-colored vertical pinstripes (Phillies home look).
export function FanJersey({ size = 28, color = "#004C54", number = "1", pinstripe = false }: Props) {
  // Stable unique id so multiple jerseys don't share a clipPath on web.
  const idRef = useRef(`jersey_${Math.random().toString(36).slice(2, 9)}`);
  const clipId = idRef.current;

  if (pinstripe) {
    const stripeXs = [24, 28, 32, 36, 40];
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={BODY_PATH} />
          </ClipPath>
        </Defs>
        {/* white body */}
        <Path d={BODY_PATH} fill="#FFFFFF" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        {/* red pinstripes clipped to the body */}
        <G clipPath={`url(#${clipId})`}>
          {stripeXs.map((x) => (
            <Line key={x} x1={x} y1={8} x2={x} y2={58} stroke={color} strokeWidth={1.2} />
          ))}
        </G>
        {/* collar */}
        <Path d="M26 10 Q32 18 38 10" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <SvgText x={32} y={44} fontSize={22} fontWeight="bold" fill={color} textAnchor="middle" stroke="#FFFFFF" strokeWidth={0.6}>
          {number}
        </SvgText>
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* body + sleeves */}
      <Path d={BODY_PATH} fill={color} stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round" />
      {/* collar */}
      <Path d="M26 10 Q32 18 38 10" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
      <SvgText x={32} y={44} fontSize={22} fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        {number}
      </SvgText>
    </Svg>
  );
}

export default FanJersey;
