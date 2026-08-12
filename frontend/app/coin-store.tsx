import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, BellPack, CoinPack, PlayerDTO } from "@/src/api";
import { playerStorage } from "@/src/storage";
import {
  getOfferingPackages,
  purchasePackage,
  purchasesAvailable,
  restore,
} from "@/src/purchases";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";
import LibertyBell from "@/src/components/LibertyBell";

export default function CoinStore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [bellPacks, setBellPacks] = useState<BellPack[]>([]);
  const [player, setPlayer] = useState<PlayerDTO | null>(null);
  const [storePackages, setStorePackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const iapReady = purchasesAvailable() && Platform.OS !== "web";

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, b, id] = await Promise.all([api.getCoinPacks(), api.getBellPacks(), playerStorage.get()]);
      setPacks(p.packs);
      setBellPacks(b.packs);
      if (id) setPlayer(await api.getPlayer(id));
      if (iapReady) setStorePackages(await getOfferingPackages());
    } catch {}
    setLoading(false);
  }, [iapReady]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshBalance = async () => {
    const id = await playerStorage.get();
    if (id) {
      try {
        setPlayer(await api.getPlayer(id));
      } catch {}
    }
  };

  const buy = async (productId: string) => {
    if (!iapReady) {
      showToast("Purchases activate after you publish a build");
      return;
    }
    const storePkg = storePackages.find((sp) => sp.product?.identifier === productId);
    if (!storePkg) {
      showToast("Product not available in store yet");
      return;
    }
    setBusy(productId);
    const res = await purchasePackage(storePkg);
    if (res.ok) {
      sound.play("coin");
      showToast("Purchase complete! Adding to balance…");
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 1200));
        await refreshBalance();
      }
    } else if (!res.cancelled) {
      showToast(res.error || "Purchase failed");
    }
    setBusy(null);
  };

  const priceFor = (productId: string, fallback: string) => {
    const sp = storePackages.find((s) => s.product?.identifier === productId);
    return sp?.product?.priceString || fallback;
  };

  return (
    <View style={styles.container} testID="coin-store-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Store</Text>
        <View style={styles.balances}>
          <View style={styles.coinChip}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinText}>{player?.coins ?? 0}</Text>
          </View>
          <View style={styles.bellChip}>
            <LibertyBell size={16} />
            <Text style={styles.bellText}>{player?.bells ?? 0}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.brand} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}>
          {!iapReady && (
            <View style={styles.notice} testID="iap-notice">
              <Text style={styles.noticeEmoji}>📦</Text>
              <Text style={styles.noticeText}>
                Coin packs go live after you publish the app and generate an iOS/Android build.
                Prices below are examples.
              </Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>🪙 COIN PACKS</Text>          {packs.map((pack) => (
            <View key={pack.product_id} style={styles.packCard} testID={`pack-${pack.product_id}`}>
              {pack.best_value && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>BEST VALUE</Text>
                </View>
              )}
              <Text style={styles.packEmoji}>{pack.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.packCoins}>{pack.coins.toLocaleString()} coins</Text>
                <Text style={styles.packSub}>Instant top-up</Text>
              </View>
              <Pressable
                testID={`buy-pack-${pack.product_id}`}
                disabled={busy === pack.product_id}
                onPress={() => buy(pack.product_id)}
                style={({ pressed }) => [styles.priceBtn, pressed && { transform: [{ scale: 0.96 }] }]}
              >
                <Text style={styles.priceText}>
                  {busy === pack.product_id ? "…" : priceFor(pack.product_id, pack.fallback_price)}
                </Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.bellSectionRow}>
            <LibertyBell size={20} />
            <Text style={styles.sectionLabel}>LIBERTY BELLS</Text>
          </View>
          <Text style={styles.bellHint}>Spend bells to retry a failed level.</Text>
          {bellPacks.map((pack) => (
            <View key={pack.product_id} style={styles.packCard} testID={`pack-${pack.product_id}`}>
              {pack.best_value && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>BEST VALUE</Text>
                </View>
              )}
              <LibertyBell size={40} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.packCoins}>{pack.bells} Liberty Bells</Text>
                <Text style={styles.packSub}>Retry {pack.bells} levels</Text>
              </View>
              <Pressable
                testID={`buy-pack-${pack.product_id}`}
                disabled={busy === pack.product_id}
                onPress={() => buy(pack.product_id)}
                style={({ pressed }) => [
                  styles.priceBtn,
                  { backgroundColor: colors.brandTertiary },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <Text style={[styles.priceText, { color: colors.onBrandTertiary }]}>
                  {busy === pack.product_id ? "…" : priceFor(pack.product_id, pack.fallback_price)}
                </Text>
              </Pressable>
            </View>
          ))}

          {iapReady && (
            <Pressable testID="restore-button" onPress={() => restore().then(refreshBalance)}>
              <Text style={styles.restore}>Restore Purchases</Text>
            </Pressable>
          )}

          <Text style={styles.freeHint}>💡 You can also earn coins free by playing levels & Rush!</Text>
        </ScrollView>
      )}

      {toast && (
        <View style={[styles.toast, { bottom: insets.bottom + spacing.xl }]} testID="coin-toast">
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
  balances: { flexDirection: "row", gap: spacing.sm },
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
  bellChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  bellText: { fontSize: 14, fontWeight: "900", color: colors.onBrandTertiary },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.surfaceInverse,
    letterSpacing: 1,
    marginTop: spacing.md,
  },
  bellHint: { fontSize: 12, fontWeight: "700", color: colors.surfaceInverse, opacity: 0.6, marginTop: -spacing.xs },
  bellSectionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  coinEmoji: { fontSize: 16 },
  coinText: { fontSize: 14, fontWeight: "900", color: colors.onBrand },
  scroll: { padding: spacing.lg, gap: spacing.md },
  notice: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  noticeEmoji: { fontSize: 28 },
  noticeText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#FFFFFF", opacity: 0.9 },
  packCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.borderStrong,
  },
  badge: {
    position: "absolute",
    top: -10,
    right: spacing.lg,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: { fontSize: 10, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  packEmoji: { fontSize: 44 },
  packCoins: { fontSize: 20, fontWeight: "900", color: colors.surfaceInverse },
  packSub: { fontSize: 12, fontWeight: "700", color: colors.surfaceInverse, opacity: 0.55 },
  priceBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
    minWidth: 84,
    alignItems: "center",
  },
  priceText: { fontSize: 16, fontWeight: "900", color: colors.onSuccess },
  restore: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: colors.info,
    textDecorationLine: "underline",
    marginTop: spacing.sm,
  },
  freeHint: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: colors.surfaceInverse,
    opacity: 0.6,
    marginTop: spacing.md,
  },
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
  toastText: { color: colors.onSurfaceInverse, fontWeight: "800", fontSize: 13, textAlign: "center" },
});
