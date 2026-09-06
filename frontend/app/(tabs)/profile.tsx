import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useInsights } from "@/src/api";
import { shortDate } from "@/src/date-utils";
import { Icon, PrimaryButton } from "@/src/components/ui";
import { moodEmoji, moodLabel } from "@/src/mood";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

const WORKOUT_ICONS: Record<string, any> = {
  Cardio: "heart",
  Weights: "activity",
  "Rest Day": "moon",
  Other: "more-horizontal",
};

export default function ProgressScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { data } = useInsights(userId);

  const workouts = Object.entries(data?.workoutBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
  const maxW = Math.max(1, ...workouts.map(([, v]) => v));
  const moods = Object.entries(data?.moodBreakdown ?? {}).sort((a, b) => Number(b[0]) - Number(a[0]));
  const maxM = Math.max(1, ...moods.map(([, v]) => v));

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Progress</Text>
          {data ? <Text style={styles.subtitle}>Journeying since {shortDate(data.signupDate)}</Text> : null}
        </View>
        <Pressable onPress={() => router.push("/settings")} hitSlop={10} testID="open-settings">
          <Icon name="settings" size={24} color={colors.onSurface} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          testID="weekly-recap-btn"
          onPress={() => router.push("/recap")}
          style={({ pressed }) => [styles.recapCard, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.recapIcon}>
            <Icon name="share-2" size={22} color={colors.onBrandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recapTitle}>Weekly Recap</Text>
            <Text style={styles.recapSub}>See & share your week's wins</Text>
          </View>
          <Icon name="chevron-right" size={22} color={colors.brand} />
        </Pressable>

        <View style={styles.hero}>
          <Icon name="zap" size={26} color={colors.warning} />
          <Text style={styles.heroNum}>{data?.currentStreak ?? 0}</Text>
          <Text style={styles.heroLabel}>day current streak</Text>
        </View>

        <View style={styles.grid}>
          <StatCard icon="award" value={`${data?.longestStreak ?? 0}`} label="Longest streak" />
          <StatCard icon="calendar" value={`${data?.dayNumber ?? 0}`} label="Days on journey" />
          <StatCard icon="log-in" value={`${data?.loginDays ?? 0}`} label="Days logged in" />
          <StatCard icon="book-open" value={`${data?.totalEntries ?? 0}`} label="Entries written" />
        </View>

        <Text style={styles.sectionTitle}>Workout breakdown</Text>
        <View style={styles.workoutCard}>
          {workouts.length === 0 ? (
            <Text style={styles.emptyText}>Log a workout in your daily check-in to see stats here.</Text>
          ) : (
            workouts.map(([name, count]) => (
              <View key={name} style={styles.workoutRow}>
                <View style={styles.workoutIcon}>
                  <Icon name={WORKOUT_ICONS[name] ?? "activity"} size={16} color={colors.brand} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.workoutLabelRow}>
                    <Text style={styles.workoutName}>{name}</Text>
                    <Text style={styles.workoutCount}>{count}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(count / maxW) * 100}%` }]} />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
        <Text style={styles.sectionTitle}>Mood breakdown</Text>
        <View style={styles.workoutCard}>
          {moods.length === 0 ? (
            <Text style={styles.emptyText}>Log your mood in the daily check-in to spot patterns here.</Text>
          ) : (
            moods.map(([key, count]) => (
              <View key={key} style={styles.workoutRow}>
                <Text style={styles.moodStatEmoji}>{moodEmoji(key)}</Text>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.workoutLabelRow}>
                    <Text style={styles.workoutName}>{moodLabel(key)}</Text>
                    <Text style={styles.workoutCount}>{count}</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(count / maxM) * 100}%` }]} />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, value, label }: { icon: any; value: string; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.statCard}>
      <Icon name={icon} size={20} color={colors.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  recapCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  recapIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  recapTitle: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface },
  recapSub: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 2 },
  moodStatEmoji: { fontSize: 26, width: 36, textAlign: "center" },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: c.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginTop: 2 },
  hero: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  heroNum: { fontFamily: fonts.displayBold, fontSize: 52, color: c.onSurface },
  heroLabel: { fontFamily: fonts.medium, fontSize: 15, color: c.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  statCard: {
    width: "47.5%",
    flexGrow: 1,
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  statValue: { fontFamily: fonts.displayBold, fontSize: 26, color: c.onSurface },
  statLabel: { fontFamily: fonts.regular, fontSize: 13, color: c.muted },
  sectionTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface, marginTop: 28, marginBottom: 14 },
  workoutCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, lineHeight: 20 },
  workoutRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  workoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  workoutName: { fontFamily: fonts.semibold, fontSize: 15, color: c.onSurface },
  workoutCount: { fontFamily: fonts.semibold, fontSize: 15, color: c.brand },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, backgroundColor: c.brandPrimary },
}));
