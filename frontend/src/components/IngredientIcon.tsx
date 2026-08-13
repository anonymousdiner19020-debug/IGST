import React from "react";
import { Text, TextStyle } from "react-native";

import SoftPretzel from "./SoftPretzel";
import CinnamonSticks from "./CinnamonSticks";
import MustardBottle from "./MustardBottle";
import PhotoIngredient from "./PhotoIngredient";
import { KetchupBottle, FriedEgg, Scrapple, PorkRoll, Donut, SeasoningShaker } from "./FoodIcons";

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
  if (id === "ketchup") return <KetchupBottle size={size} />;
  if (id === "egg") return <FriedEgg size={size} />;
  if (id === "scrapple") return <Scrapple size={size} />;
  if (id === "porkroll") return <PorkRoll size={size} />;
  if (id === "seasoning") return <SeasoningShaker size={size} />;
  if (id === "vanilla_donut") return <Donut size={size} glaze="#EFDDB0" />;
  if (id === "chocolate_donut") return <Donut size={size} glaze="#6B4226" />;
  if (id === "strawberry_donut") return <Donut size={size} glaze="#F2A0B4" sprinkles />;
  return <Text style={[{ fontSize: size * 0.92 }, style]}>{emoji}</Text>;
}

export default IngredientIcon;
