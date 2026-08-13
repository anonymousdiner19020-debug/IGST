import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FALLBACK_DISHES, INGREDIENTS, serveOptions } from "@/src/constants/dishes";
import { api } from "@/src/api";
import DishIcon from "@/src/components/DishIcon";
import IngredientIcon from "@/src/components/IngredientIcon";
import { playerStorage, flagStorage } from "@/src/storage";
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
const MAX_TILES = 8;

// The match board only uses the dish's base recipe ingredients — no extra
// topping tiles. Toppings are handled entirely in the serving phase.
function buildPalette(baseKeys: string[]): string[] {
  return [...new Set(baseKeys)].slice(0, MAX_TILES);
}

export default function Game() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const BOARD_WIDTH = Math.min(winW, 460) - BOARD_MARGIN * 2;
  // Account for each tile's 2px margin on both sides (4px per tile) so the
  // board background hugs the grid exactly with no leftover white space.
  const TILE = Math.floor((BOARD_WIDTH - BOARD_PADDING * 2 - BOARD_SIZE * 4) / BOARD_SIZE);
  const { dishId, level } = useLocalSearchParams<{ dishId: string; level: string }>();
  const dish = useMemo(
    () => FALLBACK_DISHES.find((d) => d.id === dishId) || FALLBACK_DISHES[0],
    [dishId]
  );
  const levelNum = parseInt(level || "1", 10);

  const baseKeys = useMemo(() => Object.keys(dish.base_recipe), [dish]);
  const palette = useMemo(() => buildPalette(baseKeys), [baseKeys]);

  const [grid, setGrid] = useState<Cell[][]>(() => createBoard(palette));
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [moves, setMoves] = useState(dish.moves);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState(false);
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set());
  const [combo, setCombo] = useState(0);
  const [grillLevel, setGrillLevel] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (dish.id !== "soft_pretzel") return;
    (async () => {
      if (!(await flagStorage.seen("tutorial_pretzel"))) setShowTutorial(true);
    })();
  }, [dish.id]);

  const dismissTutorial = () => {
    flagStorage.mark("tutorial_pretzel");
    setShowTutorial(false);
  };

  useEffect(() => {
    sound.preload();
    (async () => {
      try {
        const daily = await api.getDailySpecial();
        if (daily.dish_id === dish.id) setIsDaily(true);
      } catch {}
      try {
        const id = await playerStorage.get();
        if (!id) return;
        const p = await api.getPlayer(id);
        const lvl = p.grill_level || 0;
        setGrillLevel(lvl);
        if (lvl > 0) {
          // Pre-stock base ingredients but never enough to auto-complete a slot.
          setInventory((prev) => {
            const next = { ...prev };
            for (const [k, need] of Object.entries(dish.base_recipe)) {
              const stock = Math.min(lvl, Math.max(0, (need as number) - 1));
              if (stock > 0) next[k] = (next[k] || 0) + stock;
            }
            return next;
          });
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        toppings: JSON.stringify(serveOptions(dish)),
        movesLeft: String(moves),
        daily: isDaily ? "1" : "0",
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
        bells: "0",
        score: String(score),
        dishId: dish.id,
        level: String(levelNum),
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
                      { width: TILE, height: TILE, backgroundColor: ing?.color || colors.surfaceTertiary },
                      isSel && styles.tileSelected,
                      isFlash && styles.tileFlash,
                    ]}
                  >
                    <IngredientIcon id={cell} emoji={ing?.emoji} size={TILE * 0.62} />
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
            {isDaily ? (
              <Text style={[styles.orderSub, { color: colors.brandSecondary }]}>
                ⭐ Daily Special — 2× coins!
              </Text>
            ) : (
              <Text style={styles.orderSub}>Match base items to open the counter</Text>
            )}
          </View>
          <DishIcon id={dish.id} emoji={dish.emoji} size={34} />
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
                <IngredientIcon id={ing} emoji={info?.emoji || "🍽"} size={22} />
                <Text style={[styles.recipeCount, done && styles.recipeCountDone]}>
                  {have}/{need}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {showTutorial && (
        <View style={styles.tutorialOverlay} testID="tutorial-overlay">
          <View style={styles.tutorialCard}>
            <DishIcon id={dish.id} emoji={dish.emoji} size={56} />
            <Text style={styles.tutorialTitle}>How to Play</Text>
            <View style={styles.tutorialStep}>
              <Text style={styles.tutorialNum}>1</Text>
              <Text style={styles.tutorialText}>
                Swap two touching tiles to line up 3+ of the same ingredient.
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <Text style={styles.tutorialNum}>2</Text>
              <Text style={styles.tutorialText}>
                Collect every item in the recipe list below to open the counter.
              </Text>
            </View>
            <View style={styles.tutorialStep}>
              <Text style={styles.tutorialNum}>3</Text>
              <Text style={styles.tutorialText}>
                Then build each customer&apos;s order and hit SERVE before their patience runs out!
              </Text>
            </View>
            <Pressable
              testID="tutorial-got-it"
              onPress={dismissTutorial}
              style={({ pressed }) => [styles.tutorialBtn, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <Text style={styles.tutorialBtnText}>Got it! 👨‍🍳</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    zIndex: 100,
  },
  tutorialCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 3,
    borderColor: colors.brand,
    ...shadow.tier3,
  },
  tutorialTitle: { fontSize: 22, fontWeight: "900", color: colors.surfaceInverse },
  tutorialStep: { flexDirection: "row", alignItems: "center", gap: spacing.md, width: "100%" },
  tutorialNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    color: colors.onBrand,
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 28,
    overflow: "hidden",
  },
  tutorialText: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.surfaceInverse, lineHeight: 19 },
  tutorialBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.brandSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
    ...shadow.tier2,
  },
  tutorialBtnText: { fontSize: 18, fontWeight: "900", color: colors.onBrandSecondary, letterSpacing: 1 },
});
