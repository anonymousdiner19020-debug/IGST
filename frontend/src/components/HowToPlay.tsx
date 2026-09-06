import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, shadow, spacing } from "@/src/theme";

type Props = {
  visible: boolean;
  title?: string;
  emoji?: string;
  steps: string[];
  onDismiss: () => void;
  buttonLabel?: string;
};

// Shared "How to Play" overlay used across the mini-games so every game
// explains its rules the same way before the player starts.
export default function HowToPlay({
  visible,
  title = "How to Play",
  emoji = "🎮",
  steps,
  onDismiss,
  buttonLabel = "Got it! 👍",
}: Props) {
  if (!visible) return null;
  return (
    <View style={styles.overlay} testID="howto-overlay">
      <View style={styles.card}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <Text style={styles.num}>{i + 1}</Text>
            <Text style={styles.text}>{s}</Text>
          </View>
        ))}
        <Pressable
          testID="howto-got-it"
          onPress={onDismiss}
          style={({ pressed }) => [styles.btn, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Text style={styles.btnText}>{buttonLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    zIndex: 100,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 3,
    borderColor: colors.brand,
    ...shadow.tier3,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: "900", color: colors.surfaceInverse },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md, width: "100%" },
  num: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    color: colors.onBrand,
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 28,
    overflow: "hidden",
  },
  text: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.surfaceInverse, lineHeight: 19 },
  btn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brandSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
    ...shadow.tier2,
  },
  btnText: { fontSize: 18, fontWeight: "900", color: colors.onBrandSecondary, letterSpacing: 1 },
});
