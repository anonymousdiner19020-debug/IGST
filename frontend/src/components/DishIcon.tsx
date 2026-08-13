import React from "react";
import { Text, TextStyle } from "react-native";

import Cheesesteak from "./Cheesesteak";
import SoftPretzel from "./SoftPretzel";
import RoastPork from "./RoastPork";
import WaterIce from "./WaterIce";
import PhotoIngredient from "./PhotoIngredient";
import { Donut } from "./FoodIcons";

const AMERICAN_HOAGIE = require("../../assets/american_hoagie.png");
const ITALIAN_HOAGIE = require("../../assets/italian_hoagie.png");
const TOMATO_PIE = require("../../assets/tomato_pie.png");
const SEASONED_FRIES = require("../../assets/seasoned_fries.webp");
const SCRAPPLE_EC = require("../../assets/scrapple_ec.png");
const PORKROLL_EC = require("../../assets/porkroll_ec.png");

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
  if (id === "water_ice") return <WaterIce size={size} />;
  if (id === "donuts") return <Donut size={size} glaze="#F2A0B4" sprinkles />;
  if (id === "american_hoagie") return <PhotoIngredient size={size} src={AMERICAN_HOAGIE} />;
  if (id === "italian_hoagie") return <PhotoIngredient size={size} src={ITALIAN_HOAGIE} />;
  if (id === "tomato_pie") return <PhotoIngredient size={size} src={TOMATO_PIE} />;
  if (id === "seasoned_fries") return <PhotoIngredient size={size} src={SEASONED_FRIES} />;
  if (id === "scrapple_ec") return <PhotoIngredient size={size} src={SCRAPPLE_EC} />;
  if (id === "porkroll_ec") return <PhotoIngredient size={size} src={PORKROLL_EC} />;
  return <Text style={[{ fontSize: size * 0.92 }, style]}>{emoji}</Text>;
}

export default DishIcon;
