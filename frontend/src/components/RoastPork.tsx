import React from "react";
import { Image, StyleSheet, View } from "react-native";

type Props = { size?: number };

const SRC = require("../../assets/roast_pork.jpeg");

// Real photographic Philly roast pork sandwich. Rendered inside a circular
// white chip so it looks clean and consistent on any background color.
export function RoastPork({ size = 32 }: Props) {
  return (
    <View
      style={[
        styles.chip,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Image source={SRC} style={{ width: size, height: size }} resizeMode="cover" />
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

export default RoastPork;
