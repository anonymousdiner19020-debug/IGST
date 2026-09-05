import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

type Props = { code?: string; size?: number; fallback?: string };

const LOGOS: Record<string, any> = {
  eagles: require("../../assets/eagles_logo.webp"),
  phillies: require("../../assets/phillies_logo.png"),
  flyers: require("../../assets/flyers_logo.png"),
  sixers: require("../../assets/sixers_logo.png"),
};

// Renders a Philadelphia team logo image, with an emoji fallback for teams
// that don't have a provided logo (e.g. Sixers).
export function TeamLogo({ code, size = 32, fallback = "🏀" }: Props) {
  const src = code ? LOGOS[code] : undefined;
  if (!src) {
    return <Text style={{ fontSize: size * 0.9 }}>{fallback}</Text>;
  }
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={src} style={{ width: size * 0.82, height: size * 0.82 }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
});

export default TeamLogo;
