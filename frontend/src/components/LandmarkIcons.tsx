import React from "react";
import { Image, Text, View } from "react-native";

type IconProps = { size?: number };

// The iconic Philadelphia "LOVE" sculpture — stacked LO / VE letters in red
// with a tilted O, blue inner-face depth, and a black plinth.
export function LoveStatue({ size = 24 }: IconProps) {
  const red = "#E4002B";
  const blue = "#1F3FB0";
  const fs = size * 0.46;
  const lh = fs * 0.9;
  const Grid = ({ color, style }: { color: string; style?: any }) => (
    <View style={style}>
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        <Text style={{ color, fontWeight: "900", fontSize: fs, lineHeight: lh }}>L</Text>
        <Text
          style={{
            color,
            fontWeight: "900",
            fontSize: fs,
            lineHeight: lh,
            transform: [{ rotate: "-20deg" }],
          }}
        >
          O
        </Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center" }}>
        <Text style={{ color, fontWeight: "900", fontSize: fs, lineHeight: lh }}>V</Text>
        <Text style={{ color, fontWeight: "900", fontSize: fs, lineHeight: lh }}>E</Text>
      </View>
    </View>
  );
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {/* blue depth behind (mimics the sculpture's blue inner faces) */}
        <Grid color={blue} style={{ position: "absolute", left: size * 0.05, top: size * 0.05 }} />
        <Grid color={red} />
      </View>
      {/* black base plinth */}
      <View
        style={{
          width: size * 0.72,
          height: size * 0.1,
          backgroundColor: "#111111",
          borderRadius: size * 0.02,
          marginTop: size * 0.03,
        }}
      />
    </View>
  );
}

// William Penn statue atop City Hall tower.
const CITYHALL_SRC = require("../../assets/cityhall_penn.webp");

export function CityHallPenn({ size = 24 }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Image source={CITYHALL_SRC} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

// The Rocky statue — arms raised in triumph. Uses the supplied line-art image
// inside a circular white chip so it looks clean on any background.
const ROCKY_SRC = require("../../assets/rocky_statue.jpeg");

export function RockyStatue({ size = 24 }: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Image source={ROCKY_SRC} style={{ width: size * 0.9, height: size * 0.9 }} resizeMode="contain" />
    </View>
  );
}
