import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";

const BOARD_MARGIN = spacing.lg;
const BOARD_PADDING = spacing.sm;
const MAX_TILES = 6;

function buildPalette(baseKeys: string[], toppings: string[]): string[] {
  const set: string[] = [...new Set(baseKeys)];
  for (const t of toppings) {
    if (set.length >= MAX_TILES) break;
    if (!set.includes(t)) set.push(t);
  }
  return set;
}

export default function Game() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const BOARD_WIDTH = Math.min(winW, 460) - BOARD_MARGIN * 2;
  const TILE = Math.floor((BOARD_WIDTH - BOARD_PADDING * 2) / BOARD_SIZE);
  const { dishId, level } = useLocalSearchParams<{ dishId: string; level: string }>();
  const dish = useMemo(
    () => FALLBACK_DISHES.find((d) => d.id === dishId) || FALLBACK_DISHES[0],
    [dishId]
  );
  const levelNum = parseInt(level || "1", 10);

  const baseKeys = useMemo(() => Object.keys(dish.base_recipe), [dish]);
  const palette = useMemo(() => buildPalette(baseKeys, dish.topping_options), [baseKeys, dish]);
  const paletteToppings = useMemo(
    () => palette.filter((p) => dish.topping_options.includes(p)),
    [palette, dish]
  );

  const [grid, setGrid] = useState<Cell[][]>(() => createBoard(palette));
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [moves, setMoves] = useState(dish.moves);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set());
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    sound.preload();
  }, []);

  const baseMet = useMemo(
    () => Object.entries(dish.base_recipe).every(([k, v]) => (inventory[k] || 0) >= v),
    [inventory, dish]
  );

  useEffect(() => {
    if (ended) return;
    if (baseMet) {
      goToServe();
    } else if (moves <= 0) {
      failLevel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMet, moves, ended]);

  const goToServe = () => {
    setEnded(true);
    sound.play("ding");
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    router.replace({
      pathname: "/serve",
      params: {
        dishId: dish.id,
        level: String(levelNum),
        score: String(score),
        inventory: JSON.stringify(inventory),
        toppings: JSON.stringify(paletteToppings),
        movesLeft: String(moves),
      },
    });
  };

  const failLevel = () => {
    setEnded(true);
    sound.play("error");
    router.replace({
      pathname: "/cooking-result",
      params: {
        completed: "0",
        coins: String(Math.floor(score / 25)),
        score: String(score),
        dishId: dish.id,
        served: "0",
        nextLevel: String(levelNum + 1),
      },
    });
  };

  const processMatches = useCallback(
    async (start: Cell[][]) => {
      let current = start;
      let mult = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const matched = findMatches(current);
        if (matched.size === 0) break;
        const counts = countByIngredient(matched, current);
        setInventory((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(counts)) {
            next[k] = (next[k] || 0) + v;
          }
          return next;
        });
        setScore((s) => s + matched.size * 10 * mult);
        setCombo(mult);
        setFlashCells(matched);
        sound.play("pop");
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 200));
        current = collapseAndRefill(current, matched, palette);
        setGrid(current);
        setFlashCells(new Set());
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 110));
        mult += 1;
      }
      setCombo(0);
    },
    [palette]
  );

  const handleTileTap = async (r: number, c: number) => {
    if (busy || ended) return;
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
    setBusy(true);
    if (isValidSwap(grid, selected.r, selected.c, r, c)) {
      const swapped = performSwap(grid, selected.r, selected.c, r, c);
      setGrid(swapped);
      setMoves((m) => m - 1);
      setSelected(null);
      try {
        Haptics.selectionAsync();
      } catch {}
      await new Promise((r2) => setTimeout(r2, 140));
      await processMatches(swapped);
    } else {
      setSelected(null);
      sound.play("error");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }
    setBusy(false);
  };

  const shuffleBoard = () => {
    if (busy) return;
    sound.play("pop");
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

      {combo > 1 && (
        <View style={styles.comboBadge} testID="combo-badge">
          <Text style={styles.comboText}>COMBO x{combo}!</Text>
        </View>
      )}

      <View style={styles.boardWrap}>
        <View style={[styles.board, { width: BOARD_WIDTH }]} testID="board">
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
                      { width: TILE, height: TILE, backgroundColor: ing?.color || colors.surfaceTertiary },
                      isSel && styles.tileSelected,
                      isFlash && styles.tileFlash,
                    ]}
                  >
                    <Text style={{ fontSize: TILE * 0.55 }}>{ing?.emoji}</Text>
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
              Prep the {dish.name}
            </Text>
            <Text style={styles.orderSub}>Match base items to open the counter</Text>
          </View>
          <Text style={styles.dishEmoji}>{dish.emoji}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {Object.entries(dish.base_recipe).map(([ing, need]) => {
            const have = Math.min(need, inventory[ing] || 0);
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
  comboBadge: {
    alignSelf: "center",
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  comboText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  boardWrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.md },
  board: {
    padding: BOARD_PADDING,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    ...shadow.tier2,
  },
  row: { flexDirection: "row" },
  tile: {
    borderRadius: radius.md,
    margin: 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  tileSelected: { borderColor: colors.surfaceInverse, borderWidth: 3, transform: [{ scale: 1.08 }] },
  tileFlash: { opacity: 0.3, transform: [{ scale: 0.82 }] },
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
  orderSub: { fontSize: 12, fontWeight: "700", color: colors.surfaceInverse, opacity: 0.55 },
  chipRow: { gap: spacing.sm, paddingBottom: spacing.sm, paddingRight: spacing.md },
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
  recipeChipDone: { backgroundColor: colors.success, borderColor: colors.surfaceInverse },
  recipeEmoji: { fontSize: 20 },
  recipeCount: { fontSize: 13, fontWeight: "900", color: colors.surfaceInverse, marginTop: 2 },
  recipeCountDone: { color: colors.onSuccess },
});
