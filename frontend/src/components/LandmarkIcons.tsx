import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = { size?: number };

// The iconic Philadelphia "LOVE" sculpture — stacked LO / VE letters in red.
export function LoveStatue({ size = 24 }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.16,
        backgroundColor: "#E4002B",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: size * 0.08,
      }}
    >
      <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: size * 0.36, lineHeight: size * 0.4 }}>
        LO
      </Text>
      <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: size * 0.36, lineHeight: size * 0.4 }}>
        VE
      </Text>
    </View>
  );
}

// William Penn statue atop City Hall tower.
export function CityHallPenn({ size = 24 }: IconProps) {
  const stone = "#CFCBB6";
  const stoneD = "#A8A48F";
  const dark = "#4A4A44";
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* base building */}
      <Rect x={12} y={46} width={40} height={14} rx={1.5} fill={stone} stroke={stoneD} strokeWidth={1} />
      <Rect x={16} y={50} width={4} height={6} fill={stoneD} />
      <Rect x={24} y={50} width={4} height={6} fill={stoneD} />
      <Rect x={36} y={50} width={4} height={6} fill={stoneD} />
      <Rect x={44} y={50} width={4} height={6} fill={stoneD} />
      {/* tower */}
      <Path d="M25 46 L39 46 L37 22 L27 22 Z" fill={stone} stroke={stoneD} strokeWidth={1} strokeLinejoin="round" />
      {/* clock */}
      <Circle cx={32} cy={34} r={3.6} fill="#FFFFFF" stroke={dark} strokeWidth={1.2} />
      <Path d="M32 34 L32 31.6 M32 34 L33.7 34" stroke={dark} strokeWidth={0.9} strokeLinecap="round" />
      {/* tower cap */}
      <Path d="M27 22 L37 22 L35 17 L29 17 Z" fill={stoneD} />
      {/* pedestal */}
      <Rect x={30} y={13} width={4} height={4} fill={dark} />
      {/* William Penn figure */}
      <Circle cx={32} cy={9} r={2.4} fill={dark} />
      <Path d="M29.5 11 L34.5 11 L33.5 14 L30.5 14 Z" fill={dark} />
      <Path d="M28.5 8.4 L35.5 8.4" stroke={dark} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

// The Rocky statue — arms raised in triumph on a pedestal.
export function RockyStatue({ size = 24 }: IconProps) {
  const bronze = "#C77B3B";
  const bronzeD = "#8A5324";
  const stone = "#7C7C7C";
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* pedestal */}
      <Rect x={16} y={50} width={32} height={8} rx={1.5} fill={stone} />
      <Rect x={12} y={56} width={40} height={5} rx={1.5} fill="#5F5F5F" />
      {/* legs */}
      <Path d="M30 38 L28 50" stroke={bronze} strokeWidth={4} strokeLinecap="round" />
      <Path d="M34 38 L36 50" stroke={bronze} strokeWidth={4} strokeLinecap="round" />
      {/* torso */}
      <Path d="M27 22 L37 22 L35 39 L29 39 Z" fill={bronze} stroke={bronzeD} strokeWidth={1} strokeLinejoin="round" />
      {/* arms raised in a V */}
      <Path d="M28 24 L20 11" stroke={bronze} strokeWidth={4} strokeLinecap="round" />
      <Path d="M36 24 L44 11" stroke={bronze} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={20} cy={10} r={2.6} fill={bronze} />
      <Circle cx={44} cy={10} r={2.6} fill={bronze} />
      {/* head */}
      <Circle cx={32} cy={16} r={4.2} fill={bronze} stroke={bronzeD} strokeWidth={1} />
    </Svg>
  );
}
