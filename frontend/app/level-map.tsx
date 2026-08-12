import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, PlayerDTO } from "@/src/api";
import { FALLBACK_DISHES } from "@/src/constants/dishes";
import { playerStorage } from "@/src/storage";
import { colors, radius, shadow, spacing } from "@/src/theme";

export default function LevelMap() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState<PlayerDTO | null>(null);

  const load = useCallback(async () => {
    const id = await playerStorage.get();
    if (!id) return;
    try {
      setPlayer(await api.getPlayer(id));
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentLevel = player?.current_level ?? 1;

  return (
    <View style={styles.container} testID="level-map-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-home" onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Level Map</Text>
        <View style={styles.coinChip}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{player?.coins ?? 0}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Cook every Philly classic</Text>
        {FALLBACK_DISHES.map((dish, i) => {
          const unlocked = dish.unlock_level <= currentLevel;
          const isCurrent = dish.unlock_level === currentLevel;
          const done = dish.unlock_level < currentLevel;
          const align = i % 2 === 0 ? "flex-start" : "flex-end";
          return (
            <View key={dish.id} style={[styles.nodeRow, { alignItems: align }]}>
              <Pressable
                testID={`level-${dish.unlock_level}`}
                disabled={!unlocked}
                onPress={() =>
                  router.push({
                    pathname: "/game",
                    params: { dishId: dish.id, level: String(dish.unlock_level) },
                  })
                }
                style={({ pressed }) => [
                  styles.node,
                  !unlocked && styles.nodeLocked,
                  done && styles.nodeDone,
                  isCurrent && styles.nodeCurrent,
                  pressed && unlocked && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <Text style={styles.nodeEmoji}>{unlocked ? dish.emoji : "🔒"}</Text>
                <Text
                  style={[
                    styles.nodeLevel,
                    !unlocked && { color: colors.surfaceInverse, opacity: 0.4 },
                  ]}
                >
                  Lvl {dish.unlock_level}
                </Text>
                <Text
                  style={[
                    styles.nodeName,
                    !unlocked && { color: colors.surfaceInverse, opacity: 0.4 },
                  ]}
                  numberOfLines={1}
                >
                  {dish.name}
                </Text>
                {done && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>✓</Text>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontSize: 28, color: colors.surfaceInverse, fontWeight: "900", marginTop: -4 },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    color: colors.surfaceInverse,
  },
  coinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  coinEmoji: { fontSize: 16 },
  coinText: { fontSize: 14, fontWeight: "900", color: colors.onBrand },
  scroll: { padding: spacing.lg, gap: spacing.md },
  subtitle: {
    fontSize: 14,
    color: colors.surfaceInverse,
    opacity: 0.6,
    marginBottom: spacing.md,
    fontWeight: "700",
    textAlign: "center",
  },
  nodeRow: { width: "100%" },
  node: {
    width: 190,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    gap: spacing.xs,
  },
  nodeCurrent: {
    backgroundColor: colors.brand,
    borderColor: colors.surfaceInverse,
  },
  nodeDone: {
    backgroundColor: colors.success,
    borderColor: colors.surfaceInverse,
  },
  nodeLocked: {
    backgroundColor: colors.surfaceTertiary,
    borderColor: colors.border,
  },
  nodeEmoji: { fontSize: 44 },
  nodeLevel: { fontSize: 12, fontWeight: "900", color: colors.surfaceInverse, letterSpacing: 1 },
  nodeName: { fontSize: 15, fontWeight: "800", color: colors.surfaceInverse },
  doneBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: colors.surfaceInverse,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  doneBadgeText: { color: "#FFFFFF", fontWeight: "900" },
});
