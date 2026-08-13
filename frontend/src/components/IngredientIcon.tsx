import React from "react";
import { Text, TextStyle } from "react-native";

import SoftPretzel from "./SoftPretzel";
import CinnamonSticks from "./CinnamonSticks";
import MustardBottle from "./MustardBottle";
import PhotoIngredient from "./PhotoIngredient";

const CHEESE_SAUCE = require("../../assets/cheese_sauce.jpg");
const AMERICAN_CHEESE = require("../../assets/american_cheese.jpeg");
const PIZZA_SAUCE = require("../../assets/pizza_sauce.jpg");

type Props = {
  id?: string;
  emoji?: string;
  size?: number;
  style?: TextStyle;
};

// Renders a custom illustrated icon for special ingredients, else the emoji.
// Keeps ingredient artwork consistent with the dish icons across the app.
export function IngredientIcon({ id, emoji, size = 24, style }: Props) {
  if (id === "dough") return <SoftPretzel size={size} />;
  if (id === "cinnamon_sauce") return <CinnamonSticks size={size} />;
  if (id === "mustard") return <MustardBottle size={size} />;
  if (id === "cheese_sauce") return <PhotoIngredient size={size} src={CHEESE_SAUCE} />;
  if (id === "american" || id === "american_melt") return <PhotoIngredient size={size} src={AMERICAN_CHEESE} />;
  if (id === "pizza_sauce") return <PhotoIngredient size={size} src={PIZZA_SAUCE} />;
  return <Text style={[{ fontSize: size * 0.92 }, style]}>{emoji}</Text>;
}

export default IngredientIcon;
