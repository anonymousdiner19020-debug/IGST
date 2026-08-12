import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api";
import { FALLBACK_DISHES } from "@/src/constants/dishes";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";

export default function CookingResult() {
  const router = useRouter();
  const { completed, coins, bells, score, dishId, nextLevel, level, served, total } =
    useLocalSearchParams<{
      completed: string;
      coins: string;
      bells: string;
      score: string;
      dishId: string;
      nextLevel: string;
      level: string;
      served: string;
      total: string;
    }>();
  const dish = FALLBACK_DISHES.find((d) => d.id === dishId) || FALLBACK_DISHES[0];
  const win = completed === "1";
  const nextIdx = parseInt(nextLevel || "2", 10);
  const nextDish = FALLBACK_DISHES.find((d) => d.unlock_level === nextIdx);
  const bellsEarned = parseInt(bells || "0", 10);
  const retryLevel = parseInt(level || "1", 10);

  const [myBells, setMyBells] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const id = await playerStorage.get();
      if (!id) return;
      try {
        const p = await api.getPlayer(id);
        setMyBells(p.bells);
      } catch {}
    })();
  }, []);

  const retryWithBell = async () => {
    const id = await playerStorage.get();
    if (!id) return;
    if ((myBells ?? 0) < 1) {
      setNote("Not enough Liberty Bells");
      return;
    }
    setRetrying(true);
    try {
      await api.spendBells(id, 1);
      sound.play("ding");
      router.replace({ pathname: "/game", params: { dishId, level: String(retryLevel) } });
    } catch {
      setNote("Couldn't retry");
      setRetrying(false);
    }
  };

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
          <Text style={styles.headerTitle}>{win ? "ORDER SERVED!" : "LEVEL FAILED"}</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.dishBadge}>
            <Text style={styles.dishEmoji}>{dish.emoji}</Text>
          </View>
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishMsg}>
            {win
              ? `Served ${served || 0}/${total || 0} customers!`
              : "The rush beat you — retry to nail it."}
          </Text>

          <View style={styles.statsRow}>
            <Stat label="COINS" value={`+${coins}`} emoji="🪙" tone="brand" testID="coins-earned" />
            <Stat label="BELLS" value={`+${bellsEarned}`} emoji="🔔" tone="tertiary" testID="bells-earned" />
            <Stat label="SCORE" value={score} emoji="⭐" tone="secondary" testID="score-earned" />
          </View>

          {win && nextDish && (
            <View style={styles.unlockBanner} testID="unlock-banner">
              <Text style={styles.unlockLabel}>NEXT UP</Text>
              <Text style={styles.unlockDish}>
                {nextDish.emoji} {nextDish.name}
              </Text>
            </View>
          )}

          {!win && (
            <Pressable
              testID="retry-bell-button"
              onPress={retryWithBell}
              disabled={retrying}
              style={({ pressed }) => [styles.retryBtn, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <Text style={styles.retryText}>
                {retrying ? "Retrying…" : "Retry Level  🔔 1"}
              </Text>
              <Text style={styles.retrySub}>You have {myBells ?? "…"} 🔔</Text>
            </Pressable>
          )}

          {note && (
            <Pressable testID="buy-bells-link" onPress={() => router.replace("/coin-store")}>
              <Text style={styles.noteText}>{note} — Get more 🔔</Text>
            </Pressable>
          )}

          <Pressable
            testID="continue-button"
            onPress={() => router.replace("/level-map")}
            style={({ pressed }) => [
              styles.cta,
              !win && styles.ctaGhost,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <Text style={[styles.ctaText, !win && styles.ctaGhostText]}>
              {win ? "Continue" : "Back to Map"}
            </Text>
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
  tone: "brand" | "tertiary" | "secondary";
  testID: string;
}) {
  const bg =
    tone === "brand" ? colors.brand : tone === "tertiary" ? colors.brandTertiary : colors.brandSecondary;
  const fg =
    tone === "brand" ? colors.onBrand : tone === "tertiary" ? colors.onBrandTertiary : colors.onBrandSecondary;
  return (
    <View
      testID={testID}
      style={[styles.statCard, { backgroundColor: bg }]}
    >
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: "900" },
  statLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1, opacity: 0.8 },
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
  retryBtn: {
    width: "100%",
    backgroundColor: colors.brandTertiary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.sm,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
    ...shadow.tier2,
  },
  retryText: { fontSize: 18, fontWeight: "900", color: colors.onBrandTertiary, letterSpacing: 1 },
  retrySub: { fontSize: 11, fontWeight: "800", color: colors.onBrandTertiary, opacity: 0.85, marginTop: 2 },
  noteText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.error,
    textDecorationLine: "underline",
    marginTop: spacing.sm,
  },
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
  ctaGhost: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.borderStrong,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.onBrandSecondary,
    letterSpacing: 1,
  },
  ctaGhostText: { color: colors.surfaceInverse },
  homeLink: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.surfaceInverse,
    opacity: 0.6,
    marginTop: spacing.sm,
    textDecorationLine: "underline",
  },
});
