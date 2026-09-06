import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";
import HowToPlay from "@/src/components/HowToPlay";

// Philadelphia 76ers colors.
const SIXERS_BLUE = "#006BB6";
const SIXERS_RED = "#ED174C";
const SIXERS_NAVY = "#002B5C";

const N = 12;
const WORD_COUNT = 5;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Player surnames provided by the user (letters only, uppercased).
const NAMES = [
  "JAMES", "BROWN", "MAXEY", "EMBIID", "SIMONS", "WADE", "EDGECOMBE", "BONA",
  "LOVE", "BARLOW", "HUKPORTI", "PHILON", "WALKER", "EDWARDS", "RUPERS", "MILES",
];

// Directions: right, down, diagonal down-right, diagonal up-right (no reversed words).
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Puzzle = { grid: string[][]; words: string[]; placements: Record<string, string[]> };

function makePuzzle(): Puzzle {
  const words = shuffle(NAMES).slice(0, WORD_COUNT);
  for (let attempt = 0; attempt < 400; attempt++) {
    const grid: (string | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
    const placements: Record<string, string[]> = {};
    let ok = true;

    for (const w of words) {
      const len = w.length;
      let placed = false;
      for (let t = 0; t < 300 && !placed; t++) {
        const [dr, dc] = DIRS[randInt(0, DIRS.length - 1)];
        const startR = dr === 0 ? randInt(0, N - 1) : dr > 0 ? randInt(0, N - len) : randInt(len - 1, N - 1);
        const startC = dc === 0 ? randInt(0, N - 1) : randInt(0, N - len);
        const cells: [number, number][] = [];
        let fits = true;
        for (let i = 0; i < len; i++) {
          const r = startR + dr * i;
          const c = startC + dc * i;
          if (r < 0 || r >= N || c < 0 || c >= N) {
            fits = false;
            break;
          }
          const existing = grid[r][c];
          if (existing && existing !== w[i]) {
            fits = false;
            break;
          }
          cells.push([r, c]);
        }
        if (!fits) continue;
        cells.forEach(([r, c], i) => {
          grid[r][c] = w[i];
        });
        placements[w] = cells.map(([r, c]) => `${r}-${c}`);
        placed = true;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!grid[r][c]) grid[r][c] = LETTERS[randInt(0, 25)];
      }
    }
    return { grid: grid as string[][], words, placements };
  }
  // Extremely unlikely fallback: empty-ish grid.
  const grid = Array.from({ length: N }, () => Array.from({ length: N }, () => LETTERS[randInt(0, 25)]));
  return { grid, words, placements: {} };
}

function lineBetween(a: [number, number], b: [number, number]): [number, number][] | null {
  const dr = b[0] - a[0];
  const dc = b[1] - a[1];
  const straight = dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc);
  if (!straight) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const cells: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push([a[0] + sr * i, a[1] + sc * i]);
  }
  return cells;
}

export default function WordSearch() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const puzzle = useMemo(() => makePuzzle(), []);
  const cell = Math.floor((Math.min(width, 460) - spacing.md * 2 - 2) / N);
  const fontSize = Math.max(11, Math.round(cell * 0.5));

  const [start, setStart] = useState<[number, number] | null>(null);
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(true);
  const [reward, setReward] = useState<{ coins: number } | null>(null);
  const [done, setDone] = useState(false);
  const finishedRef = useRef(false);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDone(true);
    const id = await playerStorage.get();
    if (!id) {
      setReward({ coins: 0 });
      return;
    }
    try {
      const res = await api.wordSearch(id, { completed: true, found: WORD_COUNT });
      setReward({ coins: res.coins_awarded });
      sound.play("coin");
    } catch {
      setReward({ coins: 0 });
    }
  }, []);

  const handleCell = (r: number, c: number) => {
    if (done) return;
    const key = `${r}-${c}`;
    if (start === null) {
      setStart([r, c]);
      sound.play("ding");
      return;
    }
    if (start[0] === r && start[1] === c) {
      setStart(null);
      return;
    }
    const line = lineBetween(start, [r, c]);
    if (!line) {
      // not a straight line — treat this tap as a new start point
      setStart([r, c]);
      sound.play("ding");
      return;
    }
    const str = line.map(([rr, cc]) => puzzle.grid[rr][cc]).join("");
    const rev = str.split("").reverse().join("");
    const remaining = puzzle.words.filter((w) => !foundWords.includes(w));
    const hit = remaining.find((w) => w === str || w === rev);
    setStart(null);
    if (hit) {
      const nextFoundCells = new Set(foundCells);
      line.forEach(([rr, cc]) => nextFoundCells.add(`${rr}-${cc}`));
      setFoundCells(nextFoundCells);
      const nextWords = [...foundWords, hit];
      setFoundWords(nextWords);
      sound.play("serve");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      if (nextWords.length >= WORD_COUNT) {
        finish();
      }
    } else {
      sound.play("error");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.resultWrap} testID="word-search-result">
          <Text style={styles.resultEmoji}>🏀</Text>
          <Text style={[styles.resultTitle, { color: SIXERS_BLUE }]}>TRUST THE PROCESS!</Text>
          <View style={styles.resultCoinPill}>
            <Text style={styles.resultCoinText}>+{reward?.coins ?? 0} 🪙</Text>
          </View>
          <Text style={styles.resultNote}>You found all 5 Sixers — nice work!</Text>
          <Pressable
            testID="word-search-continue"
            onPress={() => router.replace("/level-map")}
            style={({ pressed }) => [styles.continueBtn, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏀 MINI 4</Text>
        <Text style={styles.headerSub}>76ers Word Search</Text>
        <Text style={styles.progress}>
          {foundWords.length} / {WORD_COUNT} found
        </Text>
      </View>

      <View style={styles.boardWrap}>
        <View style={[styles.board, { width: cell * N + 2 }]}>
          {puzzle.grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((ch, c) => {
                const key = `${r}-${c}`;
                const isFound = foundCells.has(key);
                const isStart = start && start[0] === r && start[1] === c;
                return (
                  <Pressable
                    key={key}
                    testID={`cell-${r}-${c}`}
                    onPress={() => handleCell(r, c)}
                    style={[
                      styles.cell,
                      { width: cell, height: cell },
                      isFound && { backgroundColor: SIXERS_BLUE },
                      isStart && { backgroundColor: SIXERS_RED },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        { fontSize },
                        (isFound || isStart) && { color: "#FFFFFF" },
                      ]}
                    >
                      {ch}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.wordList}>
        {puzzle.words.map((w) => {
          const got = foundWords.includes(w);
          return (
            <View key={w} style={[styles.wordChip, got && { backgroundColor: SIXERS_BLUE, borderColor: SIXERS_BLUE }]}>
              <Text style={[styles.wordChipText, got && styles.wordChipTextDone]}>{w}</Text>
            </View>
          );
        })}
      </View>

      <HowToPlay
        visible={showHelp}
        emoji="🏀"
        title="How to Play — Mini 4"
        steps={[
          "Five Philadelphia 76ers are hidden in the letter grid.",
          "Tap the first letter of a name, then tap its last letter.",
          "Names run across, down, or diagonally — no timer, take your time.",
          "Find all 5 names to earn 100 coins!",
        ]}
        onDismiss={() => setShowHelp(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SIXERS_NAVY },
  header: { alignItems: "center", paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  headerSub: { fontSize: 15, fontWeight: "800", color: SIXERS_RED, marginTop: 2 },
  progress: { fontSize: 14, fontWeight: "800", color: "#FFFFFF", marginTop: spacing.xs, opacity: 0.9 },

  boardWrap: { alignItems: "center", marginTop: spacing.sm },
  board: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: 1,
    borderWidth: 3,
    borderColor: SIXERS_RED,
    ...shadow.tier2,
  },
  row: { flexDirection: "row" },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
  },
  cellText: { fontWeight: "900", color: SIXERS_NAVY },

  wordList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  wordChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: SIXERS_RED,
  },
  wordChipText: { fontSize: 14, fontWeight: "900", color: SIXERS_NAVY, letterSpacing: 0.5 },
  wordChipTextDone: { color: "#FFFFFF", textDecorationLine: "line-through" },

  resultWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  resultEmoji: { fontSize: 72 },
  resultTitle: { fontSize: 28, fontWeight: "900", letterSpacing: 1 },
  resultCoinPill: {
    backgroundColor: "#FFFFFF",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: SIXERS_RED,
  },
  resultCoinText: { fontSize: 26, fontWeight: "900", color: SIXERS_NAVY },
  resultNote: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", textAlign: "center", opacity: 0.9 },
  continueBtn: {
    marginTop: spacing.lg,
    backgroundColor: SIXERS_RED,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.pill,
    ...shadow.tier2,
  },
  continueText: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
});
