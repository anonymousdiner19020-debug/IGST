import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { FALLBACK_DISHES } from "@/src/constants/dishes";
import { colors, radius, shadow, spacing } from "@/src/theme";

export default function CookingResult() {
  const router = useRouter();
  const { completed, coins, score, dishId, nextLevel } = useLocalSearchParams<{
    completed: string;
    coins: string;
    score: string;
    dishId: string;
    nextLevel: string;
  }>();
  const dish = FALLBACK_DISHES.find((d) => d.id === dishId) || FALLBACK_DISHES[0];
  const win = completed === "1";
  const nextIdx = parseInt(nextLevel || "2", 10);
  const nextDish = FALLBACK_DISHES.find((d) => d.unlock_level === nextIdx);

  return (
    <View style={styles.overlay} testID="cooking-result-screen">
      <View style={styles.card}>
        <View
          style={[
            styles.header,
            { backgroundColor: win ? colors.success : colors.warning },
          ]}
        >
          <Text style={styles.headerEmoji}>{win ? "🎉" : "🥲"}</Text>
          <Text style={styles.headerTitle}>{win ? "ORDER SERVED!" : "OUT OF MOVES"}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.dishBadge}>
            <Text style={styles.dishEmoji}>{dish.emoji}</Text>
          </View>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishMsg}>
            {win ? "Fresh, hot, and delicious!" : "Try that recipe again."}
          </Text>

          <View style={styles.statsRow}>
            <Stat label="COINS" value={`+${coins}`} emoji="🪙" tone="brand" testID="coins-earned" />
            <Stat label="SCORE" value={score} emoji="⭐" tone="tertiary" testID="score-earned" />
          </View>

          {win && nextDish && (
            <View style={styles.unlockBanner} testID="unlock-banner">
              <Text style={styles.unlockLabel}>NEXT UP</Text>
              <Text style={styles.unlockDish}>
                {nextDish.emoji} {nextDish.name}
              </Text>
            </View>
          )}

          <Pressable
            testID="continue-button"
            onPress={() => router.replace("/level-map")}
            style={({ pressed }) => [
              styles.cta,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Text style={styles.ctaText}>{win ? "Continue" : "Back to Map"}</Text>
          </Pressable>

          <Pressable testID="home-button" onPress={() => router.replace("/")}>
            <Text style={styles.homeLink}>Home</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  emoji,
  tone,
  testID,
}: {
  label: string;
  value: string;
  emoji: string;
  tone: "brand" | "tertiary";
  testID: string;
}) {
  return (
    <View
      testID={testID}
      style={[
        styles.statCard,
        { backgroundColor: tone === "brand" ? colors.brand : colors.brandTertiary },
      ]}
    >
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.statValue,
          { color: tone === "brand" ? colors.onBrand : colors.onBrandTertiary },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.statLabel,
          { color: tone === "brand" ? colors.onBrand : colors.onBrandTertiary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow.tier3,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  header: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  headerEmoji: { fontSize: 40 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  body: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  dishBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  dishEmoji: { fontSize: 56 },
  dishName: { fontSize: 22, fontWeight: "900", color: colors.surfaceInverse },
  dishMsg: { fontSize: 14, color: colors.surfaceInverse, opacity: 0.6, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
    marginVertical: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1, opacity: 0.8 },
  unlockBanner: {
    width: "100%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  unlockLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: colors.brandSecondary,
    letterSpacing: 2,
  },
  unlockDish: { fontSize: 16, fontWeight: "900", color: colors.surfaceInverse, marginTop: 4 },
  cta: {
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.onBrandSecondary,
    letterSpacing: 1,
  },
  homeLink: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.surfaceInverse,
    opacity: 0.6,
    marginTop: spacing.sm,
    textDecorationLine: "underline",
  },
});
