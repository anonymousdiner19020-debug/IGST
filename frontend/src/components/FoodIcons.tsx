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

// Glazed ring donut; glaze colour distinguishes the flavour.
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
