import React from "react";
import { Image, StyleSheet, View } from "react-native";

type Props = { size?: number; src: any };

// Shared circular white-chip photo icon for photographic ingredient art.
export function PhotoIngredient({ size = 24, src }: Props) {
  return (
    <View
      style={[styles.chip, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Image source={src} style={{ width: size, height: size }} resizeMode="cover" />
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

export default PhotoIngredient;
