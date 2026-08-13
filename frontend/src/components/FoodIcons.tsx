import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type Props = { size?: number };

// Red ketchup squeeze bottle — mirrors the mustard bottle style.
export function KetchupBottle({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M31 5 Q33 2 35 5 L36 20 L30 20 Z" fill="#C0271F" stroke="#8E1A14" strokeWidth={1} strokeLinejoin="round" />
      <Path d="M24 19 L41 19 L38 27 L27 27 Z" fill="#D33227" stroke="#8E1A14" strokeWidth={1.2} strokeLinejoin="round" />
      <Path
        d="M27 26 L38 26 Q47 31 45.5 45 L44 58 Q44 61 40 61 L25 61 Q21 61 21 58 L19.5 45 Q18 31 27 26 Z"
        fill="#D9382B"
        stroke="#8E1A14"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path d="M25 31 Q22 44 24 56" stroke="#F07A6E" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Rect x={25} y={40} width={15} height={15} rx={3} fill="#FBF3DD" stroke="#A31D16" strokeWidth={1.4} />
      <Rect x={28.5} y={46} width={8} height={1.6} rx={0.8} fill="#A31D16" />
      <Rect x={29.5} y={49} width={6} height={1.4} rx={0.7} fill="#A31D16" />
    </Svg>
  );
}

// Sunny-side-up fried egg.
export function FriedEgg({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path
        d="M18 28 Q9 25 14 37 Q7 45 18 48 Q19 58 32 54 Q46 60 49 46 Q59 43 52 33 Q57 22 44 27 Q40 17 30 23 Q21 19 18 28 Z"
        fill="#FFF9EF"
        stroke="#EADFC8"
        strokeWidth={1.5}
      />
      <Circle cx={31} cy={38} r={9} fill="#FFC231" stroke="#F0A81E" strokeWidth={1} />
      <Circle cx={28} cy={35} r={2.4} fill="#FFE39A" />
    </Svg>
  );
}

// Golden-brown fried scrapple slice.
export function Scrapple({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={13} y={20} width={38} height={26} rx={4} fill="#7A4A22" stroke="#4F2E12" strokeWidth={1.6} />
      <Rect x={13} y={20} width={38} height={9} rx={4} fill="#9A6533" />
      <Path d="M19 34 L45 34 M19 39 L43 39" stroke="#4F2E12" strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={24} cy={26} r={1.6} fill="#3C220E" />
      <Circle cx={36} cy={25} r={1.4} fill="#3C220E" />
    </Svg>
  );
}

// Round pork roll (Taylor ham) slices with the signature edge notch.
export function PorkRoll({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={27} cy={36} r={15} fill="#E4A59E" stroke="#B26A62" strokeWidth={1.6} />
      <Circle cx={38} cy={30} r={15} fill="#EDB4AD" stroke="#B26A62" strokeWidth={1.6} />
      <Path d="M38 15 L42 22 L34 22 Z" fill="#FDFBF7" stroke="#B26A62" strokeWidth={1.2} strokeLinejoin="round" />
      <Circle cx={38} cy={30} r={7} fill="#DFA096" opacity={0.6} />
    </Svg>
  );
}

// Oil & vinegar cruet bottle for hoagies.
export function OilVinegar({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* cork/cap */}
      <Rect x={27} y={5} width={10} height={7} rx={2} fill="#8A5A2B" stroke="#5E3C18" strokeWidth={1.2} />
      {/* long neck */}
      <Rect x={29} y={11} width={6} height={12} fill="#CFE8C2" stroke="#8FB98A" strokeWidth={1.2} />
      {/* body */}
      <Path
        d="M23 23 L41 23 L44 40 Q46 56 32 57 Q18 56 20 40 Z"
        fill="#DCEBCB"
        stroke="#8FB98A"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* oil fill (amber-green) */}
      <Path d="M22 38 Q22 54 32 55 Q42 54 42 38 Z" fill="#C7B24A" opacity={0.85} />
      {/* vinegar band */}
      <Rect x={21} y={44} width={22} height={5} fill="#8E4B2E" opacity={0.5} />
      {/* highlight */}
      <Path d="M26 26 Q24 40 27 52" stroke="#F3F8ED" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function SaltPepperShaker({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={12} y={26} width={18} height={30} rx={5} fill="#F5F3EC" stroke="#B9B4A6" strokeWidth={1.6} />
      <Rect x={11} y={20} width={20} height={8} rx={3} fill="#D9D4C6" stroke="#B9B4A6" strokeWidth={1.4} />
      <Circle cx={18} cy={24} r={1.1} fill="#7C7869" />
      <Circle cx={24} cy={24} r={1.1} fill="#7C7869" />
      <Rect x={34} y={26} width={18} height={30} rx={5} fill="#3A342C" stroke="#1F1B15" strokeWidth={1.6} />
      <Rect x={33} y={20} width={20} height={8} rx={3} fill="#565046" stroke="#1F1B15" strokeWidth={1.4} />
      <Circle cx={40} cy={24} r={1.1} fill="#CFC9BB" />
      <Circle cx={46} cy={24} r={1.1} fill="#CFC9BB" />
    </Svg>
  );
}


// Spice/seasoning shaker (distinct from the plain salt shaker).
export function SeasoningShaker({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={21} y={24} width={22} height={33} rx={6} fill="#C0491F" stroke="#7C2E12" strokeWidth={1.6} />
      <Rect x={20} y={17} width={24} height={9} rx={3} fill="#8A3417" stroke="#5E2210" strokeWidth={1.4} />
      <Circle cx={27} cy={21} r={1.4} fill="#3A160A" />
      <Circle cx={32} cy={20} r={1.4} fill="#3A160A" />
      <Circle cx={37} cy={21} r={1.4} fill="#3A160A" />
      <Rect x={25} y={33} width={14} height={16} rx={2.5} fill="#FBF3DD" stroke="#7C2E12" strokeWidth={1.4} />
      <Rect x={28} y={38} width={8} height={1.6} rx={0.8} fill="#C0491F" />
      <Rect x={28.5} y={42} width={7} height={1.4} rx={0.7} fill="#C0491F" />
    </Svg>
  );
}

// Illustrated hoagie / sub sandwich for level-map cards.
export function Hoagie({ size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* bottom roll */}
      <Path d="M6 40 Q6 33 15 33 L49 33 Q58 33 58 40 Q58 47 49 47 L15 47 Q6 47 6 40 Z" fill="#E4B76F" stroke="#C08A3A" strokeWidth={1.4} />
      {/* fillings */}
      <Path d="M7 36 q5 4 10 0 q5 4 10 0 q5 4 10 0 q5 4 10 0 q4 3 6 0" stroke="#5FA85F" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Circle cx={18} cy={38} r={3} fill="#D9534F" />
      <Circle cx={34} cy={39} r={3} fill="#D9534F" />
      <Circle cx={48} cy={38} r={3} fill="#D9534F" />
      <Path d="M9 40 q6 2 12 0 q6 2 12 0 q6 2 12 0 q4 1 6 0" stroke="#B96A5C" strokeWidth={3} fill="none" strokeLinecap="round" />
      {/* top roll */}
      <Path d="M9 34 Q10 24 32 24 Q54 24 55 34 Z" fill="#EEC98A" stroke="#C08A3A" strokeWidth={1.4} strokeLinejoin="round" />
      <Circle cx={22} cy={30} r={1} fill="#C9A25E" />
      <Circle cx={34} cy={29} r={1} fill="#C9A25E" />
      <Circle cx={44} cy={30} r={1} fill="#C9A25E" />
    </Svg>
  );
}

export function Donut({ size = 24, glaze = "#F0DFB6", sprinkles = false }: Props & { glaze?: string; sprinkles?: boolean }) {
  const cx = 32;
  const cy = 32;
  const dots = [
    { x: 22, y: 22, c: "#E63946", r: 6 },
    { x: 42, y: 24, c: "#457B9D", r: -20 },
    { x: 24, y: 42, c: "#2A9D8F", r: 40 },
    { x: 40, y: 42, c: "#F4A261", r: 10 },
    { x: 32, y: 18, c: "#8E44AD", r: -35 },
    { x: 46, y: 34, c: "#E63946", r: 25 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={cx} cy={cy} r={16} stroke="#C8894A" strokeWidth={16} fill="none" />
      <Circle cx={cx} cy={cy} r={16} stroke={glaze} strokeWidth={11} fill="none" />
      {sprinkles &&
        dots.map((d, i) => (
          <Rect
            key={i}
            x={d.x - 2}
            y={d.y - 0.8}
            width={4}
            height={1.8}
            rx={0.9}
            fill={d.c}
            transform={`rotate(${d.r} ${d.x} ${d.y})`}
          />
        ))}
    </Svg>
  );
}
