import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, PlayerDTO } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";

const REPLAY_COST = 25;

type Mini = {
  key: string;
  route: string;
  emoji: string;
  name: string;
  desc: string;
  level: number; // level after which this mini first plays
  color: string;
};

// A mini becomes replayable once the player has finished the level it unlocks after
// (current_level > level). Kept in sync with cooking-result.tsx routing.
const MINIS: Mini[] = [
  { key: "jersey-math", route: "/jersey-math", emoji: "⚾", name: "Mini 1 · Jersey Math", desc: "Solve equations on the Phillies jerseys", level: 3, color: "#284898" },
  { key: "eagles-match", route: "/eagles-match", emoji: "🦅", name: "Mini 2 · Eagles Match", desc: "Match all 10 jersey number pairs", level: 6, color: "#128A3C" },
  { key: "hockey-shootout", route: "/hockey-shootout", emoji: "🏒", name: "Mini 3 · Hockey Shootout", desc: "Beat the Flyers goalie — 10 shots", level: 8, color: "#F74902" },
  { key: "word-search", route: "/word-search", emoji: "🏀", name: "Mini 4 · 76ers Word Search", desc: "Find 5 hidden Sixers names", level: 10, color: "#006BB6" },
  { key: "eagles-flip", route: "/eagles-flip", emoji: "🃏", name: "Mini 7 · Eagles Flip", desc: "Memory-match the Eagles jerseys", level: 12, color: "#0A3D1F" },
];

export default function MiniGames() {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerDTO | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = await playerStorage.get();
    if (!id) return;
    try {
      const p = await api.getPlayer(id);
      setPlayer(p);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const play = async (mini: Mini) => {
    if (busy) return;
    setMsg(null);
    const id = await playerStorage.get();
    if (!id) return;
    if ((player?.coins ?? 0) < REPLAY_COST) {
      setMsg("Not enough coins — you need 25 🪙 to replay.");
      return;
    }
    setBusy(mini.key);
    try {
      const res = await api.replayMini(id);
      setPlayer(res.player);
      sound.play("coin");
      router.push(mini.route as any);
    } catch (e: any) {
      setMsg(e?.message?.includes("Not enough") ? "Not enough coins — you need 25 🪙 to replay." : "Couldn't start replay. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const currentLevel = player?.current_level ?? 1;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="minis-back" onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Mini-Games</Text>
        <View style={styles.coinPill}>
          <Text style={styles.coinText}>{player?.coins ?? 0} 🪙</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>Replay any mini-game you've unlocked for 25 coins.</Text>
      {msg && <Text style={styles.msg}>{msg}</Text>}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {MINIS.map((m) => {
          const unlocked = currentLevel > m.level;
          const affordable = (player?.coins ?? 0) >= REPLAY_COST;
          return (
            <View key={m.key} style={styles.card} testID={`mini-card-${m.key}`}>
              <View style={[styles.iconWrap, { backgroundColor: m.color }]}>
                <Text style={styles.icon}>{m.emoji}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{m.name}</Text>
                <Text style={styles.cardDesc}>{m.desc}</Text>
              </View>
              {unlocked ? (
                <Pressable
                  testID={`mini-play-${m.key}`}
                  disabled={!!busy || !affordable}
                  onPress={() => play(m)}
                  style={({ pressed }) => [
                    styles.playBtn,
                    { backgroundColor: m.color },
                    (!affordable || busy === m.key) && styles.playBtnDim,
                    pressed && { transform: [{ scale: 0.95 }] },
                  ]}
                >
                  <Text style={styles.playBtnText}>{busy === m.key ? "…" : "Replay"}</Text>
                  <Text style={styles.playBtnCost}>25 🪙</Text>
                </Pressable>
              ) : (
                <View style={styles.lockPill} testID={`mini-lock-${m.key}`}>
                  <Text style={styles.lockText}>🔒 Lvl {m.level + 1}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: { paddingVertical: spacing.xs, paddingRight: spacing.md },
  backText: { fontSize: 17, fontWeight: "800", color: colors.brand },
  title: { fontSize: 22, fontWeight: "900", color: colors.surfaceInverse },
  coinPill: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    ...shadow.tier1,
  },
  coinText: { fontSize: 15, fontWeight: "900", color: colors.surfaceInverse },
  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.onSurface,
    opacity: 0.6,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  msg: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.error,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow.tier2,
  },
  iconWrap: { width: 54, height: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 30 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: "900", color: colors.surfaceInverse },
  cardDesc: { fontSize: 13, fontWeight: "600", color: colors.onSurface, opacity: 0.6, marginTop: 2 },
  playBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    minWidth: 74,
  },
  playBtnDim: { opacity: 0.45 },
  playBtnText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  playBtnCost: { fontSize: 12, fontWeight: "800", color: "#FFFFFF", opacity: 0.95 },
  lockPill: {
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    minWidth: 74,
    alignItems: "center",
  },
  lockText: { fontSize: 13, fontWeight: "800", color: colors.onSurface, opacity: 0.6 },
});
