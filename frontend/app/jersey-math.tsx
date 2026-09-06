import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";
import FanJersey from "@/src/components/FanJersey";
import HowToPlay from "@/src/components/HowToPlay";

const PHILLIES_RED = "#E81828";
const PHILLIES_BLUE = "#284898";
const TOTAL_QUESTIONS = 10;
const TIME_PER_Q = 10; // seconds
const OPTIONS_PER_Q = 6;

type Question = { a: number; b: number; op: "+" | "-"; answer: number; options: number[] };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuestion(): Question {
  const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
  let a: number;
  let b: number;
  let answer: number;
  if (op === "+") {
    a = 1 + Math.floor(Math.random() * 9); // 1-9
    b = 1 + Math.floor(Math.random() * 9); // 1-9
    answer = a + b; // 2-18
  } else {
    a = 4 + Math.floor(Math.random() * 15); // 4-18
    b = 1 + Math.floor(Math.random() * (a - 1)); // 1..a-1
    answer = a - b; // 1-17
  }
  // Build unique jersey-number options including the correct answer.
  const set = new Set<number>([answer]);
  while (set.size < OPTIONS_PER_Q) {
    const delta = 1 + Math.floor(Math.random() * 6);
    const cand = Math.random() < 0.5 ? answer + delta : answer - delta;
    if (cand >= 0 && cand <= 25) set.add(cand);
  }
  return { a, b, op, answer, options: shuffle([...set]) };
}

export default function JerseyMath() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const questions = useMemo(
    () => Array.from({ length: TOTAL_QUESTIONS }, () => makeQuestion()),
    []
  );

  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [phase, setPhase] = useState<"play" | "done">("play");
  const [picked, setPicked] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const [reward, setReward] = useState<{ coins: number; correct: number; wrong: number } | null>(null);

  const lockedRef = useRef(false);
  const startRef = useRef(Date.now());
  const timerRef = useRef<any>(null);

  const current = questions[idx];
  const jerseyCols = 3;
  const jerseySize = Math.min(110, Math.floor((width - spacing.lg * 2 - spacing.md * (jerseyCols - 1)) / jerseyCols));

  const finish = useCallback(async (finalCorrect: number, finalWrong: number) => {
    setPhase("done");
    const id = await playerStorage.get();
    if (!id) {
      setReward({ coins: 0, correct: finalCorrect, wrong: finalWrong });
      return;
    }
    try {
      const res = await api.jerseyMath(id, { correct: finalCorrect, wrong: finalWrong });
      setReward({ coins: res.coins_awarded, correct: res.correct, wrong: res.wrong });
      sound.play("coin");
    } catch {
      setReward({ coins: 0, correct: finalCorrect, wrong: finalWrong });
    }
  }, []);

  const advance = useCallback(
    (nextCorrect: number, nextWrong: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (idx + 1 >= TOTAL_QUESTIONS) {
        finish(nextCorrect, nextWrong);
      } else {
        setIdx((i) => i + 1);
        setPicked(null);
        lockedRef.current = false;
      }
    },
    [idx, finish]
  );

  const handlePick = (value: number) => {
    if (lockedRef.current || phase !== "play") return;
    lockedRef.current = true;
    setPicked(value);
    const isRight = value === current.answer;
    let nc = correct;
    let nw = wrong;
    if (isRight) {
      nc += 1;
      setCorrect(nc);
      sound.play("serve");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      nw += 1;
      setWrong(nw);
      sound.play("error");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    }
    setTimeout(() => advance(nc, nw), 650);
  };

  const handleTimeout = useCallback(() => {
    if (lockedRef.current || phase !== "play") return;
    lockedRef.current = true;
    setPicked(-999); // sentinel: none picked
    const nw = wrong + 1;
    setWrong(nw);
    sound.play("error");
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setTimeout(() => advance(correct, nw), 650);
  }, [advance, correct, wrong, phase]);

  // Per-question countdown timer.
  useEffect(() => {
    if (phase !== "play" || showHelp) return;
    startRef.current = Date.now();
    setTimeLeft(TIME_PER_Q);
    lockedRef.current = false;
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const remaining = Math.max(0, TIME_PER_Q - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        handleTimeout();
      }
    }, 100);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, showHelp]);

  if (phase === "done") {
    const perAnswer = reward ? reward.wrong <= 3 : true;
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.resultWrap} testID="jersey-math-result">
          <Text style={styles.resultEmoji}>⚾</Text>
          <Text style={styles.resultTitle}>BONUS ROUND DONE!</Text>
          <View style={styles.resultCoinPill}>
            <Text style={styles.resultCoinText}>+{reward?.coins ?? 0} 🪙</Text>
          </View>
          <View style={styles.resultStatsRow}>
            <View style={styles.resultStat}>
              <Text style={[styles.resultStatVal, { color: colors.success }]}>{reward?.correct ?? correct}</Text>
              <Text style={styles.resultStatLabel}>CORRECT</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={[styles.resultStatVal, { color: colors.error }]}>{reward?.wrong ?? wrong}</Text>
              <Text style={styles.resultStatLabel}>WRONG</Text>
            </View>
          </View>
          <Text style={styles.resultNote}>
            {perAnswer
              ? "Great aim! You earned 10 coins per correct answer."
              : "More than 3 misses — 10-coin consolation. Sharpen up next time!"}
          </Text>
          <Pressable
            testID="jersey-math-continue"
            onPress={() => router.replace("/level-map")}
            style={({ pressed }) => [styles.continueBtn, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const timePct = Math.round((timeLeft / TIME_PER_Q) * 100);
  const timeColor = timeLeft > 5 ? colors.success : timeLeft > 2.5 ? colors.warning : colors.error;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚾ MINI 1</Text>
        <Text style={styles.headerSub}>Tap the jersey with the answer!</Text>
      </View>

      <View style={styles.topRow}>
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{idx + 1} / {TOTAL_QUESTIONS}</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={[styles.scoreText, { color: colors.success }]}>✓ {correct}</Text>
          <Text style={[styles.scoreText, { color: colors.error }]}>✗ {wrong}</Text>
        </View>
      </View>

      <View style={styles.equationCard} testID="equation-card">
        <Text style={styles.equationText}>
          {current.a} {current.op} {current.b} = ?
        </Text>
      </View>

      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${timePct}%`, backgroundColor: timeColor }]} testID="timer-bar" />
      </View>
      <Text style={[styles.timerLabel, { color: timeColor }]}>{Math.ceil(timeLeft)}s</Text>

      <View style={styles.jerseyGrid}>
        {current.options.map((n, i) => {
          const isPicked = picked === n;
          const showRight = lockedRef.current && n === current.answer;
          const showWrong = isPicked && n !== current.answer;
          return (
            <Pressable
              key={`${idx}-${n}-${i}`}
              testID={`jersey-${n}`}
              onPress={() => handlePick(n)}
              style={({ pressed }) => [
                styles.jerseyBtn,
                { width: jerseySize + 12 },
                showRight && styles.jerseyRight,
                showWrong && styles.jerseyWrong,
                pressed && !lockedRef.current && { transform: [{ scale: 0.94 }] },
              ]}
            >
              <FanJersey size={jerseySize} color={PHILLIES_RED} number={String(n)} pinstripe />
            </Pressable>
          );
        })}
      </View>

      <HowToPlay
        visible={showHelp}
        emoji="⚾"
        title="How to Play — Mini 1"
        steps={[
          "A math problem shows at the top, like 7 + 2 = ?",
          "Tap the Phillies jersey with the correct answer number.",
          "You get 10 seconds per question — 10 questions in all.",
          "3 or fewer wrong earns 10 coins per correct answer!",
        ]}
        onDismiss={() => setShowHelp(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    backgroundColor: PHILLIES_RED,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: PHILLIES_BLUE,
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
    backgroundColor: PHILLIES_BLUE,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  counterText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
  scorePill: { flexDirection: "row", gap: spacing.md },
  scoreText: { fontSize: 16, fontWeight: "900" },
  equationCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: PHILLIES_BLUE,
  },
  equationText: { fontSize: 44, fontWeight: "900", color: colors.surfaceInverse, letterSpacing: 2 },
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
  jerseyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  jerseyBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  jerseyRight: { borderColor: colors.success, backgroundColor: "#E7F8EF" },
  jerseyWrong: { borderColor: colors.error, backgroundColor: "#FDE8E8" },
  resultWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  resultEmoji: { fontSize: 56 },
  resultTitle: { fontSize: 24, fontWeight: "900", color: PHILLIES_RED, letterSpacing: 1 },
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
    backgroundColor: PHILLIES_BLUE,
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
