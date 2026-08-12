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

import { api } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { colors, radius, shadow, spacing } from "@/src/theme";

type Row = { id: string; username: string; high_score: number; dishes_cooked: number };

export default function Leaderboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lb, id] = await Promise.all([api.getLeaderboard(), playerStorage.get()]);
      setRows(lb.leaderboard);
      setMyId(id);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container} testID="leaderboard-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} testID="back-button">
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>🏆 Top Chefs</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.brand} />
      ) : rows.length === 0 ? (
        <View style={styles.empty} testID="leaderboard-empty">
          <Text style={styles.emptyEmoji}>🥨</Text>
          <Text style={styles.emptyText}>No rankings yet.{"\n"}Be the first to cook!</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {rows.map((r, idx) => {
            const rank = idx + 1;
            const isMe = r.id === myId;
            const initial = (r.username || "?").slice(0, 2).toUpperCase();
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
            return (
              <View
                key={r.id}
                testID={`leaderboard-row-${rank}`}
                style={[
                  styles.row,
                  rank <= 3 && styles.rowTop,
                  isMe && styles.rowMe,
                ]}
              >
                <Text style={styles.rank}>{medal}</Text>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.username}
                    {isMe ? "  (you)" : ""}
                  </Text>
                  <Text style={styles.sub}>🍽 {r.dishes_cooked} cooked</Text>
                </View>
                <Text style={styles.score}>{r.high_score}</Text>
              </View>
            );
          })}
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
  title: { flex: 1, fontSize: 22, fontWeight: "900", color: colors.surfaceInverse, textAlign: "center" },
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
  rank: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.surfaceInverse,
    minWidth: 44,
    textAlign: "center",
  },
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
