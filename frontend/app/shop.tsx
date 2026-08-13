import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, PlayerDTO, UpgradesInfo, DailyRewardStatus } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { colors, radius, shadow, spacing } from "@/src/theme";
import LibertyBell from "@/src/components/LibertyBell";

type ShopItem = { id: string; name: string; emoji: string; cost: number; type: string };
const UPGRADE_ORDER = ["grill", "plates", "pantry", "holding"];

export default function Shop() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [player, setPlayer] = useState<PlayerDTO | null>(null);
  const [upgrades, setUpgrades] = useState<UpgradesInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyRewardStatus | null>(null);
  const [claiming, setClaiming] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shop, id] = await Promise.all([api.getShop(), playerStorage.get()]);
      setItems(shop.items);
      if (id) {
        const [p, u] = await Promise.all([api.getPlayer(id), api.getUpgradesInfo(id)]);
        setPlayer(p);
        setUpgrades(u);
        try {
          setDaily(await api.getDailyReward(id));
        } catch {}
      }
    } catch {}
    setLoading(false);
  }, []);

  const claimReward = async () => {
    if (!player || !daily?.claimable) return;
    setClaiming(true);
    try {
      const res = await api.claimDailyReward(player.id);
      setPlayer(res.player);
      setDaily(await api.getDailyReward(player.id));
      const b = res.reward.bells > 0 ? ` +${res.reward.bells} 🔔` : "";
      showToast(`Day ${res.reward.day} reward! +${res.reward.coins} 🪙${b}`);
    } catch {
      showToast("Already claimed today");
    }
    setClaiming(false);
  };

  useEffect(() => {
    load();
  }, [load]);

  const doUpgrade = async (key: string) => {
    if (!player || !upgrades) return;
    const u = upgrades.upgrades[key];
    if (!u || u.maxed || u.next_cost == null) return;
    if (player.coins < u.next_cost) {
      showToast("Not enough coins!");
      return;
    }
    setPurchasing(key);
    try {
      const updated = await api.upgrade(player.id, key);
      setPlayer(updated);
      setUpgrades(await api.getUpgradesInfo(player.id));
      showToast(`${u.name} upgraded!`);
    } catch {
      showToast("Upgrade failed");
    }
    setPurchasing(null);
  };

  const buy = async (item: ShopItem) => {
    if (!player) return;
    if (player.coins < item.cost) {
      showToast("Not enough coins!");
      return;
    }
    setPurchasing(item.id);
    try {
      const updated = await api.purchase(player.id, item.id);
      setPlayer(updated);
      showToast(`${item.name} added!`);
    } catch {
      showToast("Purchase failed");
    }
    setPurchasing(null);
  };

  return (
    <View style={styles.container} testID="shop-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Shop</Text>
        <Pressable
          testID="get-coins-button"
          onPress={() => router.push("/coin-store")}
          style={styles.coinChip}
        >
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{player?.coins ?? 0}</Text>
          <Text style={styles.plus}>＋</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.brand} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {daily && (
            <View style={styles.dailyCard} testID="daily-reward-card">
              <View style={styles.dailyTop}>
                <Text style={styles.dailyGift}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dailyTitle}>Daily Reward</Text>
                  <Text style={styles.dailyStreak}>
                    🔥 {daily.streak} day streak
                    {daily.reward.bells > 0 ? "  •  includes bells!" : ""}
                  </Text>
                </View>
                <View style={styles.dailyAmount}>
                  <Text style={styles.dailyCoins}>+{daily.reward.coins} 🪙</Text>
                  {daily.reward.bells > 0 && (
                    <View style={styles.dailyBells}>
                      <Text style={styles.dailyCoins}>+{daily.reward.bells}</Text>
                      <LibertyBell size={16} />
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.dailyCycle}>
                {daily.cycle.map((r, i) => {
                  const day = i + 1;
                  const claimed = day < daily.reward.day || (!daily.claimable && day === daily.reward.day);
                  const isToday = daily.claimable && day === daily.reward.day;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.cycleDot,
                        claimed && styles.cycleDotDone,
                        isToday && styles.cycleDotToday,
                      ]}
                    >
                      <Text style={[styles.cycleDayText, (claimed || isToday) && { color: "#FFFFFF" }]}>
                        {r.bells > 0 ? "🔔" : day}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Pressable
                testID="claim-reward-button"
                disabled={!daily.claimable || claiming}
                onPress={claimReward}
                style={({ pressed }) => [
                  styles.claimBtn,
                  !daily.claimable && styles.disabled,
                  pressed && daily.claimable && { transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text style={styles.claimBtnText}>
                  {claiming ? "…" : daily.claimable ? "CLAIM REWARD" : "Come back tomorrow ✓"}
                </Text>
              </Pressable>
            </View>
          )}

          <Pressable
            testID="buy-coins-banner"
            onPress={() => router.push("/coin-store")}
            style={({ pressed }) => [styles.coinBanner, pressed && { transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.coinBannerEmoji}>🤑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.coinBannerTitle}>Get More Coins</Text>
              <Text style={styles.coinBannerDesc}>Buy coin packs to fuel your kitchen</Text>
            </View>
            <Text style={styles.coinBannerArrow}>›</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>KITCHEN UPGRADES</Text>
          {UPGRADE_ORDER.map((key) => {
            const u = upgrades?.upgrades[key];
            return (
              <View key={key} style={styles.upgradeCard} testID={`upgrade-card-${key}`}>
                <View style={styles.upgradeTop}>
                  <Text style={styles.upgradeEmoji}>{u?.emoji ?? "⭐"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upgradeTitle}>{u?.name ?? key}</Text>
                    <Text style={styles.upgradeDesc}>{u?.desc ?? ""}</Text>
                    <View style={styles.dots}>
                      {Array.from({ length: u?.max_level ?? 3 }).map((_, i) => (
                        <View key={i} style={[styles.dot, i < (u?.level ?? 0) && styles.dotOn]} />
                      ))}
                      <Text style={styles.levelText}>
                        Lv {u?.level ?? 0}/{u?.max_level ?? 3}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  testID={`upgrade-btn-${key}`}
                  disabled={!u || u.maxed || purchasing === key}
                  onPress={() => doUpgrade(key)}
                  style={({ pressed }) => [
                    styles.upgradeBtn,
                    (!u || u.maxed) && styles.disabled,
                    pressed && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  {!u ? (
                    <Text style={styles.upgradeBtnText}>…</Text>
                  ) : u.maxed ? (
                    <Text style={styles.upgradeBtnText}>MAXED OUT</Text>
                  ) : (
                    <>
                      <Text style={styles.smallCoin}>🪙</Text>
                      <Text style={styles.upgradeBtnText}>Upgrade — {u.next_cost}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}

          <Text style={styles.sectionLabel}>BOOSTERS</Text>
          <View style={styles.grid}>
            {items.map((item) => {
              const owned = player?.boosters?.[item.id] || 0;
              const canAfford = (player?.coins ?? 0) >= item.cost;
              return (
                <View key={item.id} style={styles.card} testID={`shop-item-${item.id}`}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.owned}>Owned: {owned}</Text>
                  <Pressable
                    disabled={!canAfford || purchasing === item.id}
                    onPress={() => buy(item)}
                    testID={`buy-${item.id}`}
                    style={({ pressed }) => [
                      styles.buyBtn,
                      !canAfford && styles.disabled,
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <Text style={styles.smallCoin}>🪙</Text>
                    <Text style={styles.buyText}>{item.cost}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {toast && (
        <View style={[styles.toast, { bottom: insets.bottom + spacing.xl }]} testID="shop-toast">
          <Text style={styles.toastText}>{toast}</Text>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: { fontSize: 28, fontWeight: "900", color: colors.surfaceInverse, marginTop: -4 },
  title: { flex: 1, fontSize: 22, fontWeight: "900", color: colors.surfaceInverse },
  coinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  coinEmoji: { fontSize: 16 },
  coinText: { fontSize: 14, fontWeight: "900", color: colors.onBrand },
  plus: { fontSize: 16, fontWeight: "900", color: colors.onBrand, marginLeft: 2 },
  scrollContent: { padding: spacing.lg, gap: spacing.md },
  dailyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.brandSecondary,
  },
  dailyTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dailyGift: { fontSize: 40 },
  dailyTitle: { fontSize: 18, fontWeight: "900", color: colors.surfaceInverse },
  dailyStreak: { fontSize: 12, fontWeight: "700", color: colors.surfaceInverse, opacity: 0.65, marginTop: 2 },
  dailyAmount: { alignItems: "flex-end", gap: 2 },
  dailyCoins: { fontSize: 16, fontWeight: "900", color: colors.surfaceInverse },
  dailyBells: { flexDirection: "row", alignItems: "center", gap: 4 },
  dailyCycle: { flexDirection: "row", justifyContent: "space-between" },
  cycleDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  cycleDotDone: { backgroundColor: colors.success, borderColor: colors.surfaceInverse },
  cycleDotToday: { backgroundColor: colors.brandSecondary, borderColor: colors.surfaceInverse },
  cycleDayText: { fontSize: 13, fontWeight: "900", color: colors.surfaceInverse },
  claimBtn: {
    backgroundColor: colors.brandSecondary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  claimBtnText: { fontSize: 16, fontWeight: "900", color: colors.onBrandSecondary, letterSpacing: 1 },
  coinBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  coinBannerEmoji: { fontSize: 40 },
  coinBannerTitle: { fontSize: 18, fontWeight: "900", color: colors.onBrand },
  coinBannerDesc: { fontSize: 12, fontWeight: "700", color: colors.onBrand, opacity: 0.8 },
  coinBannerArrow: { fontSize: 30, fontWeight: "900", color: colors.onBrand },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.surfaceInverse,
    opacity: 0.55,
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  upgradeCard: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.brand,
  },
  upgradeTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  upgradeEmoji: { fontSize: 40 },
  upgradeTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF" },
  upgradeDesc: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", opacity: 0.75, marginTop: 2 },
  dots: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  dot: { width: 22, height: 10, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.25)" },
  dotOn: { backgroundColor: colors.brand },
  levelText: { color: colors.brand, fontWeight: "900", fontSize: 12, marginLeft: spacing.sm },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  upgradeBtnText: { fontSize: 15, fontWeight: "900", color: colors.onBrand },
  smallCoin: { fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  card: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.xs,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.borderStrong,
  },
  emoji: { fontSize: 48 },
  name: { fontSize: 14, fontWeight: "800", color: colors.surfaceInverse, textAlign: "center", minHeight: 36 },
  owned: { fontSize: 11, color: colors.surfaceInverse, opacity: 0.6, fontWeight: "700" },
  buyBtn: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  buyText: { fontSize: 15, fontWeight: "900", color: colors.onBrand },
  disabled: { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, opacity: 0.6 },
  toast: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    ...shadow.tier3,
  },
  toastText: { color: colors.onSurfaceInverse, fontWeight: "800", fontSize: 14 },
});
