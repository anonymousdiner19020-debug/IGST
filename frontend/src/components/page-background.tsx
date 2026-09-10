// Renders the active page background (motivational gradient or user photo)
// as a full-screen layer behind screen content.
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { fileUrl } from "@/src/api";
import { useBackground } from "@/src/background-context";
import { resolveActive } from "@/src/backgrounds";
import { todayStr } from "@/src/date-utils";
import { useUser } from "@/src/user-context";

// Soft wash over photos so dark journal text stays readable.
const PHOTO_SCRIM = "rgba(253,251,247,0.80)";

export function PageBackground({ date }: { date?: string }) {
  const { prefs } = useBackground();
  const { userId } = useUser();

  const item = resolveActive(prefs, date ?? todayStr());
  if (item.kind === "none") return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {item.kind === "gradient" ? (
        <LinearGradient
          colors={item.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : userId ? (
        <>
          <Image
            source={{ uri: fileUrl(item.path, userId) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: PHOTO_SCRIM }]} />
        </>
      ) : null}
    </View>
  );
}
