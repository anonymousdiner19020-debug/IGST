import React from "react";
import { Text, TextStyle } from "react-native";

import Cheesesteak from "./Cheesesteak";
import SoftPretzel from "./SoftPretzel";
import RoastPork from "./RoastPork";

type Props = {
  id?: string;
  emoji: string;
  size?: number;
  style?: TextStyle;
};

// Renders a custom illustrated icon for special dishes, else the dish emoji.
export function DishIcon({ id, emoji, size = 32, style }: Props) {
  if (id === "cheesesteak") return <Cheesesteak size={size} />;
  if (id === "soft_pretzel") return <SoftPretzel size={size} />;
  if (id === "roast_pork") return <RoastPork size={size} />;
  return <Text style={[{ fontSize: size * 0.92 }, style]}>{emoji}</Text>;
}

export default DishIcon;
