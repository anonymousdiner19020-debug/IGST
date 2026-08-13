import React from "react";
import { Image } from "react-native";

type Props = { size?: number };

const SRC = require("../../assets/liberty_bell.png");

// Single source of truth for the Liberty Bell icon used across the whole app
// (currency chips, tips, retry, results). Transparent PNG so it drops onto any
// background cleanly.
export function LibertyBell({ size = 24 }: Props) {
  return <Image source={SRC} style={{ width: size, height: size }} resizeMode="contain" />;
}

export default LibertyBell;
