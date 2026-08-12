import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, PlayerDTO } from "@/src/api";
import { FALLBACK_DISHES, INGREDIENTS } from "@/src/constants/dishes";
import {
  BOARD_SIZE,
  Cell,
  collapseAndRefill,
  countByIngredient,
  createBoard,
  findMatches,
  isValidSwap,
  performSwap,
} from "@/src/game/board";
import { playerStorage } from "@/src/storage";
import { colors, radius, shadow, spacing } from "@/src/theme";

const { width: SCREEN_W } = Dimensions.get("window");
const BOARD_MARGIN = spacing.lg;
const BOARD_PADDING = spacing.sm;
const BOARD_WIDTH = SCREEN_W - BOARD_MARGIN * 2;
const TILE = Math.floor((BOARD_WIDTH - BOARD_PADDING * 2) / BOARD_SIZE);

export default function Game() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dishId, level } = useLocalSearchParams<{ dishId: string; level: string }>();
  const dish = useMemo(
    () => FALLBACK_DISHES.find((d) => d.id === dishId) || FALLBACK_DISHES[0],
    [dishId]
  );
  const levelNum = parseInt(level || "1", 10);

  const palette = useMemo(() => Object.keys(dish.recipe), [dish]);

  const [grid, setGrid] = useState<Cell[][]>(() => createBoard(palette));
  const [collected, setCollected] = useState<Record<string, number>>({});
  const [moves, setMoves] = useState(dish.moves);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [player, setPlayer] = useState<PlayerDTO | null>(null);
  const [resultShown, setResultShown] = useState(false);
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const id = await playerStorage.get();
      if (!id) return;
      try {
        setPlayer(await api.getPlayer(id));
      } catch {}
    })();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const orderComplete = useMemo(() => {
    return Object.entries(dish.recipe).every(([k, v]) => (collected[k] || 0) >= v);
  }, [collected, dish]);

  // Trigger end when order completed or moves hit 0
  useEffect(() => {
    if (resultShown) return;
    if (orderComplete) {
      finish(true);
    } else if (moves <= 0) {
      finish(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderComplete, moves, resultShown]);

  const finish = async (completed: boolean) => {
    setResultShown(true);
    const baseCoins = completed ? dish.reward_coins : Math.floor(score / 20);
    const bonus = completed ? Math.max(0, moves) * 5 : 0;
    const coins = baseCoins + bonus;
    const id = await playerStorage.get();
    if (id) {
      try {
        await api.completeLevel(id, {
          level: levelNum,
          dish_id: dish.id,
          score,
          coins_earned: coins,
          completed,
        });
      } catch {}
    }
    router.replace({
      pathname: "/cooking-result",
      params: {
        completed: completed ? "1" : "0",
        coins: String(coins),
        score: String(score),
        dishId: dish.id,
        nextLevel: String(levelNum + 1),
      },
    });
  };

  const processMatches = useCallback(
    async (start: Cell[][]) => {
      let current = start;
      let comboMult = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const matched = findMatches(current);
        if (matched.size === 0) break;
        const counts = countByIngredient(matched, current);
        // update collected only for recipe ingredients
        setCollected((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(counts)) {
            if (dish.recipe[k]) {
              next[k] = Math.min(dish.recipe[k], (next[k] || 0) + v);
            }
          }
          return next;
        });
        setScore((s) => s + matched.size * 10 * comboMult);
        setFlashCells(matched);
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 220));
        current = collapseAndRefill(current, matched, palette);
        setGrid(current);
        setFlashCells(new Set());
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 120));
        comboMult += 1;
      }
    },
    [dish.recipe, palette]
  );

  const handleTileTap = async (r: number, c: number) => {
    if (busy || resultShown) return;
    if (!selected) {
      setSelected({ r, c });
      return;
    }
    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }
    const adj = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
    if (!adj) {
      setSelected({ r, c });
      return;
    }
    // attempt swap
    setBusy(true);
    if (isValidSwap(grid, selected.r, selected.c, r, c)) {
      const swapped = performSwap(grid, selected.r, selected.c, r, c);
      setGrid(swapped);
      setMoves((m) => m - 1);
      setSelected(null);
      try {
        Haptics.selectionAsync();
      } catch {}
      await new Promise((r2) => setTimeout(r2, 150));
      await processMatches(swapped);
    } else {
      // invalid — briefly flash then reset
      setSelected(null);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }
    setBusy(false);
  };

  const shuffleBoard = () => {
    if (busy) return;
    setGrid(createBoard(palette));
  };

  return (
    <View style={styles.container} testID="game-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="pause-button" onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>✕</Text>
        </Pressable>
        <View style={styles.hudStat}>
          <Text style={styles.hudLabel}>MOVES</Text>
          <Text style={styles.hudValue} testID="moves-value">
            {moves}
          </Text>
        </View>
        <View style={styles.hudStat}>
          <Text style={styles.hudLabel}>SCORE</Text>
          <Text style={styles.hudValue} testID="score-value">
            {score}
          </Text>
        </View>
        <Pressable testID="shuffle-button" onPress={shuffleBoard} style={styles.iconBtn}>
          <Text style={{ fontSize: 20 }}>🔀</Text>
        </Pressable>
      </View>

      <View style={styles.boardWrap}>
        <View style={styles.board} testID="board">
          {grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cell, c) => {
                const ing = INGREDIENTS[cell];
                const isSel = selected?.r === r && selected?.c === c;
                const isFlash = flashCells.has(`${r},${c}`);
                return (
                  <Pressable
                    key={`${r}-${c}`}
                    testID={`tile-${r}-${c}`}
                    onPress={() => handleTileTap(r, c)}
                    style={[
                      styles.tile,
                      { backgroundColor: ing?.color || colors.surfaceTertiary },
                      isSel && styles.tileSelected,
                      isFlash && styles.tileFlash,
                    ]}
                  >
                    <Text style={styles.tileEmoji}>{ing?.emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.orderPanel, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderCustomer}>🧑‍🍳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderTitle} numberOfLines={1}>
              Cook: {dish.name}
            </Text>
            <Text style={styles.orderReward}>+{dish.reward_coins} 🪙 on serve</Text>
          </View>
          <Text style={styles.dishEmoji}>{dish.emoji}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {Object.entries(dish.recipe).map(([ing, need]) => {
            const have = Math.min(need, collected[ing] || 0);
            const done = have >= need;
            const info = INGREDIENTS[ing];
            return (
              <View
                key={ing}
                testID={`recipe-${ing}`}
                style={[
                  styles.recipeChip,
                  { backgroundColor: info?.color || colors.surfaceSecondary },
                  done && styles.recipeChipDone,
                ]}
              >
                <Text style={styles.recipeEmoji}>{info?.emoji || "🍽"}</Text>
                <Text style={[styles.recipeCount, done && styles.recipeCountDone]}>
                  {have}/{need}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceInverse },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surfaceInverse,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.tier1,
  },
  iconBtnText: { fontSize: 22, fontWeight: "900", color: colors.surfaceInverse },
  hudStat: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    ...shadow.tier1,
  },
  hudLabel: { fontSize: 10, fontWeight: "900", color: colors.surfaceInverse, opacity: 0.6, letterSpacing: 1 },
  hudValue: { fontSize: 22, fontWeight: "900", color: colors.surfaceInverse },
  boardWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  board: {
    width: BOARD_WIDTH,
    padding: BOARD_PADDING,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    ...shadow.tier2,
  },
  row: { flexDirection: "row" },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    margin: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  tileSelected: {
    borderColor: colors.surfaceInverse,
    borderWidth: 3,
    transform: [{ scale: 1.08 }],
  },
  tileFlash: {
    opacity: 0.35,
    transform: [{ scale: 0.85 }],
  },
  tileEmoji: { fontSize: TILE * 0.55 },
  orderPanel: {
    marginTop: "auto",
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow.tier2,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  orderCustomer: { fontSize: 34 },
  dishEmoji: { fontSize: 34 },
  orderTitle: { fontSize: 16, fontWeight: "900", color: colors.surfaceInverse },
  orderReward: { fontSize: 12, fontWeight: "700", color: colors.brandSecondary },
  chipRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingRight: spacing.md,
  },
  recipeChip: {
    height: 56,
    minWidth: 72,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(0,0,0,0.15)",
    flexShrink: 0,
  },
  recipeChipDone: {
    backgroundColor: colors.success,
    borderColor: colors.surfaceInverse,
  },
  recipeEmoji: { fontSize: 20 },
  recipeCount: { fontSize: 13, fontWeight: "900", color: colors.surfaceInverse, marginTop: 2 },
  recipeCountDone: { color: colors.onSuccess },
});
