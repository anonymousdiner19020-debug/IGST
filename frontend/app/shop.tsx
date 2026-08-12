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

import { api, GrillInfo, PlayerDTO } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { colors, radius, shadow, spacing } from "@/src/theme";

type ShopItem = { id: string; name: string; emoji: string; cost: number; type: string };

export default function Shop() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [player, setPlayer] = useState<PlayerDTO | null>(null);
  const [grill, setGrill] = useState<GrillInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shop, id] = await Promise.all([api.getShop(), playerStorage.get()]);
      setItems(shop.items);
      if (id) {
        const [p, g] = await Promise.all([api.getPlayer(id), api.getGrillInfo(id)]);
        setPlayer(p);
        setGrill(g);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upgradeGrill = async () => {
    if (!player || !grill || grill.maxed || grill.next_cost == null) return;
    if (player.coins < grill.next_cost) {
      setToast("Not enough coins!");
      setTimeout(() => setToast(null), 1500);
      return;
    }
    setPurchasing("grill");
    try {
      const updated = await api.upgradeGrill(player.id);
      setPlayer(updated);
      setGrill(await api.getGrillInfo(player.id));
      setToast("Grill upgraded! 🔥");
      setTimeout(() => setToast(null), 1500);
    } catch {
      setToast("Upgrade failed");
      setTimeout(() => setToast(null), 1500);
    }
    setPurchasing(null);
  };

  const buy = async (item: ShopItem) => {
    if (!player) return;
    if (player.coins < item.cost) {
      setToast("Not enough coins!");
      setTimeout(() => setToast(null), 1500);
      return;
    }
    setPurchasing(item.id);
    try {
      const updated = await api.purchase(player.id, item.id);
      setPlayer(updated);
      setToast(`${item.name} added!`);
      setTimeout(() => setToast(null), 1500);
    } catch (e: any) {
      setToast("Purchase failed");
      setTimeout(() => setToast(null), 1500);
    }
    setPurchasing(null);
  };

  return (
    <View style={styles.container} testID="shop-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Kitchen Shop</Text>
        <View style={styles.coinChip} testID="shop-coin-balance">
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinText}>{player?.coins ?? 0}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.brand} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {/* Kitchen Upgrade: Bigger Grill */}
          <View style={styles.upgradeCard} testID="grill-upgrade-card">
            <View style={styles.upgradeTop}>
              <Text style={styles.upgradeEmoji}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>Bigger Grill</Text>
                <Text style={styles.upgradeDesc}>
                  Start every level with base ingredients pre-stocked.
                </Text>
                <View style={styles.grillDots}>
                  {Array.from({ length: grill?.max_level ?? 3 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.grillDot,
                        i < (grill?.grill_level ?? 0) && styles.grillDotOn,
                      ]}
                    />
                  ))}
                  <Text style={styles.grillLevelText}>
                    Lv {grill?.grill_level ?? 0}/{grill?.max_level ?? 3}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              testID="upgrade-grill-button"
              disabled={!grill || grill.maxed || purchasing === "grill"}
              onPress={upgradeGrill}
              style={({ pressed }) => [
                styles.upgradeBtn,
                (!grill || grill.maxed) && styles.buyBtnDisabled,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
            >
              {!grill ? (
                <Text style={styles.upgradeBtnText}>…</Text>
              ) : grill.maxed ? (
                <Text style={styles.upgradeBtnText}>MAXED OUT</Text>
              ) : (
                <>
                  <Text style={styles.buyEmoji}>🪙</Text>
                  <Text style={styles.upgradeBtnText}>Upgrade — {grill.next_cost}</Text>
                </>
              )}
            </Pressable>
          </View>

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
                      !canAfford && styles.buyBtnDisabled,
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <Text style={styles.buyEmoji}>🪙</Text>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  scrollContent: { padding: spacing.lg, gap: spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.surfaceInverse,
    opacity: 0.5,
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
  upgradeEmoji: { fontSize: 44 },
  upgradeTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  upgradeDesc: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", opacity: 0.75, marginTop: 2 },
  grillDots: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  grillDot: {
    width: 22,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  grillDotOn: { backgroundColor: colors.brand },
  grillLevelText: { color: colors.brand, fontWeight: "900", fontSize: 12, marginLeft: spacing.sm },
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
  name: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.surfaceInverse,
    textAlign: "center",
    minHeight: 36,
  },
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
  buyBtnDisabled: { backgroundColor: colors.surfaceTertiary, borderColor: colors.border, opacity: 0.6 },
  buyEmoji: { fontSize: 14 },
  buyText: { fontSize: 15, fontWeight: "900", color: colors.onBrand },
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
