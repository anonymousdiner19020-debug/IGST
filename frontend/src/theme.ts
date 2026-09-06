// Design tokens for Aura — "Hand-Drawn / Journal" aesthetic. Light theme only.
//
// The keys match the "color" block of /app/design_guidelines.json. Colors come
// from here; components build sheets with makeStyles() and read useTheme().colors
// for color props. Never write color literals in components.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FDFBF7",
  onSurface: "#2D2B2A",
  surfaceSecondary: "#F4EFE6",
  onSurfaceSecondary: "#3F3C3A",
  surfaceTertiary: "#EAE4D9",
  onSurfaceTertiary: "#4F4C49",
  surfaceInverse: "#33312E",
  onSurfaceInverse: "#FDFBF7",
  muted: "#88837E",

  brand: "#89937C",
  onBrand: "#FDFBF7",
  brandPrimary: "#77826B",
  onBrandPrimary: "#FDFBF7",
  brandSecondary: "#B5BCA9",
  onBrandSecondary: "#2D2B2A",
  brandTertiary: "#DCE0D5",
  onBrandTertiary: "#4F4C49",

  success: "#5D7052",
  onSuccess: "#FFFFFF",
  warning: "#C29243",
  onWarning: "#FFFFFF",
  error: "#B35D50",
  onError: "#FFFFFF",
  info: "#667C82",
  onInfo: "#FFFFFF",

  border: "#EAE4D9",
  borderStrong: "#CDC6BC",
  divider: "#EAE4D9",
};

// Font family names — registered via expo-font in app/_layout.tsx.
export const fonts = {
  display: "Fraunces-SemiBold",
  displayBold: "Fraunces-Bold",
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
