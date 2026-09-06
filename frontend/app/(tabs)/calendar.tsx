import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCalendar } from "@/src/api";
import { todayStr } from "@/src/date-utils";
import { Icon } from "@/src/components/ui";
import { moodEmoji } from "@/src/mood";
import dayjs from "dayjs";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

export default function CalendarScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { data } = useCalendar(userId);

  const completedSet = useMemo(
    () => new Set((data?.days ?? []).filter((d) => d.completed).map((d) => d.date)),
    [data],
  );
  const specialSet = useMemo(
    () => new Set((data?.days ?? []).filter((d) => d.isSpecial).map((d) => d.date)),
    [data],
  );
  const loginSet = useMemo(() => new Set(data?.loginDates ?? []), [data]);
  const moodByDate = useMemo(
    () => new Map((data?.days ?? []).map((d) => [d.date, d.mood])),
    [data],
  );

  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    dayjs().day(0).add(i, "day").format("YYYY-MM-DD"),
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>Tap any day to view or edit that entry</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <Stat label="Current streak" value={`${data?.currentStreak ?? 0}`} icon="zap" />
          <Stat label="Days logged" value={`${data?.loginDays ?? 0}`} icon="calendar" />
          <Stat label="Entries" value={`${data?.totalEntries ?? 0}`} icon="book-open" />
        </View>

        <View style={styles.calWrap}>
          <Calendar
            firstDay={0}
            maxDate={todayStr()}
            dayComponent={({ date, state }: any) => {
              if (!date) return <View style={styles.cell} />;
              const ds = date.dateString;
              const completed = completedSet.has(ds);
              const login = loginSet.has(ds);
              const special = specialSet.has(ds);
              const mood = moodByDate.get(ds);
              const disabled = state === "disabled";
              const isToday = state === "today";
              return (
                <Pressable
                  testID={`cal-day-${ds}`}
                  disabled={disabled}
                  onPress={() => router.push(`/day/${ds}`)}
                  style={styles.cell}
                >
                  <View
                    style={[
                      styles.cellCircle,
                      completed && { backgroundColor: colors.brandPrimary },
                      login && !completed && { backgroundColor: colors.brandTertiary },
                      special && { borderWidth: 2, borderColor: colors.warning },
                      isToday && !completed && { borderWidth: 2, borderColor: colors.brand },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cellNum,
                        completed && { color: colors.onBrandPrimary },
                        disabled && { color: colors.border },
                      ]}
                    >
                      {date.day}
                    </Text>
                  </View>
                  <Text style={styles.cellMood}>{mood ? moodEmoji(mood) : " "}</Text>
                </Pressable>
              );
            }}
            theme={{
              calendarBackground: colors.surface,
              monthTextColor: colors.onSurface,
              textMonthFontFamily: fonts.display,
              textMonthFontSize: 18,
              arrowColor: colors.brand,
              textDayHeaderFontFamily: fonts.semibold,
              textSectionTitleColor: colors.muted,
            }}
          />
        </View>

        <View style={styles.moodStrip}>
          <Text style={styles.moodStripTitle}>This week's mood</Text>
          <View style={styles.moodRow}>
            {weekDays.map((d) => {
              const m = moodByDate.get(d);
              return (
                <View key={d} style={styles.moodCol}>
                  <Text style={styles.moodEmojiText}>{m ? moodEmoji(m) : "·"}</Text>
                  <Text style={styles.moodDayLabel}>{dayjs(d).format("dd")[0]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.legend}>
          <LegendItem color={colors.brandPrimary} label="Journaled" />
          <LegendItem color={colors.brandTertiary} label="Logged in" />
          <LegendItem color={colors.surface} border={colors.warning} label="Special day" />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: any }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={18} color={colors.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, label, border }: { color: string; label: string; border?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <View
        style={[styles.legendDot, { backgroundColor: color }, border ? { borderWidth: 2, borderColor: border } : null]}
      />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: c.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  stat: {
    flex: 1,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: c.border,
  },
  statValue: { fontFamily: fonts.displayBold, fontSize: 22, color: c.onSurface },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: c.muted, textAlign: "center" },
  calWrap: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  cell: { alignItems: "center", justifyContent: "flex-start", width: 40, height: 46 },
  cellCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  cellNum: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface },
  cellMood: { fontSize: 12, height: 14, lineHeight: 14 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 20, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  moodStrip: {
    marginTop: 20,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  moodStripTitle: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface },
  moodRow: { flexDirection: "row", justifyContent: "space-between" },
  moodCol: { alignItems: "center", gap: 4 },
  moodEmojiText: { fontSize: 22 },
  moodDayLabel: { fontFamily: fonts.medium, fontSize: 11, color: c.muted },
  legendDot: { width: 16, height: 16, borderRadius: 999 },
  legendLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.onSurfaceTertiary },
}));
