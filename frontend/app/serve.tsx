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

  const customers = useMemo(
    () => buildCustomers(dish, toppings, dish.customers_per_level),
    [dish, toppings]
  );

  const [idx, setIdx] = useState(0);
  const [plate, setPlate] = useState<string[]>([]);
  const [coins, setCoins] = useState(0);
  const [servedCount, setServedCount] = useState(0);
  const [score, setScore] = useState(baseScore);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [patience, setPatience] = useState(1);
  const [finished, setFinished] = useState(false);
  const patienceRef = useRef<any>(null);
  const startRef = useRef<number>(Date.now());

  const current = customers[idx];

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

  const nextCustomer = useCallback(
    (earnedCoins: number, earnedScore: number, ok: boolean) => {
      setCoins((c) => c + earnedCoins);
      setScore((s) => s + earnedScore);
      if (ok) setServedCount((c) => c + 1);
      setPlate([]);
      if (patienceRef.current) clearInterval(patienceRef.current);
      setTimeout(() => {
        setFeedback(null);
        if (idx + 1 >= customers.length) {
          finishLevel(coins + earnedCoins, servedCount + (ok ? 1 : 0), score + earnedScore);
        } else {
          setIdx((i) => i + 1);
        }
      }, 1100);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idx, customers.length, coins, servedCount, score]
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
      const tip = dish.reward_coins + speedBonus;
      sound.play("serve");
      sound.play("coin");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setFeedback({ ok: true, text: `Perfect! +${tip} 🪙` });
      nextCustomer(tip, 100 + speedBonus, true);
    } else {
      const partial = Math.max(0, current.wanted.length - missing.length - extra.length);
      const coinsGot = partial * 8;
      sound.play("error");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setFeedback({ ok: false, text: coinsGot > 0 ? `Close! +${coinsGot} 🪙` : "Wrong order!" });
      nextCustomer(coinsGot, partial * 15, false);
    }
  };

  const handleTimeout = () => {
    sound.play("error");
    setFeedback({ ok: false, text: "Too slow! Customer left 😤" });
    nextCustomer(0, 0, false);
  };

  const finishLevel = async (totalCoins: number, served: number, totalScore: number) => {
    if (finished) return;
    setFinished(true);
    const completed = served > 0;
    const id = await playerStorage.get();
    if (id) {
      try {
        await api.completeLevel(id, {
          level: levelNum,
          dish_id: dish.id,
          score: totalScore,
          coins_earned: totalCoins,
          completed: served >= Math.ceil(customers.length / 2), // unlock next if served at least half
        });
      } catch {}
    }
    router.replace({
      pathname: "/cooking-result",
      params: {
        completed: completed ? "1" : "0",
        coins: String(totalCoins),
        score: String(totalScore),
        dishId: dish.id,
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
        <View style={styles.coinChip} testID="serve-coins">
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{coins}</Text>
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
