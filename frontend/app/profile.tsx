import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, PlayerDTO } from "@/src/api";
import { FALLBACK_DISHES } from "@/src/constants/dishes";
import { playerStorage } from "@/src/storage";
import { colors, radius, shadow, spacing } from "@/src/theme";

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState<PlayerDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const id = await playerStorage.get();
      if (id) setPlayer(await api.getPlayer(id));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetProgress = async () => {
    await playerStorage.clear();
    router.replace("/");
  };

  return (
    <View style={styles.container} testID="profile-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading || !player ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.brand} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👨‍🍳</Text>
          </View>
          <Text style={styles.username} testID="profile-username">
            {player.username}
          </Text>
          <Text style={styles.subline}>Head Chef of Philadelphia</Text>

          <View style={styles.statsRow}>
            <StatCard label="COINS" value={player.coins} emoji="🪙" />
            <StatCard label="HIGH SCORE" value={player.high_score} emoji="⭐" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="DISHES COOKED" value={player.dishes_cooked} emoji="🍽" />
            <StatCard label="LEVEL" value={player.current_level} emoji="🎯" />
          </View>

          <Text style={styles.sectionTitle}>Unlocked Dishes</Text>
          <View style={styles.dishGrid}>
            {FALLBACK_DISHES.map((d) => {
              const unlocked = player.unlocked_dishes.includes(d.id);
              return (
                <View
                  key={d.id}
                  testID={`dish-${d.id}`}
                  style={[styles.dishTile, !unlocked && styles.dishTileLocked]}
                >
                  <Text style={[styles.dishEmoji, !unlocked && { opacity: 0.3 }]}>
                    {unlocked ? d.emoji : "🔒"}
                  </Text>
                  <Text
                    style={[styles.dishName, !unlocked && { opacity: 0.4 }]}
                    numberOfLines={1}
                  >
                    {d.name}
                  </Text>
                </View>
              );
            })}
          </View>

          <Pressable onPress={resetProgress} style={styles.resetBtn} testID="reset-progress-button">
            <Text style={styles.resetText}>Reset Progress</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <View style={styles.statCard} testID={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  iconBtnText: { fontSize: 28, fontWeight: "900", color: colors.surfaceInverse, marginTop: -4 },
  title: { flex: 1, fontSize: 22, fontWeight: "900", color: colors.surfaceInverse, textAlign: "center" },
  scroll: { padding: spacing.lg, alignItems: "center", gap: spacing.md },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
    marginTop: spacing.md,
  },
  avatarEmoji: { fontSize: 60 },
  username: { fontSize: 26, fontWeight: "900", color: colors.surfaceInverse },
  subline: { fontSize: 13, fontWeight: "700", color: colors.brandSecondary, marginBottom: spacing.md },
  statsRow: { flexDirection: "row", gap: spacing.md, width: "100%" },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    ...shadow.tier1,
  },
  statEmoji: { fontSize: 26 },
  statValue: { fontSize: 20, fontWeight: "900", color: colors.surfaceInverse },
  statLabel: { fontSize: 10, fontWeight: "900", color: colors.surfaceInverse, opacity: 0.6, letterSpacing: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.surfaceInverse,
    alignSelf: "flex-start",
    marginTop: spacing.lg,
  },
  dishGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    width: "100%",
    justifyContent: "space-between",
  },
  dishTile: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    ...shadow.tier1,
  },
  dishTileLocked: { backgroundColor: colors.surfaceTertiary, borderColor: colors.border },
  dishEmoji: { fontSize: 32 },
  dishName: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.surfaceInverse,
    textAlign: "center",
    marginTop: 4,
  },
  resetBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.error,
    textDecorationLine: "underline",
  },
});
