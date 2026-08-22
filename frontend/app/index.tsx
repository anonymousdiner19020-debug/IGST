import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, DailySpecial, DailyGoalStatus, PlayerDTO } from "@/src/api";
import { colors, radius, shadow, spacing } from "@/src/theme";
import { playerStorage } from "@/src/storage";
import { CityHallPenn, LoveStatue, RockyStatue } from "@/src/components/LandmarkIcons";
import LibertyBell from "@/src/components/LibertyBell";
import DishIcon from "@/src/components/DishIcon";

const BG = "https://images.unsplash.com/photo-1548696060-8fae845c6452?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwzfHxjb2xvcmZ1bCUyMGRpbmVyJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3ODY1NjY2Nzh8MA&ixlib=rb-4.1.0&q=85";
const SKYLINE = require("../assets/philly_skyline.jpg");

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState<PlayerDTO | null>(null);
  const [daily, setDaily] = useState<DailySpecial | null>(null);
  const [goal, setGoal] = useState<DailyGoalStatus | null>(null);
  const [claimingGoal, setClaimingGoal] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadPlayer = useCallback(async () => {
    setLoading(true);
    try {
      const id = await playerStorage.get();
      if (!id) {
        setNeedsName(true);
        return;
      }
      const p = await api.getPlayer(id);
      setPlayer(p);
      api.getDailyGoal(id).then(setGoal).catch(() => {});
    } catch (e) {
      // stored id invalid — force onboarding
      await playerStorage.clear();
      setNeedsName(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayer();
  }, [loadPlayer]);

  useEffect(() => {
    api.getDailySpecial().then(setDaily).catch(() => {});
  }, []);

  // reload whenever screen refocuses (coin/level updates)
  useEffect(() => {
    const interval = setInterval(loadPlayer, 3000);
    return () => clearInterval(interval);
  }, [loadPlayer]);

  const handleClaimGoal = async () => {
    const id = await playerStorage.get();
    if (!id) return;
    setClaimingGoal(true);
    try {
      const res = await api.claimDailyGoal(id);
      setPlayer(res.player);
      const bonusText = res.streak_bonus > 0 ? ` (+${res.streak_bonus} 🔥 streak)` : "";
      setClaimMsg(`+${res.reward} 🪙 claimed!${bonusText}`);
      setTimeout(() => setClaimMsg(null), 3500);
      const g = await api.getDailyGoal(id);
      setGoal(g);
    } catch {
      // ignore
    } finally {
      setClaimingGoal(false);
    }
  };

  const handleCreate = async () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const p = await api.createPlayer(trimmed);
      await playerStorage.set(p.id);
      setPlayer(p);
      setNeedsName(false);
    } catch (e) {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center} testID="home-loading">
        <Text style={styles.emoji}>🥨</Text>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (needsName) {
    return (
      <ImageBackground
        source={SKYLINE}
        style={styles.onboarding}
        imageStyle={styles.onboardBgImg}
        testID="onboarding-screen"
      >
        <View style={styles.onboardOverlay} />
        <View style={styles.onboardIcons}>
          <LoveStatue size={48} />
          <LibertyBell size={48} />
          <RockyStatue size={48} />
        </View>
        <Text style={styles.title}>Philly Food Frenzy</Text>
        <Text style={styles.subtitle}>Match ingredients. Cook Philly classics. Feed the city.</Text>
        <View style={styles.inputWrap}>
          <TextInput
            testID="username-input"
            style={styles.input}
            placeholder="Chef name"
            placeholderTextColor={colors.surfaceTertiary}
            value={username}
            onChangeText={setUsername}
            maxLength={20}
            autoFocus
          />
        </View>
        <Pressable
          testID="create-player-button"
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.96 }] }]}
          onPress={handleCreate}
          disabled={creating || !username.trim()}
        >
          <Text style={styles.ctaText}>{creating ? "Cooking..." : "Start Cooking"}</Text>
        </Pressable>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.container} testID="home-screen">
      <ImageBackground source={{ uri: BG }} style={styles.bg} imageStyle={styles.bgImg}>
        <LinearGradient
          colors={["rgba(253,251,247,0.4)", "rgba(77,39,0,0.75)", "rgba(77,39,0,0.95)"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
          <Pressable
            testID="profile-chip"
            style={styles.profileChip}
            onPress={() => router.push("/profile")}
          >
            <Text style={styles.profileEmoji}>👨‍🍳</Text>
            <Text style={styles.profileName} numberOfLines={1}>
              {player?.username || "Chef"}
            </Text>
          </Pressable>

          <View style={styles.balanceRow}>
            <Pressable
              testID="bell-balance"
              style={styles.bellChip}
              onPress={() => router.push("/coin-store")}
            >
              <LibertyBell size={18} />
              <Text style={styles.bellText}>{player?.bells ?? 0}</Text>
            </Pressable>
            <Pressable
              testID="coin-balance"
              style={styles.coinChip}
              onPress={() => router.push("/coin-store")}
            >
              <Text style={styles.coinEmoji}>🪙</Text>
              <Text style={styles.coinText}>{player?.coins ?? 0}</Text>
              <Text style={styles.coinPlus}>＋</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcons}>
            <LoveStatue size={52} />
            <CityHallPenn size={52} />
            <LibertyBell size={52} />
            <RockyStatue size={52} />
          </View>
          <Text style={styles.heroTitle}>Philly Food Frenzy</Text>
          <Text style={styles.heroSubtitle}>MATCH • COOK • SERVE</Text>
        </View>

        <View style={[styles.bottomStack, { paddingBottom: insets.bottom + spacing.xl }]}>
          {daily && (
            <Pressable
              testID="daily-special-banner"
              onPress={() =>
                router.push({
                  pathname: "/game",
                  params: { dishId: daily.dish_id, level: String(player?.current_level ?? 1) },
                })
              }
              style={({ pressed }) => [styles.dailyBanner, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <DishIcon id={daily.dish_id} emoji={daily.emoji} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dailyLabel}>⭐ TODAY&apos;S SPECIAL</Text>
                <Text style={styles.dailyName} numberOfLines={1}>
                  {daily.name}
                </Text>
              </View>
              <View style={styles.dailyBonus}>
                <Text style={styles.dailyBonusText}>{daily.bonus_multiplier}× 🪙</Text>
              </View>
            </Pressable>
          )}

          {goal && (
            <View testID="daily-goal-card" style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalIcon}>{goal.goal.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalLabel}>DAILY CHALLENGE</Text>
                  <Text style={styles.goalName} numberOfLines={1}>
                    {goal.goal.label}
                  </Text>
                </View>
                <View style={styles.goalReward}>
                  <Text style={styles.goalRewardText}>+{goal.goal.reward} 🪙</Text>
                </View>
              </View>
              {goal.streak > 0 && (
                <View style={styles.streakChip} testID="goal-streak">
                  <Text style={styles.streakChipText}>
                    🔥 {goal.streak}-day streak
                    {goal.claimable
                      ? `  •  +${Math.min(goal.streak + 1, 7) * 20} bonus today!`
                      : ""}
                  </Text>
                </View>
              )}
              <View style={styles.goalBarTrack}>
                <View
                  style={[
                    styles.goalBarFill,
                    { width: `${Math.round((goal.progress / goal.target) * 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.goalFooter}>
                <Text style={styles.goalProgressText}>
                  {goal.progress}/{goal.target}
                </Text>
                {goal.claimable ? (
                  <Pressable
                    testID="claim-goal-button"
                    onPress={handleClaimGoal}
                    disabled={claimingGoal}
                    style={({ pressed }) => [styles.goalClaim, pressed && { transform: [{ scale: 0.96 }] }]}
                  >
                    <Text style={styles.goalClaimText}>{claimingGoal ? "..." : "CLAIM"}</Text>
                  </Pressable>
                ) : goal.claimed ? (
                  <Text style={styles.goalDone}>{claimMsg || "✓ Claimed"}</Text>
                ) : (
                  <Text style={styles.goalHint}>Keep serving!</Text>
                )}
              </View>
            </View>
          )}

          <View style={styles.secondaryRow}>
            <SecondaryButton
              testID="rush-button"
              emoji="🔥"
              label="Rush"
              onPress={() => router.push("/rush")}
            />
            <SecondaryButton
              testID="shop-button"
              emoji="🛒"
              label="Shop"
              onPress={() => router.push("/shop")}
            />
            <SecondaryButton
              testID="leaderboard-button"
              emoji="🏆"
              label="Ranks"
              onPress={() => router.push("/leaderboard")}
            />
            <SecondaryButton
              testID="levels-button"
              emoji="🗺️"
              label="Levels"
              onPress={() => router.push("/level-map")}
            />
            <SecondaryButton
              testID="gallery-button"
              emoji="🏛️"
              label="Badges"
              onPress={() => router.push("/gallery")}
            />
          </View>

          <Pressable
            testID="play-button"
            style={({ pressed }) => [styles.playCta, pressed && { transform: [{ scale: 0.95 }] }]}
            onPress={() => router.push("/level-map")}
          >
            <Text style={styles.playCtaText}>PLAY</Text>
            <Text style={styles.playCtaSub}>Level {player?.current_level ?? 1}</Text>
            {goal?.claimable && (
              <View style={styles.playBadge} testID="play-goal-badge">
                <Text style={styles.playBadgeText}>🎁</Text>
              </View>
            )}
          </Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}

function SecondaryButton({
  emoji,
  label,
  onPress,
  testID,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryBtn, pressed && { transform: [{ scale: 0.94 }] }]}
    >
      <Text style={styles.secondaryEmoji}>{emoji}</Text>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceInverse },
  bg: { flex: 1 },
  bgImg: { resizeMode: "cover" },
  center: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  emoji: { fontSize: 64 },
  onboarding: {
    flex: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.lg,
  },
  onboardBgImg: { resizeMode: "cover" },
  onboardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2, 20, 24, 0.55)",
  },
  emojiHero: { fontSize: 56 },
  onboardIcons: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    opacity: 0.9,
    marginBottom: spacing.md,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  inputWrap: { width: "100%" },
  input: {
    borderWidth: 3,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 18,
    fontWeight: "700",
    color: colors.surfaceInverse,
    backgroundColor: colors.surfaceSecondary,
  },
  cta: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.pill,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  ctaText: { fontSize: 22, fontWeight: "900", color: colors.onBrand, letterSpacing: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadow.tier1,
    maxWidth: 160,
  },
  profileEmoji: { fontSize: 20 },
  profileName: { fontSize: 14, fontWeight: "800", color: colors.surfaceInverse },
  coinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadow.tier1,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  coinEmoji: { fontSize: 18 },
  coinText: { fontSize: 16, fontWeight: "900", color: colors.onBrand },
  coinPlus: { fontSize: 16, fontWeight: "900", color: colors.onBrand, marginLeft: 2 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bellChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadow.tier1,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  bellText: { fontSize: 16, fontWeight: "900", color: colors.onBrandTertiary },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  heroEmoji: { fontSize: 68, marginBottom: spacing.md },
  heroIcons: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  heroTitle: {
    fontSize: 44,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 3,
    marginTop: spacing.sm,
  },
  bottomStack: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  dailyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.brand,
  },
  dailyEmoji: { fontSize: 38 },
  dailyLabel: { fontSize: 10, fontWeight: "900", color: colors.brandSecondary, letterSpacing: 1 },
  dailyName: { fontSize: 16, fontWeight: "900", color: colors.surfaceInverse },
  dailyBonus: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  dailyBonusText: { fontSize: 14, fontWeight: "900", color: colors.onBrand },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.brandSecondary,
  },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  goalIcon: { fontSize: 30 },
  goalLabel: { fontSize: 10, fontWeight: "900", color: colors.brandSecondary, letterSpacing: 1 },
  goalName: { fontSize: 15, fontWeight: "900", color: colors.surfaceInverse },
  goalReward: {
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  goalRewardText: { fontSize: 13, fontWeight: "900", color: colors.onBrandSecondary },
  goalBarTrack: {
    height: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalBarFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: radius.pill,
  },
  goalFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  goalProgressText: { fontSize: 14, fontWeight: "900", color: colors.surfaceInverse },
  goalClaim: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  goalClaimText: { fontSize: 13, fontWeight: "900", color: colors.onBrand, letterSpacing: 1 },
  goalDone: { fontSize: 13, fontWeight: "900", color: colors.success },
  goalHint: { fontSize: 12, fontWeight: "700", color: colors.surfaceTertiary },
  streakChip: {
    alignSelf: "flex-start",
    backgroundColor: "#FFE8CC",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  streakChipText: { fontSize: 12, fontWeight: "900", color: "#B45309" },
  playBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
    paddingHorizontal: 4,
  },
  playBadgeText: { fontSize: 15, fontWeight: "900", color: colors.onBrand },
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.xs,
    ...shadow.tier1,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  secondaryEmoji: { fontSize: 24 },
  secondaryLabel: { fontSize: 13, fontWeight: "800", color: colors.surfaceInverse },
  playCta: {
    backgroundColor: colors.brandSecondary,
    paddingVertical: spacing.xl,
    borderRadius: radius.pill,
    alignItems: "center",
    ...shadow.tier3,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  playCtaText: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.onBrandSecondary,
    letterSpacing: 4,
  },
  playCtaSub: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onBrandSecondary,
    opacity: 0.85,
    letterSpacing: 2,
  },
});
