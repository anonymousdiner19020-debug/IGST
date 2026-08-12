import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/src/api";
import {
  CUSTOMER_AVATARS,
  Dish,
  FALLBACK_DISHES,
  generateCustomerOrder,
  INGREDIENTS,
} from "@/src/constants/dishes";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";

type Customer = {
  avatar: string;
  wanted: string[];
  forbidden: string[];
};

const PATIENCE_MS = 15000;

function buildCustomers(dish: Dish, toppings: string[], count: number): Customer[] {
  const filteredDish = { ...dish, topping_options: toppings };
  const list: Customer[] = [];
  for (let i = 0; i < count; i++) {
    const order = generateCustomerOrder(filteredDish);
    list.push({
      avatar: CUSTOMER_AVATARS[Math.floor(Math.random() * CUSTOMER_AVATARS.length)],
      wanted: order.wanted,
      forbidden: order.forbidden,
    });
  }
  return list;
}

export default function Serve() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishId: string;
    level: string;
    score: string;
    inventory: string;
    toppings: string;
    movesLeft: string;
    daily: string;
  }>();

  const dish = useMemo(
    () => FALLBACK_DISHES.find((d) => d.id === params.dishId) || FALLBACK_DISHES[0],
    [params.dishId]
  );
  const levelNum = parseInt(params.level || "1", 10);
  const baseScore = parseInt(params.score || "0", 10);
  const toppings: string[] = useMemo(() => {
    try {
      return JSON.parse(params.toppings || "[]");
    } catch {
      return dish.topping_options.slice(0, 5);
    }
  }, [params.toppings, dish]);

  // Leftover toppings collected during the match-3 phase (fuel for the pantry).
  const invToppings: Record<string, number> = useMemo(() => {
    try {
      const inv = JSON.parse(params.inventory || "{}") as Record<string, number>;
      const out: Record<string, number> = {};
      for (const t of toppings) if (inv[t] > 0) out[t] = inv[t];
      return out;
    } catch {
      return {};
    }
  }, [params.inventory, toppings]);

  const [extraServings, setExtraServings] = useState(0);

  const customers = useMemo(
    () => buildCustomers(dish, toppings, dish.customers_per_level + extraServings),
    [dish, toppings, extraServings]
  );

  const [idx, setIdx] = useState(0);
  const [plate, setPlate] = useState<string[]>([]);
  const [coins, setCoins] = useState(0);
  const [bells, setBells] = useState(0);
  const [servedCount, setServedCount] = useState(0);
  const [score, setScore] = useState(baseScore);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [patience, setPatience] = useState(1);
  const [finished, setFinished] = useState(false);
  const [streak, setStreak] = useState(0);
  const [pantry, setPantry] = useState<Record<string, number>>({});
  const [pantryLevel, setPantryLevel] = useState(0);
  const [jackpot, setJackpot] = useState<number | null>(null);
  const patienceRef = useRef<any>(null);
  const startRef = useRef<number>(Date.now());

  const isDaily = params.daily === "1";
  const current = customers[idx];
  const pantryMaxed = pantryLevel >= 3;

  // combo multiplier grows with consecutive perfect serves: 1x, 1.5x, 2x, 2.5x...
  const comboMult = 1 + streak * 0.5;

  useEffect(() => {
    (async () => {
      const id = await playerStorage.get();
      if (!id) return;
      try {
        const info = await api.getPantryInfo(id);
        setPantry(info.pantry || {});
        setPantryLevel(info.pantry_level || 0);
      } catch {}
      try {
        const p = await api.getPlayer(id);
        setExtraServings(p.plates_level || 0);
      } catch {}
    })();
  }, []);

  // Maxed pantry auto-places one wanted topping for each new customer.
  useEffect(() => {
    if (finished || !current) return;
    if (pantryMaxed && current.wanted.length > 0) {
      setPlate([current.wanted[0]]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, pantryMaxed, finished]);

  // patience timer per customer
  useEffect(() => {
    if (finished || !current) return;
    startRef.current = Date.now();
    setPatience(1);
    patienceRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / PATIENCE_MS);
      setPatience(remaining);
      if (remaining <= 0) {
        clearInterval(patienceRef.current);
        handleTimeout();
      }
    }, 100);
    return () => clearInterval(patienceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, finished]);

  const toggleTopping = (t: string) => {
    if (finished) return;
    sound.play("pop");
    try {
      Haptics.selectionAsync();
    } catch {}
    setPlate((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  };

  // Tap a stored pantry item: instantly place it and consume one from storage.
  const usePantry = (t: string) => {
    if (finished) return;
    if ((pantry[t] || 0) <= 0) return;
    sound.play("pop");
    try {
      Haptics.selectionAsync();
    } catch {}
    setPantry((p) => ({ ...p, [t]: Math.max(0, (p[t] || 0) - 1) }));
    setPlate((p) => (p.includes(t) ? p : [...p, t]));
  };

  const nextCustomer = useCallback(
    (earnedCoins: number, earnedScore: number, ok: boolean, earnedBells: number = 0) => {
      setCoins((c) => c + earnedCoins);
      setBells((b) => b + earnedBells);
      setScore((s) => s + earnedScore);
      if (ok) setServedCount((c) => c + 1);
      setPlate([]);
      if (patienceRef.current) clearInterval(patienceRef.current);
      setTimeout(() => {
        setFeedback(null);
        if (idx + 1 >= customers.length) {
          finishLevel(
            coins + earnedCoins,
            servedCount + (ok ? 1 : 0),
            score + earnedScore,
            bells + earnedBells
          );
        } else {
          setIdx((i) => i + 1);
        }
      }, 1100);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx, customers.length, coins, servedCount, score, bells]
  );

  const handleServe = () => {
    if (finished || !current) return;
    const wantedSet = new Set(current.wanted);
    const plateSet = new Set(plate);
    // correct if plate matches wanted exactly and contains no forbidden
    const missing = current.wanted.filter((w) => !plateSet.has(w));
    const extra = plate.filter((p) => !wantedSet.has(p));
    const hasForbidden = plate.some((p) => current.forbidden.includes(p));
    const perfect = missing.length === 0 && extra.length === 0 && !hasForbidden;

    if (perfect) {
      const speedBonus = Math.round(patience * 20);
      const base = dish.reward_coins + speedBonus;
      const newStreak = streak + 1;
      const mult = 1 + streak * 0.5; // multiplier from CURRENT streak before increment
      const dailyMult = isDaily ? 2 : 1;
      const tip = Math.round(base * mult * dailyMult);
      setStreak(newStreak);
      sound.play("serve");
      sound.play("coin");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      const comboLabel = mult > 1 ? ` 🔥x${mult}` : "";
      const dailyLabel = isDaily ? " ⭐2×" : "";
      // Liberty Bell tip: faster serve = more bells (1-3)
      const bellTip = patience > 0.66 ? 3 : patience > 0.33 ? 2 : 1;
      setFeedback({ ok: true, text: `Perfect! +${tip} 🪙 +${bellTip} 🔔${comboLabel}${dailyLabel}` });
      // Streak jackpot at 2.5x multiplier or higher (4+ consecutive perfects)
      let jackpotBonus = 0;
      if (mult >= 2.5) {
        jackpotBonus = 40 * streak;
        setJackpot(jackpotBonus);
        sound.play("coin");
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        setTimeout(() => setJackpot(null), 1400);
      }
      nextCustomer(tip + jackpotBonus, Math.round((100 + speedBonus) * mult), true, bellTip);
    } else {
      const partial = Math.max(0, current.wanted.length - missing.length - extra.length);
      const dailyMult = isDaily ? 2 : 1;
      const coinsGot = partial * 8 * dailyMult;
      setStreak(0); // combo broken
      sound.play("error");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setFeedback({ ok: false, text: coinsGot > 0 ? `Close! +${coinsGot} 🪙` : "Wrong order!" });
      nextCustomer(coinsGot, partial * 15, false);
    }
  };

  const handleTimeout = () => {
    setStreak(0);
    sound.play("error");
    setFeedback({ ok: false, text: "Too slow! Customer left 😤" });
    nextCustomer(0, 0, false);
  };

  const finishLevel = async (totalCoins: number, served: number, totalScore: number, totalBells: number) => {
    if (finished) return;
    setFinished(true);
    const completed = served > 0;
    const id = await playerStorage.get();
    if (id) {
      // Carry leftover toppings into the pantry (backend caps by pantry level).
      if (pantryLevel > 0) {
        const merged: Record<string, number> = { ...pantry };
        for (const [k, v] of Object.entries(invToppings)) {
          merged[k] = (merged[k] || 0) + (v as number);
        }
        try {
          await api.savePantry(id, merged);
        } catch {}
      }
      try {
        await api.completeLevel(id, {
          level: levelNum,
          dish_id: dish.id,
          score: totalScore,
          coins_earned: totalCoins,
          bells_earned: totalBells,
          completed: served >= Math.ceil(customers.length / 2),
        });
      } catch {}
    }
    router.replace({
      pathname: "/cooking-result",
      params: {
        completed: completed ? "1" : "0",
        coins: String(totalCoins),
        bells: String(totalBells),
        score: String(totalScore),
        dishId: dish.id,
        level: String(levelNum),
        served: String(served),
        total: String(customers.length),
        nextLevel: String(levelNum + 1),
      },
    });
  };

  if (!current) return <View style={styles.container} />;

  return (
    <View style={styles.container} testID="serve-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            Customer {idx + 1}/{customers.length}
          </Text>
        </View>
        {streak >= 1 && (
          <View style={styles.streakBadge} testID="combo-streak">
            <Text style={styles.streakText}>🔥 x{(1 + streak * 0.5).toFixed(1)}</Text>
          </View>
        )}
        <View style={styles.coinChip} testID="serve-coins">
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{coins}</Text>
        </View>
        <View style={styles.bellChip} testID="serve-bells">
          <Text style={styles.coinEmoji}>🔔</Text>
          <Text style={styles.bellText}>{bells}</Text>
        </View>
      </View>

      {/* Customer + order ticket */}
      <View style={styles.customerZone}>
        <View style={styles.patienceTrack}>
          <View
            style={[
              styles.patienceFill,
              {
                width: `${Math.round(patience * 100)}%`,
                backgroundColor:
                  patience > 0.5 ? colors.success : patience > 0.25 ? colors.warning : colors.error,
              },
            ]}
            testID="patience-bar"
          />
        </View>
        <Text style={styles.customerAvatar}>{current.avatar}</Text>
        <View style={styles.ticket} testID="order-ticket">
          <Text style={styles.ticketTitle}>
            {dish.emoji} {dish.name}
          </Text>
          <View style={styles.ticketDivider} />
          {current.wanted.map((w) => (
            <View key={w} style={styles.ticketRow} testID={`want-${w}`}>
              <Text style={styles.ticketPlus}>＋</Text>
              <Text style={styles.ticketItem}>{INGREDIENTS[w]?.label || w}</Text>
              <Text style={styles.ticketEmoji}>{INGREDIENTS[w]?.emoji}</Text>
            </View>
          ))}
          {current.forbidden.map((f) => (
            <View key={f} style={styles.ticketRow} testID={`no-${f}`}>
              <Text style={styles.ticketNo}>NO</Text>
              <Text style={[styles.ticketItem, { color: colors.error }]}>
                {INGREDIENTS[f]?.label || f}
              </Text>
              <Text style={styles.ticketEmoji}>{INGREDIENTS[f]?.emoji}</Text>
            </View>
          ))}
        </View>
      </View>

      {feedback && (
        <View
          style={[styles.feedback, { backgroundColor: feedback.ok ? colors.success : colors.error }]}
          testID="serve-feedback"
        >
          <Text style={styles.feedbackText}>{feedback.text}</Text>
        </View>
      )}

      {/* Combo meter */}
      <View style={styles.comboMeter} testID="combo-meter">
        <View style={styles.comboSegments}>
          {[1.5, 2.0, 2.5, 3.0, 3.5].map((tier, i) => (
            <View
              key={tier}
              style={[styles.comboSeg, i < streak && styles.comboSegOn]}
            />
          ))}
        </View>
        <Text style={styles.comboMeterLabel}>
          {streak === 0
            ? "Serve perfect to start a 🔥 combo"
            : `Combo x${comboMult.toFixed(1)} • next x${(1 + (streak + 1) * 0.5).toFixed(1)}`}
        </Text>
      </View>

      {/* Plate builder */}
      <View style={styles.plateZone}>
        <Text style={styles.plateLabel}>YOUR PLATE</Text>
        <View style={styles.plate} testID="plate">
          <Text style={styles.plateBase}>{dish.emoji}</Text>
          {plate.length === 0 ? (
            <Text style={styles.plateHint}>Tap toppings below to build the order</Text>
          ) : (
            <View style={styles.plateItems}>
              {plate.map((p) => (
                <View key={p} style={styles.plateChip} testID={`plate-${p}`}>
                  <Text style={styles.plateChipEmoji}>{INGREDIENTS[p]?.emoji}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Pantry shelf — stored leftover toppings from previous levels */}
      {pantryLevel > 0 && Object.values(pantry).some((n) => n > 0) && (
        <View style={styles.pantryZone} testID="pantry-shelf">
          <Text style={styles.pantryLabel}>🥫 PANTRY (tap to use)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pantryRow}>
            {Object.entries(pantry)
              .filter(([, n]) => n > 0)
              .map(([t, n]) => (
                <Pressable
                  key={t}
                  testID={`pantry-${t}`}
                  onPress={() => usePantry(t)}
                  style={({ pressed }) => [styles.pantryChip, pressed && { transform: [{ scale: 0.93 }] }]}
                >
                  <Text style={styles.pantryEmoji}>{INGREDIENTS[t]?.emoji}</Text>
                  <View style={styles.pantryCount}>
                    <Text style={styles.pantryCountText}>{n}</Text>
                  </View>
                </Pressable>
              ))}
          </ScrollView>
        </View>
      )}

      {/* Topping tray */}
      <View style={[styles.tray, { paddingBottom: insets.bottom + spacing.md }]}>
        <ScrollView
          contentContainerStyle={styles.trayGrid}
          showsVerticalScrollIndicator={false}
        >
          {toppings.map((t) => {
            const active = plate.includes(t);
            const info = INGREDIENTS[t];
            return (
              <Pressable
                key={t}
                testID={`tray-${t}`}
                onPress={() => toggleTopping(t)}
                style={({ pressed }) => [
                  styles.trayItem,
                  { backgroundColor: info?.color || colors.surfaceSecondary },
                  active && styles.trayItemActive,
                  pressed && { transform: [{ scale: 0.93 }] },
                ]}
              >
                <Text style={styles.trayEmoji}>{info?.emoji}</Text>
                <Text style={styles.trayLabel} numberOfLines={1}>
                  {info?.label || t}
                </Text>
                {active && (
                  <View style={styles.trayCheck}>
                    <Text style={styles.trayCheckText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          testID="serve-button"
          onPress={handleServe}
          style={({ pressed }) => [styles.serveBtn, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Text style={styles.serveBtnText}>SERVE 🍽</Text>
        </Pressable>
      </View>

      {jackpot != null && (
        <View style={styles.jackpotOverlay} pointerEvents="none" testID="jackpot-popup">
          <View style={styles.jackpotCard}>
            <Text style={styles.jackpotEmoji}>🎰🔥</Text>
            <Text style={styles.jackpotTitle}>HOT STREAK JACKPOT!</Text>
            <Text style={styles.jackpotAmount}>+{jackpot} 🪙</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceInverse,
  },
  counterBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  counterText: { fontWeight: "900", color: colors.onBrand, fontSize: 13 },
  streakBadge: {
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  streakText: { fontWeight: "900", color: "#FFFFFF", fontSize: 13 },
  coinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  coinEmoji: { fontSize: 16 },
  coinText: { fontSize: 15, fontWeight: "900", color: colors.surfaceInverse },
  bellChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  bellText: { fontSize: 15, fontWeight: "900", color: colors.onBrandTertiary },
  customerZone: { alignItems: "center", paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  patienceTrack: {
    width: "70%",
    height: 10,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  patienceFill: { height: "100%", borderRadius: radius.pill },
  customerAvatar: { fontSize: 56 },
  ticket: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    minWidth: 220,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.borderStrong,
    borderStyle: "dashed",
  },
  ticketTitle: { fontSize: 18, fontWeight: "900", color: colors.surfaceInverse, textAlign: "center" },
  ticketDivider: { height: 2, backgroundColor: colors.divider, marginVertical: spacing.sm },
  ticketRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 3 },
  ticketPlus: { fontSize: 14, fontWeight: "900", color: colors.success, width: 24 },
  ticketNo: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.error,
    width: 24,
  },
  ticketItem: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.surfaceInverse },
  ticketEmoji: { fontSize: 20 },
  feedback: {
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  feedbackText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  comboMeter: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, alignItems: "center", gap: spacing.xs },
  comboSegments: { flexDirection: "row", gap: spacing.xs, width: "100%" },
  comboSeg: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  comboSegOn: { backgroundColor: colors.brand },
  comboMeterLabel: { fontSize: 11, fontWeight: "800", color: colors.surfaceInverse, opacity: 0.7 },
  plateZone: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  plateLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.surfaceInverse,
    opacity: 0.5,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  plate: {
    width: "100%",
    minHeight: 84,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  plateBase: { fontSize: 40 },
  plateHint: { fontSize: 13, color: colors.surfaceInverse, opacity: 0.4, fontWeight: "700" },
  plateItems: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, alignItems: "center" },
  plateChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  plateChipEmoji: { fontSize: 22 },
  pantryZone: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  pantryLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.surfaceInverse,
    opacity: 0.55,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  pantryRow: { gap: spacing.sm, paddingRight: spacing.md, paddingVertical: spacing.xs },
  pantryChip: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInverse,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.brand,
    flexShrink: 0,
  },
  pantryEmoji: { fontSize: 24 },
  pantryCount: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  pantryCountText: { fontSize: 11, fontWeight: "900", color: colors.onBrand },
  jackpotOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  jackpotCard: {
    backgroundColor: colors.brandSecondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 4,
    borderColor: colors.brand,
    ...shadow.tier3,
  },
  jackpotEmoji: { fontSize: 44 },
  jackpotTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  jackpotAmount: { fontSize: 30, fontWeight: "900", color: colors.brand },
  tray: {
    marginTop: "auto",
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...shadow.tier2,
  },
  trayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    paddingBottom: spacing.md,
  },
  trayItem: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(0,0,0,0.12)",
    gap: 2,
  },
  trayItemActive: { borderColor: colors.surfaceInverse, transform: [{ scale: 1.05 }] },
  trayEmoji: { fontSize: 26 },
  trayLabel: { fontSize: 9, fontWeight: "900", color: colors.surfaceInverse, textAlign: "center" },
  trayCheck: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  trayCheckText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  serveBtn: {
    backgroundColor: colors.brandSecondary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  serveBtnText: { fontSize: 20, fontWeight: "900", color: colors.onBrandSecondary, letterSpacing: 2 },
});
