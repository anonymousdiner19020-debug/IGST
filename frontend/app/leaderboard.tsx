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

import { api, WeeklyBoard } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { colors, radius, shadow, spacing } from "@/src/theme";

type AllRow = { id: string; username: string; high_score: number; dishes_cooked: number };
type Tab = "all" | "weekly";

export default function Leaderboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("all");
  const [allRows, setAllRows] = useState<AllRow[]>([]);
  const [weekly, setWeekly] = useState<WeeklyBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lb, wk, id] = await Promise.all([
        api.getLeaderboard(),
        api.getWeeklyLeaderboard(),
        playerStorage.get(),
      ]);
      setAllRows(lb.leaderboard);
      setWeekly(wk);
      setMyId(id);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const weeklyRows = weekly?.leaderboard ?? [];

  const renderRow = (
    key: string,
    rank: number,
    username: string,
    score: number,
    subtitle: string,
    isMe: boolean
  ) => {
    const initial = (username || "?").slice(0, 2).toUpperCase();
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
    return (
      <View
        key={key}
        testID={`leaderboard-row-${rank}`}
        style={[styles.row, rank <= 3 && styles.rowTop, isMe && styles.rowMe]}
      >
        <Text style={styles.rank}>{medal}</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {username}
            {isMe ? "  (you)" : ""}
          </Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>
        <Text style={styles.score}>{score}</Text>
      </View>
    );
  };

  const isEmpty = tab === "all" ? allRows.length === 0 : weeklyRows.length === 0;

  return (
    <View style={styles.container} testID="leaderboard-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>🏆 Top Chefs</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tab toggle */}
      <View style={styles.tabs}>
        <Pressable
          testID="tab-all"
          onPress={() => setTab("all")}
          style={[styles.tab, tab === "all" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>All-Time</Text>
        </Pressable>
        <Pressable
          testID="tab-weekly"
          onPress={() => setTab("weekly")}
          style={[styles.tab, tab === "weekly" && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === "weekly" && styles.tabTextActive]}>
            Weekly Cup
          </Text>
        </Pressable>
      </View>

      {tab === "weekly" && weekly && (
        <View style={styles.weeklyBanner} testID="weekly-banner">
          <Text style={styles.weeklyBannerText}>
            {weekly.champion
              ? `👑 Champion: ${weekly.champion.username}`
              : "👑 No champion yet — take the crown!"}
          </Text>
          <Text style={styles.weeklyResets}>Resets {weekly.resets_on} (Mon)</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.brand} />
      ) : isEmpty ? (
        <View style={styles.empty} testID="leaderboard-empty">
          <Text style={styles.emptyEmoji}>🥨</Text>
          <Text style={styles.emptyText}>
            {tab === "weekly"
              ? "No scores this week yet.\nPlay to enter the Weekly Cup!"
              : "No rankings yet.\nBe the first to cook!"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {tab === "all"
            ? allRows.map((r, idx) =>
                renderRow(r.id, idx + 1, r.username, r.high_score, `🍽 ${r.dishes_cooked} cooked`, r.id === myId)
              )
            : weeklyRows.map((r, idx) =>
                renderRow(r.id, idx + 1, r.username, r.weekly_score, "this week's best run", r.id === myId)
              )}
        </ScrollView>
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
  title: { flex: 1, fontSize: 22, fontWeight: "900", color: colors.surfaceInverse, textAlign: "center" },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  tabText: { fontSize: 14, fontWeight: "900", color: colors.surfaceInverse, opacity: 0.6 },
  tabTextActive: { color: "#FFFFFF", opacity: 1 },
  weeklyBanner: {
    margin: spacing.lg,
    marginBottom: 0,
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.surfaceInverse,
  },
  weeklyBannerText: { fontSize: 15, fontWeight: "900", color: colors.onBrand },
  weeklyResets: { fontSize: 12, fontWeight: "700", color: colors.onBrand, opacity: 0.75, marginTop: 2 },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow.tier1,
  },
  rowTop: { backgroundColor: colors.brand, borderColor: colors.surfaceInverse },
  rowMe: { borderColor: colors.brandTertiary, borderWidth: 3 },
  rank: { fontSize: 22, fontWeight: "900", color: colors.surfaceInverse, minWidth: 44, textAlign: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "900" },
  name: { fontSize: 16, fontWeight: "900", color: colors.surfaceInverse },
  sub: { fontSize: 12, fontWeight: "700", color: colors.surfaceInverse, opacity: 0.6 },
  score: { fontSize: 18, fontWeight: "900", color: colors.surfaceInverse },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyEmoji: { fontSize: 64 },
  emptyText: {
    fontSize: 16,
    color: colors.surfaceInverse,
    opacity: 0.6,
    textAlign: "center",
    fontWeight: "700",
  },
});
