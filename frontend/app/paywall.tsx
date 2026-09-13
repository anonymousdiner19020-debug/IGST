import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

import { Icon, PrimaryButton } from "@/src/components/ui";
import { rcEnabled, useAccess, useSubscription } from "@/src/revenuecat";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const PERKS = [
  "Unlimited daily check-ins & journaling",
  "Full calendar, moods & insights",
  "Weekly & yearly recaps",
  "Custom backgrounds & themes",
  "The private, PIN-locked tracker",
];

function packageLabel(pkg: PurchasesPackage): string {
  const t = pkg.packageType;
  if (t === "ANNUAL") return "Yearly";
  if (t === "MONTHLY") return "Monthly";
  return pkg.product.title || pkg.identifier;
}

export default function PaywallScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { offerings, purchase, restore, isPurchasing, isRestoring, identityReady, identityError, isLoading } =
    useSubscription();
  const { isSubscribed, inTrial, trialDaysLeft } = useAccess();

  const [pending, setPending] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const packages = offerings?.current?.availablePackages ?? [];
  const unavailable = !rcEnabled || (!isLoading && packages.length === 0);

  const doPurchase = async (pkg: PurchasesPackage) => {
    setError(null);
    try {
      await purchase(pkg);
      setPending(null);
      router.back();
    } catch (e: any) {
      setPending(null);
      if (e?.userCancelled) return;
      if (String(e?.message || e).includes("identity_not_ready")) {
        setError("We couldn't verify your account. Please try again in a moment.");
        return;
      }
      setError(e?.message ? String(e.message) : "Purchase failed. Please try again.");
    }
  };

  const doRestore = async () => {
    setError(null);
    try {
      await restore();
    } catch {
      setError("Could not restore purchases.");
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={8} testID="paywall-close">
        <Icon name="x" size={22} color={colors.onSurface} />
      </Pressable>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="unlock" size={28} color={colors.brand} />
          </View>
          <Text style={styles.title}>Aura Premium</Text>
          <Text style={styles.subtitle}>Unlock everything and keep your momentum going.</Text>
        </View>

        {isSubscribed ? (
          <View style={styles.statusBanner}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <Text style={styles.statusText}>You&apos;re a Premium member — thank you!</Text>
          </View>
        ) : inTrial ? (
          <View style={styles.statusBanner}>
            <Icon name="clock" size={18} color={colors.brand} />
            <Text style={styles.statusText}>
              {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in your free trial
            </Text>
          </View>
        ) : (
          <View style={[styles.statusBanner, styles.statusLocked]}>
            <Icon name="lock" size={18} color={colors.warning} />
            <Text style={styles.statusText}>Your free trial has ended</Text>
          </View>
        )}

        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p} style={styles.perkRow}>
              <Icon name="check" size={18} color={colors.brand} />
              <Text style={styles.perkText}>{p}</Text>
            </View>
          ))}
        </View>

        {identityError ? (
          <View style={[styles.statusBanner, styles.statusLocked]}>
            <Icon name="alert-triangle" size={18} color={colors.error} />
            <Text style={styles.statusText}>Account not ready for purchases yet. Please reopen this screen.</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isLoading ? (
          <ActivityIndicator color={colors.brand} style={{ marginTop: 12 }} />
        ) : unavailable ? (
          <Text style={styles.unavailable}>
            Subscription options are unavailable right now. Please try again later.
          </Text>
        ) : isSubscribed ? null : (
          <View style={{ gap: 12 }}>
            {packages.map((pkg) => (
              <Pressable
                key={pkg.identifier}
                style={styles.planCard}
                onPress={() => setPending(pkg)}
                disabled={!identityReady || isPurchasing}
                testID={`plan-${pkg.packageType}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{packageLabel(pkg)}</Text>
                  <Text style={styles.planDesc}>{pkg.product.description || pkg.product.title}</Text>
                </View>
                <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
              </Pressable>
            ))}
            {!identityReady ? (
              <Text style={styles.hint}>Preparing your account…</Text>
            ) : null}
          </View>
        )}

        {!isSubscribed && !unavailable ? (
          <Pressable onPress={doRestore} style={styles.restoreBtn} disabled={isRestoring} testID="paywall-restore">
            <Text style={styles.restoreText}>{isRestoring ? "Restoring…" : "Restore purchases"}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Deliberate confirmation (Test Store in preview) */}
      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Confirm subscription</Text>
            <Text style={styles.confirmBody}>
              {pending ? `${packageLabel(pending)} — ${pending.product.priceString}` : ""}
            </Text>
            {__DEV__ ? <Text style={styles.simulated}>Simulated purchase (Test Store)</Text> : null}
            <View style={{ gap: 10, marginTop: 8 }}>
              <PrimaryButton
                label={isPurchasing ? "Processing…" : "Subscribe"}
                icon="check"
                onPress={() => pending && doPurchase(pending)}
                loading={isPurchasing}
                testID="paywall-confirm"
              />
              <Pressable onPress={() => setPending(null)} style={styles.cancelBtn} testID="paywall-cancel">
                <Text style={styles.cancelText}>Not now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  closeBtn: { alignSelf: "flex-end", marginRight: 16, width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  hero: { alignItems: "center", gap: 8 },
  heroIcon: { width: 72, height: 72, borderRadius: 999, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: c.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 21, paddingHorizontal: 16 },
  statusBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  statusLocked: { backgroundColor: c.surface },
  statusText: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface, flex: 1 },
  perks: { gap: 12, padding: 18, borderRadius: 18, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  perkText: { fontFamily: fonts.medium, fontSize: 15, color: c.onSurface, flex: 1 },
  planCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 16, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.borderStrong },
  planName: { fontFamily: fonts.displayBold, fontSize: 18, color: c.onSurface },
  planDesc: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 2 },
  planPrice: { fontFamily: fonts.displayBold, fontSize: 20, color: c.brand },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, textAlign: "center" },
  unavailable: { fontFamily: fonts.medium, fontSize: 14, color: c.muted, textAlign: "center", lineHeight: 21, marginTop: 12 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: c.error, textAlign: "center" },
  restoreBtn: { alignItems: "center", paddingVertical: 12 },
  restoreText: { fontFamily: fonts.semibold, fontSize: 15, color: c.brand },
  confirmBackdrop: { flex: 1, backgroundColor: "rgba(45,43,42,0.5)", alignItems: "center", justifyContent: "center", padding: 28 },
  confirmCard: { width: "100%", maxWidth: 340, backgroundColor: c.surface, borderRadius: 24, padding: 24, gap: 6 },
  confirmTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  confirmBody: { fontFamily: fonts.medium, fontSize: 15, color: c.onSurfaceSecondary },
  simulated: { fontFamily: fonts.regular, fontSize: 12, color: c.muted, marginTop: 2 },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontFamily: fonts.semibold, fontSize: 15, color: c.muted },
}));
