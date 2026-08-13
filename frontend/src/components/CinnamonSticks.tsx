import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

type Props = { size?: number };

// Two rolled cinnamon sticks (bark quills) crossed slightly.
export function CinnamonSticks({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* back stick */}
      <Rect
        x={35}
        y={10}
        width={12}
        height={46}
        rx={6}
        fill="#A5642E"
        stroke="#7A431B"
        strokeWidth={1.5}
        transform="rotate(12 41 33)"
      />
      {/* front stick */}
      <Rect
        x={17}
        y={8}
        width={12}
        height={48}
        rx={6}
        fill="#B5723A"
        stroke="#7A431B"
        strokeWidth={1.5}
        transform="rotate(-10 23 32)"
      />
      {/* roll/curl lines on front stick */}
      <Path d="M20 14 q4 3 0 6" stroke="#7A431B" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Path d="M19 26 q4 3 0 6" stroke="#7A431B" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Path d="M18 38 q4 3 0 6" stroke="#7A431B" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      {/* roll/curl lines on back stick */}
      <Path d="M43 18 q4 3 0 6" stroke="#7A431B" strokeWidth={1} fill="none" strokeLinecap="round" />
      <Path d="M44 30 q4 3 0 6" stroke="#7A431B" strokeWidth={1} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export default CinnamonSticks;
