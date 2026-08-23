import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";
import JerseyBack from "@/src/components/JerseyBack";

const EAGLES_GREEN = "#128A3C";
const EAGLES_DARK = "#0A3D1F";
const PAIRS = 10;
const TIME_LIMIT = 45; // seconds
const COLS = 4;

type Player = { number: string; name: string };
type Tile = { id: number; number: string; name: string };

const ROSTER: Player[] = [
  { number: "1", name: "Hurts" },
  { number: "26", name: "Barkley" },
  { number: "6", name: "Smith" },
  { number: "88", name: "Goedert" },
  { number: "68", name: "Mailata" },
  { number: "69", name: "Dickerson" },
  { number: "51", name: "Jurgen" },
  { number: "56", name: "Steen" },
  { number: "65", name: "Johnson" },
  { number: "98", name: "Carter" },
  { number: "90", name: "Davis" },
  { number: "52", name: "Greenard" },
  { number: "53", name: "Baun" },
  { number: "27", name: "Mitchell" },
  { number: "4", name: "Elliott" },
  { number: "7", name: "Jaworski" },
  { number: "5", name: "McNabb" },
  { number: "15", name: "Van Buren" },
  { number: "20", name: "Dawkins" },
  { number: "92", name: "White" },
  { number: "9", name: "Foles" },
  { number: "62", name: "Kelce" },
  { number: "55", name: "Johnson" },
  { number: "12", name: "Cunningham" },
  { number: "83", name: "Papale" },
  { number: "99", name: "Brown" },
  { number: "25", name: "McCoy" },
  { number: "66", name: "Bergey" },
  { number: "17", name: "Carmichael" },
  { number: "54", name: "Trotter" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTiles(): Tile[] {
  const picked = shuffle(ROSTER).slice(0, PAIRS);
  const tiles: Tile[] = [];
  picked.forEach((p) => {
    tiles.push({ id: 0, number: p.number, name: p.name });
    tiles.push({ id: 0, number: p.number, name: p.name });
  });
  return shuffle(tiles).map((t, i) => ({ ...t, id: i }));
}

export default function EaglesFlip() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const tiles = useMemo(() => buildTiles(), []);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [phase, setPhase] = useState<"play" | "done">("play");
  const [reward, setReward] = useState<{ coins: number; completed: boolean; misses: number } | null>(null);

  const busyRef = useRef(false);
  const startRef = useRef(Date.now());
  const timerRef = useRef<any>(null);
  const finishedRef = useRef(false);
  const missesRef = useRef(0);

  const tileW = Math.floor((width - spacing.lg * 2 - spacing.sm * (COLS - 1)) / COLS);

  const finish = useCallback(async (completed: boolean, finalMisses: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("done");
    const id = await playerStorage.get();
    if (!id) {
      setReward({ coins: 0, completed, misses: finalMisses });
      return;
    }
    try {
      const res = await api.eaglesMatch(id, { completed, misses: finalMisses });
      setReward({ coins: res.coins_awarded, completed, misses: finalMisses });
      sound.play("coin");
    } catch {
      setReward({ coins: 0, completed, misses: finalMisses });
    }
  }, []);

  const handleFlip = (tile: Tile) => {
    if (busyRef.current || phase !== "play") return;
    if (matched.includes(tile.id) || flipped.includes(tile.id)) return;

    if (flipped.length === 0) {
      setFlipped([tile.id]);
      sound.play("ding");
      return;
    }

    const firstId = flipped[0];
    const first = tiles[firstId];
    setFlipped([firstId, tile.id]);
    busyRef.current = true;

    if (first.number === tile.number) {
      sound.play("serve");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setTimeout(() => {
        const nextMatched = [...matched, firstId, tile.id];
        setMatched(nextMatched);
        setFlipped([]);
        busyRef.current = false;
        if (nextMatched.length >= PAIRS * 2) {
          finish(true, missesRef.current);
        }
      }, 450);
    } else {
      const nextMisses = misses + 1;
      missesRef.current = nextMisses;
      setMisses(nextMisses);
      sound.play("error");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setTimeout(() => {
        setFlipped([]);
        busyRef.current = false;
      }, 800);
    }
  };

  useEffect(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, TIME_LIMIT - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        finish(false, missesRef.current);
      }
    }, 200);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "done") {
    const won = reward ? reward.completed && reward.misses <= 3 : false;
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.resultWrap} testID="eagles-flip-result">
          <Text style={styles.resultEmoji}>🦅</Text>
          <Text style={[styles.resultTitle, { color: won ? EAGLES_GREEN : colors.error }]}>
            {won ? "FLY EAGLES FLY!" : "TOUGH BREAK!"}
          </Text>
          <View style={styles.resultCoinPill}>
            <Text style={styles.resultCoinText}>+{reward?.coins ?? 0} 🪙</Text>
          </View>
          <View style={styles.resultStatsRow}>
            <View style={styles.resultStat}>
              <Text style={[styles.resultStatVal, { color: EAGLES_GREEN }]}>
                {reward ? (reward.completed ? PAIRS : matched.length / 2) : 0}
              </Text>
              <Text style={styles.resultStatLabel}>PAIRS</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={[styles.resultStatVal, { color: colors.error }]}>{reward?.misses ?? misses}</Text>
              <Text style={styles.resultStatLabel}>MISSES</Text>
            </View>
          </View>
          <Text style={styles.resultNote}>
            {won
              ? "All 10 pairs matched! 100 coins minus 10 per miss."
              : reward && !reward.completed
              ? "Time ran out before all pairs matched — 5-coin consolation."
              : "More than 3 misses — 5-coin consolation. Try again!"}
          </Text>
          <Pressable
            testID="eagles-flip-continue"
            onPress={() => router.replace("/level-map")}
            style={({ pressed }) => [styles.continueBtn, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const timePct = Math.round((timeLeft / TIME_LIMIT) * 100);
  const timeColor = timeLeft > 20 ? colors.success : timeLeft > 8 ? colors.warning : colors.error;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🦅 MINI 7</Text>
        <Text style={styles.headerSub}>Flip & match the Eagles jerseys!</Text>
      </View>

      <View style={styles.topRow}>
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{matched.length / 2} / {PAIRS} pairs</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={[styles.scoreText, { color: colors.error }]}>✗ {misses}</Text>
        </View>
      </View>

      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${timePct}%`, backgroundColor: timeColor }]} testID="timer-bar" />
      </View>
      <Text style={[styles.timerLabel, { color: timeColor }]}>{Math.ceil(timeLeft)}s</Text>

      <View style={styles.grid}>
        {tiles.map((t) => {
          const isMatched = matched.includes(t.id);
          const isFlipped = flipped.includes(t.id) || isMatched;
          return (
            <Pressable
              key={t.id}
              testID={`tile-${t.id}`}
              onPress={() => handleFlip(t)}
              style={({ pressed }) => [
                styles.tile,
                { width: tileW, height: tileW * 1.1 },
                isMatched && styles.tileMatched,
                !isFlipped && styles.tileBack,
                pressed && !busyRef.current && !isFlipped && { transform: [{ scale: 0.95 }] },
              ]}
            >
              {isFlipped ? (
                <JerseyBack size={tileW * 0.86} body={EAGLES_GREEN} number={t.number} name={t.name} />
              ) : (
                <Text style={styles.tileBackIcon}>🦅</Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    backgroundColor: EAGLES_GREEN,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: EAGLES_DARK,
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  headerSub: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", opacity: 0.9, marginTop: 2 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  counterPill: {
    backgroundColor: EAGLES_DARK,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  counterText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
  scorePill: { flexDirection: "row", gap: spacing.md },
  scoreText: { fontSize: 16, fontWeight: "900" },
  timerTrack: {
    height: 14,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerFill: { height: "100%", borderRadius: radius.pill },
  timerLabel: { textAlign: "center", fontSize: 13, fontWeight: "900", marginTop: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tileBack: { backgroundColor: EAGLES_DARK, borderColor: EAGLES_GREEN },
  tileMatched: { borderColor: EAGLES_GREEN, backgroundColor: "#E7F6EC" },
  tileBackIcon: { fontSize: 30 },
  resultWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  resultEmoji: { fontSize: 56 },
  resultTitle: { fontSize: 24, fontWeight: "900", letterSpacing: 1 },
  resultCoinPill: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
    ...shadow.tier2,
  },
  resultCoinText: { fontSize: 28, fontWeight: "900", color: colors.onBrand },
  resultStatsRow: { flexDirection: "row", gap: spacing.xxxl, marginTop: spacing.sm },
  resultStat: { alignItems: "center" },
  resultStatVal: { fontSize: 34, fontWeight: "900" },
  resultStatLabel: { fontSize: 11, fontWeight: "900", color: colors.surfaceTertiary, letterSpacing: 1 },
  resultNote: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.surfaceInverse,
    opacity: 0.7,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  continueBtn: {
    backgroundColor: EAGLES_GREEN,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  continueText: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
});
