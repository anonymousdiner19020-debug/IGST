import React from "react";
import { Image, StyleSheet, View } from "react-native";

type Props = { size?: number };

const SRC = require("../../assets/water_ice.png");

// Real photographic Philly water ice cup (red, white & blue striped cup).
// Rendered inside a circular white chip so it looks clean on any background.
export function WaterIce({ size = 32 }: Props) {
  return (
    <View
      style={[
        styles.chip,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Image source={SRC} style={{ width: size * 0.92, height: size * 0.92 }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

export default WaterIce;
