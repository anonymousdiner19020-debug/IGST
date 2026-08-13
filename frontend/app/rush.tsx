import { useRouter } from "expo-router";
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
import DishIcon from "@/src/components/DishIcon";

const RUSH_PATIENCE_MS = 9000;
const MAX_MISSES = 3;

type RushCustomer = {
  avatar: string;
  dish: Dish;
  wanted: string[];
  forbidden: string[];
  toppings: string[];
};

function rollCustomer(): RushCustomer {
  const dish = FALLBACK_DISHES[Math.floor(Math.random() * FALLBACK_DISHES.length)];
  const toppings = dish.topping_options.slice(0, 6);
  const order = generateCustomerOrder({ ...dish, topping_options: toppings });
  return {
    avatar: CUSTOMER_AVATARS[Math.floor(Math.random() * CUSTOMER_AVATARS.length)],
    dish,
    wanted: order.wanted,
    forbidden: order.forbidden,
    toppings,
  };
}

export default function Rush() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [customer, setCustomer] = useState<RushCustomer>(() => rollCustomer());
  const [plate, setPlate] = useState<string[]>([]);
  const [coins, setCoins] = useState(0);
  const [bells, setBells] = useState(0);
  const [served, setServed] = useState(0);
  const [misses, setMisses] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [patience, setPatience] = useState(1);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [over, setOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const patienceRef = useRef<any>(null);
  const startRef = useRef<number>(Date.now());

  const missesRef = useRef(0);

  useEffect(() => {
    sound.preload();
  }, []);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    setPatience(1);
    if (patienceRef.current) clearInterval(patienceRef.current);
    patienceRef.current = setInterval(() => {
      const remaining = Math.max(0, 1 - (Date.now() - startRef.current) / RUSH_PATIENCE_MS);
      setPatience(remaining);
      if (remaining <= 0) {
        clearInterval(patienceRef.current);
        registerMiss("Too slow! 😤");
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (over) return;
    startTimer();
    return () => clearInterval(patienceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, over]);

  const advance = (ok: boolean) => {
    setPlate([]);
    setTimeout(() => {
      setFeedback(null);
      if (!over && missesRef.current < MAX_MISSES) {
        setCustomer(rollCustomer());
      }
    }, 900);
  };

  const endGame = async () => {
    setOver(true);
    if (patienceRef.current) clearInterval(patienceRef.current);
    sound.play("error");
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}
  };

  const registerMiss = (msg: string) => {
    setStreak(0);
    const m = missesRef.current + 1;
    missesRef.current = m;
    setMisses(m);
    sound.play("error");
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    setFeedback({ ok: false, text: `${msg}  ❤️ ${MAX_MISSES - m} left` });
    if (m >= MAX_MISSES) {
      endGame();
    } else {
      advance(false);
    }
  };

  const toggleTopping = (t: string) => {
    if (over) return;
    sound.play("pop");
    try {
      Haptics.selectionAsync();
    } catch {}
    setPlate((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  };

  const handleServe = () => {
    if (over) return;
    const wantedSet = new Set(customer.wanted);
    const plateSet = new Set(plate);
    const missing = customer.wanted.filter((w) => !plateSet.has(w));
    const extra = plate.filter((p) => !wantedSet.has(p));
    const hasForbidden = plate.some((p) => customer.forbidden.includes(p));
    const perfect = missing.length === 0 && extra.length === 0 && !hasForbidden;

    if (perfect) {
      const mult = 1 + streak * 0.5;
      const speedBonus = Math.round(patience * 15);
      const earned = Math.round((customer.dish.reward_coins * 0.6 + speedBonus) * mult);
      const bellTip = patience > 0.66 ? 3 : patience > 0.33 ? 2 : 1;
      setCoins((c) => c + earned);
      setBells((b) => b + bellTip);
      setServed((s) => s + 1);
      setScore((s) => s + Math.round(120 * mult));
      setStreak((s) => s + 1);
      sound.play("serve");
      sound.play("coin");
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      const comboLabel = mult > 1 ? ` 🔥x${mult}` : "";
      setFeedback({ ok: true, text: `Served! +${earned} 🪙 +${bellTip} 🔔${comboLabel}` });
      advance(true);
    } else {
      registerMiss("Wrong order!");
    }
  };

  const saveRun = useCallback(async () => {
    if (saved) return;
    setSaved(true);
    const id = await playerStorage.get();
    if (!id) return;
    try {
      await api.completeLevel(id, {
        level: 0,
        dish_id: "rush",
        score,
        coins_earned: coins,
        bells_earned: bells,
        completed: false,
      });
    } catch {}
  }, [saved, score, coins, bells]);

  useEffect(() => {
    if (over) saveRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  return (
    <View style={styles.container} testID="rush-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="rush-exit" onPress={() => router.replace("/")} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>✕</Text>
        </Pressable>
        <View style={styles.hearts} testID="rush-lives">
          {Array.from({ length: MAX_MISSES }).map((_, i) => (
            <Text key={i} style={styles.heart}>
              {i < MAX_MISSES - misses ? "❤️" : "🖤"}
            </Text>
          ))}
        </View>
        <View style={styles.rushStat}>
          <Text style={styles.rushStatLabel}>SERVED</Text>
          <Text style={styles.rushStatVal} testID="rush-served">
            {served}
          </Text>
        </View>
        <View style={styles.coinChip}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText} testID="rush-coins">
            {coins}
          </Text>
        </View>
      </View>

      {!over ? (
        <>
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
                testID="rush-patience"
              />
            </View>
            <Text style={styles.customerAvatar}>{customer.avatar}</Text>
            <View style={styles.ticket} testID="rush-ticket">
              <View style={styles.ticketTitleRow}>
                <DishIcon id={customer.dish.id} emoji={customer.dish.emoji} size={22} />
                <Text style={styles.ticketTitle}>{customer.dish.name}</Text>
              </View>
              <View style={styles.ticketDivider} />
              {customer.wanted.map((w) => (
                <View key={w} style={styles.ticketRow}>
                  <Text style={styles.ticketPlus}>＋</Text>
                  <Text style={styles.ticketItem}>{INGREDIENTS[w]?.label || w}</Text>
                  <Text style={styles.ticketEmoji}>{INGREDIENTS[w]?.emoji}</Text>
                </View>
              ))}
              {customer.forbidden.map((f) => (
                <View key={f} style={styles.ticketRow}>
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
              testID="rush-feedback"
            >
              <Text style={styles.feedbackText}>{feedback.text}</Text>
            </View>
          )}

          <View style={styles.plateZone}>
            <View style={styles.plate}>
              <DishIcon id={customer.dish.id} emoji={customer.dish.emoji} size={40} />
              {plate.length === 0 ? (
                <Text style={styles.plateHint}>Build the order fast!</Text>
              ) : (
                plate.map((p) => (
                  <View key={p} style={styles.plateChip}>
                    <Text style={styles.plateChipEmoji}>{INGREDIENTS[p]?.emoji}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={[styles.tray, { paddingBottom: insets.bottom + spacing.md }]}>
            <ScrollView contentContainerStyle={styles.trayGrid} showsVerticalScrollIndicator={false}>
              {customer.toppings.map((t) => {
                const active = plate.includes(t);
                const info = INGREDIENTS[t];
                return (
                  <Pressable
                    key={t}
                    testID={`rush-tray-${t}`}
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
              testID="rush-serve-button"
              onPress={handleServe}
              style={({ pressed }) => [styles.serveBtn, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <Text style={styles.serveBtnText}>SERVE 🍽</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.gameOver} testID="rush-gameover">
          <Text style={styles.gameOverEmoji}>🏁</Text>
          <Text style={styles.gameOverTitle}>RUSH OVER</Text>
          <View style={styles.gameOverStats}>
            <View style={styles.goStat}>
              <Text style={styles.goStatVal}>{served}</Text>
              <Text style={styles.goStatLabel}>SERVED</Text>
            </View>
            <View style={styles.goStat}>
              <Text style={styles.goStatVal}>{coins}</Text>
              <Text style={styles.goStatLabel}>COINS</Text>
            </View>
            <View style={styles.goStat}>
              <Text style={styles.goStatVal}>{bells}</Text>
              <Text style={styles.goStatLabel}>BELLS</Text>
            </View>
          </View>
          <Pressable
            testID="rush-play-again"
            onPress={() => {
              missesRef.current = 0;
              setMisses(0);
              setCoins(0);
              setBells(0);
              setServed(0);
              setScore(0);
              setStreak(0);
              setSaved(false);
              setFeedback(null);
              setPlate([]);
              setCustomer(rollCustomer());
              setOver(false);
            }}
            style={({ pressed }) => [styles.againBtn, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={styles.againText}>Play Again</Text>
          </Pressable>
          <Pressable testID="rush-home" onPress={() => router.replace("/")}>
            <Text style={styles.homeLink}>Home</Text>
          </Pressable>
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
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceInverse,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontSize: 18, fontWeight: "900", color: colors.surfaceInverse },
  hearts: { flexDirection: "row", gap: 2 },
  heart: { fontSize: 18 },
  rushStat: {
    marginLeft: "auto",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  rushStatLabel: { fontSize: 9, fontWeight: "900", color: colors.surfaceInverse, opacity: 0.6 },
  rushStatVal: { fontSize: 16, fontWeight: "900", color: colors.surfaceInverse },
  coinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  coinEmoji: { fontSize: 14 },
  coinText: { fontSize: 14, fontWeight: "900", color: colors.onBrand },
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
  customerAvatar: { fontSize: 52 },
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
  ticketTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  ticketDivider: { height: 2, backgroundColor: colors.divider, marginVertical: spacing.sm },
  ticketRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 3 },
  ticketPlus: { fontSize: 14, fontWeight: "900", color: colors.success, width: 24 },
  ticketNo: { fontSize: 11, fontWeight: "900", color: colors.error, width: 24 },
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
  plate: {
    width: "100%",
    minHeight: 80,
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
  plateBase: { fontSize: 38 },
  plateHint: { fontSize: 13, color: colors.surfaceInverse, opacity: 0.4, fontWeight: "700" },
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
  gameOver: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  gameOverEmoji: { fontSize: 64 },
  gameOverTitle: { fontSize: 30, fontWeight: "900", color: colors.surfaceInverse, letterSpacing: 2 },
  gameOverStats: { flexDirection: "row", gap: spacing.md, marginVertical: spacing.lg },
  goStat: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.borderStrong,
    minWidth: 90,
  },
  goStatVal: { fontSize: 24, fontWeight: "900", color: colors.surfaceInverse },
  goStatLabel: { fontSize: 10, fontWeight: "900", color: colors.surfaceInverse, opacity: 0.6, letterSpacing: 1 },
  againBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  againText: { fontSize: 18, fontWeight: "900", color: colors.onBrand, letterSpacing: 1 },
  homeLink: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.surfaceInverse,
    opacity: 0.6,
    marginTop: spacing.sm,
    textDecorationLine: "underline",
  },
});
