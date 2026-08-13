import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

type Props = { size?: number };

// Cartoon yellow mustard squeeze bottle with a pointed nozzle cap and label.
export function MustardBottle({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* nozzle tip */}
      <Path d="M31 5 Q33 2 35 5 L36 20 L30 20 Z" fill="#F2A20C" stroke="#D98908" strokeWidth={1} strokeLinejoin="round" />
      {/* cap collar */}
      <Path d="M24 19 L41 19 L38 27 L27 27 Z" fill="#F7BE2E" stroke="#D98908" strokeWidth={1.2} strokeLinejoin="round" />
      {/* body */}
      <Path
        d="M27 26 L38 26 Q47 31 45.5 45 L44 58 Q44 61 40 61 L25 61 Q21 61 21 58 L19.5 45 Q18 31 27 26 Z"
        fill="#FBB315"
        stroke="#D98908"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* left highlight */}
      <Path d="M25 31 Q22 44 24 56" stroke="#FFD974" strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* label */}
      <Rect x={25} y={40} width={15} height={15} rx={3} fill="#FBF3DD" stroke="#C9922E" strokeWidth={1.4} />
      <Rect x={28.5} y={46} width={8} height={1.6} rx={0.8} fill="#C9922E" />
      <Rect x={29.5} y={49} width={6} height={1.4} rx={0.7} fill="#C9922E" />
    </Svg>
  );
}

export default MustardBottle;
