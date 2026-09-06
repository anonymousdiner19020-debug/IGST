import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDay, fileUrl, type DayEntry } from "@/src/api";
import { prettyDate } from "@/src/date-utils";
import { EmptyState, Icon, PrimaryButton } from "@/src/components/ui";
import { moodEmoji, moodLabel } from "@/src/mood";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

function nonEmpty(arr: string[]) {
  return arr.filter((s) => (s || "").trim().length > 0);
}

export default function DayDetailScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { data, isLoading } = useDay(userId, date!);

  const e = data?.entry as DayEntry | undefined;
  const hasContent = data?.hasContent;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="day-back">
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerDate}>{prettyDate(date!)}</Text>
          {data ? <Text style={styles.headerDay}>Day {data.dayNumber}</Text> : null}
        </View>
        <Pressable onPress={() => router.push(`/flow?date=${date}`)} hitSlop={10} testID="day-edit">
          <Text style={styles.edit}>Edit</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : !hasContent || !e ? (
        <View style={styles.center}>
          <EmptyState
            icon="book"
            title="No entry for this day"
            subtitle="Tap Edit to start journaling for this date."
          />
          <View style={{ paddingHorizontal: 40, width: "100%", marginTop: 8 }}>
            <PrimaryButton label="Start entry" icon="edit-3" onPress={() => router.push(`/flow?date=${date}`)} />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {e.mood ? (
            <SectionText title="Mood" icon="smile" text={`${moodEmoji(e.mood)}  ${moodLabel(e.mood)}`} />
          ) : null}
          <Section title="Taking Control" icon="compass" items={nonEmpty(e.morningRitual)} />
          <Section title="Weekly Goals" icon="target" items={nonEmpty(e.weeklyGoals)} />
          <Section title="Blessings" icon="gift" items={nonEmpty(e.blessings)} />
          {(e.affirmationCustom.trim() || e.affirmationSelected) ? (
            <SectionText title="Affirmation" icon="sun" text={e.affirmationCustom.trim() || e.affirmationSelected} />
          ) : null}
          {e.workouts && e.workouts.length ? (
            <SectionText title="Workout" icon="activity" text={e.workouts.join(", ")} />
          ) : null}
          <Section title="Currently Working Towards" icon="flag" items={nonEmpty(e.dailyGoals)} />
          <Section title="Yesterday's Actions" icon="rotate-ccw" items={nonEmpty(e.actionsYesterday)} />
          {e.accomplishedYesterday !== null ? (
            <SectionText
              title="Accomplished Yesterday?"
              icon="check-square"
              text={e.accomplishedYesterday ? `Yes${e.accomplishedCount ? ` — ${e.accomplishedCount}` : ""}` : "No"}
            />
          ) : null}
          <Section title="Tomorrow's Actions" icon="arrow-right-circle" items={nonEmpty(e.actionsTomorrow)} />
          {nonEmpty(e.tomorrowNotes).length ? (
            <SectionText title="Notes" icon="edit" text={nonEmpty(e.tomorrowNotes).join("\n")} />
          ) : null}
          {e.journal.trim() ? <SectionText title="Journal" icon="book-open" text={e.journal} /> : null}
          {e.photos && e.photos.length ? (
            <View style={styles.card}>
              <SectionHeader title="Photos" icon="image" />
              <View style={styles.photoGrid}>
                {e.photos.map((p) =>
                  userId ? (
                    <Image
                      key={p}
                      source={{ uri: fileUrl(p, userId) }}
                      style={styles.photo}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null,
                )}
              </View>
            </View>
          ) : null}
          {(e.weekly.wentWell || e.weekly.improve || e.weekly.learned) ? (
            <View style={styles.card}>
              <SectionHeader title="Weekly Reflection" icon="award" />
              {e.weekly.wentWell ? <Sub label="What went well" text={e.weekly.wentWell} /> : null}
              {e.weekly.improve ? <Sub label="How to improve" text={e.weekly.improve} /> : null}
              {e.weekly.learned ? <Sub label="What I learned" text={e.weekly.learned} /> : null}
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: any }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={16} color={colors.brand} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Section({ title, icon, items }: { title: string; icon: any; items: string[] }) {
  const styles = useStyles();
  if (items.length === 0) return null;
  return (
    <View style={styles.card}>
      <SectionHeader title={title} icon={icon} />
      {items.map((it, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletNum}>{i + 1}</Text>
          <Text style={styles.bulletText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionText({ title, icon, text }: { title: string; icon: any; text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <SectionHeader title={title} icon={icon} />
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  );
}

function Sub({ label, text }: { label: string; text: string }) {
  const styles = useStyles();
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.subLabel}>{label}</Text>
      <Text style={styles.bodyText}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  headerDate: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  headerDay: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  edit: { fontFamily: fonts.semibold, fontSize: 15, color: c.brand },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 13, color: c.brand, textTransform: "uppercase", letterSpacing: 0.5 },
  bulletRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  bulletNum: { fontFamily: fonts.bold, fontSize: 14, color: c.muted, width: 18 },
  bulletText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: c.onSurface, lineHeight: 23 },
  bodyText: { fontFamily: fonts.regular, fontSize: 16, color: c.onSurface, lineHeight: 24 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photo: { width: 100, height: 100, borderRadius: 12 },
  subLabel: { fontFamily: fonts.semibold, fontSize: 13, color: c.onSurfaceTertiary },
}));
