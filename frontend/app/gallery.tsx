import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, PlayerDTO } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { colors, radius, shadow, spacing } from "@/src/theme";
import { CityHallPenn, LoveStatue, RockyStatue } from "@/src/components/LandmarkIcons";
import LibertyBell from "@/src/components/LibertyBell";

type Badge = {
  key: string;
  name: string;
  blurb: string;
  levelsNeeded: number;
  Icon: React.ComponentType<{ size?: number }>;
};

// Collectible Philadelphia landmarks, unlocked as the player beats levels.
const BADGES: Badge[] = [
  { key: "love", name: "LOVE Statue", blurb: "Beat your 1st level", levelsNeeded: 1, Icon: LoveStatue },
  { key: "bell", name: "Liberty Bell", blurb: "Beat 2 levels", levelsNeeded: 2, Icon: LibertyBell },
  { key: "cityhall", name: "City Hall", blurb: "Beat 4 levels", levelsNeeded: 4, Icon: CityHallPenn },
  { key: "rocky", name: "Rocky Statue", blurb: "Beat 6 levels", levelsNeeded: 6, Icon: RockyStatue },
];

export default function Gallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState<PlayerDTO | null>(null);

  useEffect(() => {
    (async () => {
      const id = await playerStorage.get();
      if (!id) return;
      try {
        setPlayer(await api.getPlayer(id));
      } catch {}
    })();
  }, []);

  const levelsBeaten = Math.max(0, (player?.current_level ?? 1) - 1);
  const unlockedCount = BADGES.filter((b) => levelsBeaten >= b.levelsNeeded).length;

  return (
    <View style={styles.container} testID="gallery-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="gallery-back" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Landmark Badges</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>
            {unlockedCount}/{BADGES.length}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        <Text style={styles.subtitle}>Collect the icons of Philadelphia by beating levels!</Text>
        {BADGES.map((b) => {
          const unlocked = levelsBeaten >= b.levelsNeeded;
          return (
            <View
              key={b.key}
              testID={`badge-${b.key}`}
              style={[styles.card, unlocked ? styles.cardOn : styles.cardOff]}
            >
              <View style={[styles.iconWrap, !unlocked && { opacity: 0.25 }]}>
                <b.Icon size={64} />
              </View>
              {!unlocked && (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockEmoji}>🔒</Text>
                </View>
              )}
              <Text style={[styles.badgeName, !unlocked && styles.textOff]}>{b.name}</Text>
              <Text style={[styles.badgeBlurb, unlocked && styles.blurbOn]}>
                {unlocked ? "Unlocked!" : b.blurb}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 28, fontWeight: "900", color: colors.surfaceInverse, marginTop: -4 },
  title: { flex: 1, fontSize: 22, fontWeight: "900", color: colors.surfaceInverse },
  countPill: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  countText: { color: colors.onBrand, fontWeight: "900", fontSize: 14 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: spacing.lg,
    gap: spacing.md,
  },
  subtitle: {
    width: "100%",
    fontSize: 14,
    fontWeight: "700",
    color: colors.surfaceInverse,
    opacity: 0.7,
    marginBottom: spacing.sm,
  },
  card: {
    width: "47%",
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    ...shadow.tier1,
  },
  cardOn: { backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.success },
  cardOff: { backgroundColor: colors.surfaceSecondary, borderWidth: 3, borderColor: colors.border },
  iconWrap: { marginBottom: spacing.sm },
  lockOverlay: { position: "absolute", top: spacing.md, right: spacing.md },
  lockEmoji: { fontSize: 22 },
  badgeName: { fontSize: 15, fontWeight: "900", color: colors.surfaceInverse, textAlign: "center" },
  textOff: { opacity: 0.5 },
  badgeBlurb: { fontSize: 12, fontWeight: "700", color: colors.surfaceInverse, opacity: 0.55, marginTop: 2 },
  blurbOn: { color: colors.success, opacity: 1 },
});
