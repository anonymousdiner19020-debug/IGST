import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import dayjs from "dayjs";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCalendar, useDay, useOnThisDay } from "@/src/api";
import { greeting, prettyDate, todayStr } from "@/src/date-utils";
import { Icon } from "@/src/components/ui";
import { moodEmoji } from "@/src/mood";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

const HERO =
  "https://images.unsplash.com/photo-1490735891913-40897cdaafd1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHx3YXJtJTIwc3VucmlzZSUyMGFlc3RoZXRpYyUyMHNreXxlbnwwfHx8fDE3ODg3MTY0NjB8MA&ixlib=rb-4.1.0&q=85";

export default function TodayScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId, init } = useUser();
  const today = todayStr();
  const { data: day, isLoading } = useDay(userId, today);
  const { data: cal } = useCalendar(userId);
  const { data: otd } = useOnThisDay(userId);

  const quote = day?.content.quote;
  const done = day?.hasContent;
  const streak = init?.currentStreak ?? cal?.currentStreak ?? 0;
  const loginDates = new Set(cal?.loginDates ?? []);

  const last7 = Array.from({ length: 7 }).map((_, i) =>
    dayjs().day(0).add(i, "day").format("YYYY-MM-DD"),
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={styles.heroImg} contentFit="cover" transition={300} />
          <LinearGradient
            colors={["rgba(51,49,46,0.15)", "rgba(51,49,46,0.75)"]}
            style={styles.heroScrim}
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + 20 }]}>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.date}>{prettyDate(today)}</Text>
            {init ? (
              <Text style={styles.dayBadge}>Day {init.dayNumber} of your journey</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          {/* Quote card overlapping the hero */}
          <View style={styles.quoteCard} testID="quote-card">
            <Icon name="feather" size={18} color={colors.brand} />
            {isLoading ? (
              <ActivityIndicator color={colors.brand} style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.quoteText}>“{quote?.text}”</Text>
                {quote?.author ? <Text style={styles.quoteAuthor}>— {quote.author}</Text> : null}
              </>
            )}
          </View>

          {/* Begin check-in */}
          <Pressable
            testID="begin-checkin-card"
            onPress={() => router.push("/flow")}
            style={({ pressed }) => [styles.beginCard, pressed && styles.pressed]}
          >
            <View style={styles.beginIcon}>
              <Icon name={done ? "check" : "edit-3"} size={24} color={colors.onBrandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.beginTitle}>
                {done ? "Continue today's check-in" : "Begin Daily Check-in"}
              </Text>
              <Text style={styles.beginSub}>
                {done ? "You've started today — tap to review or edit" : "A few mindful minutes for yourself"}
              </Text>
            </View>
            <Icon name="chevron-right" size={22} color={colors.brand} />
          </Pressable>

          {/* Streak widget */}
          <View style={styles.streakCard} testID="streak-widget">
            <View style={styles.streakHeader}>
              <View style={styles.streakFlame}>
                <Icon name="zap" size={18} color={colors.warning} />
                <Text style={styles.streakNum}>{streak}</Text>
              </View>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
            <View style={styles.dotsRow}>
              {last7.map((d) => {
                const active = loginDates.has(d) || (d === today && !!init);
                return (
                  <View key={d} style={styles.dotCol}>
                    <View style={[styles.dot, active && styles.dotActive]}>
                      {active ? <Icon name="check" size={14} color={colors.onBrandPrimary} /> : null}
                    </View>
                    <Text style={styles.dotLabel}>{dayjs(d).format("dd")[0]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          {otd?.found ? (
            <Pressable
              testID="on-this-day-card"
              onPress={() => router.push(`/day/${otd.date}`)}
              style={({ pressed }) => [styles.otdCard, pressed && styles.pressed]}
            >
              <View style={styles.otdHead}>
                <Icon name="rotate-ccw" size={16} color={colors.brand} />
                <Text style={styles.otdLabel}>
                  On this day · {otd.weeksAgo} week{(otd.weeksAgo ?? 0) > 1 ? "s" : ""} ago
                  {otd.mood ? `  ${moodEmoji(otd.mood)}` : ""}
                </Text>
              </View>
              <Text style={styles.otdSnippet} numberOfLines={2}>
                {otd.snippet || "You journaled on this day."}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { height: 280, width: "100%" },
  heroImg: { position: "absolute", width: "100%", height: "100%" },
  heroScrim: { position: "absolute", width: "100%", height: "100%" },
  heroContent: { flex: 1, paddingHorizontal: 24, justifyContent: "flex-start" },
  greeting: { fontFamily: fonts.regular, fontSize: 16, color: c.onSurfaceInverse, opacity: 0.9 },
  date: { fontFamily: fonts.displayBold, fontSize: 30, color: c.onSurfaceInverse, marginTop: 4 },
  dayBadge: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: c.onSurfaceInverse,
    opacity: 0.85,
    marginTop: 8,
  },
  body: { paddingHorizontal: 20, marginTop: -48 },
  quoteCard: {
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: c.border,
    gap: 6,
  },
  quoteText: { fontFamily: fonts.display, fontSize: 20, lineHeight: 30, color: c.onSurface },
  quoteAuthor: { fontFamily: fonts.medium, fontSize: 14, color: c.muted, marginTop: 4 },
  beginCard: {
    marginTop: 20,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  pressed: { opacity: 0.9 },
  beginIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  beginTitle: { fontFamily: fonts.semibold, fontSize: 17, color: c.onSurface },
  beginSub: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 3 },
  streakCard: {
    marginTop: 20,
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: c.border,
  },
  streakHeader: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 18 },
  streakFlame: { flexDirection: "row", alignItems: "center", gap: 6 },
  streakNum: { fontFamily: fonts.displayBold, fontSize: 26, color: c.onSurface },
  streakLabel: { fontFamily: fonts.medium, fontSize: 15, color: c.muted },
  dotsRow: { flexDirection: "row", justifyContent: "space-between" },
  dotCol: { alignItems: "center", gap: 6 },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: c.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { backgroundColor: c.brandPrimary },
  dotLabel: { fontFamily: fonts.medium, fontSize: 11, color: c.muted },
  otdCard: {
    marginTop: 20,
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: c.border,
    gap: 8,
  },
  otdHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  otdLabel: { fontFamily: fonts.semibold, fontSize: 13, color: c.brand },
  otdSnippet: { fontFamily: fonts.display, fontSize: 17, lineHeight: 25, color: c.onSurface },
}));
