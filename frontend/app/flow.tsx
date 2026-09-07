import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useDay, useSaveDay, type DayEntry } from "@/src/api";
import { prettyDate, todayStr } from "@/src/date-utils";
import { Chip, Icon, NumberedField, PrimaryButton, TextField } from "@/src/components/ui";
import { PhotoPicker } from "@/src/components/photo-picker";
import { MOODS } from "@/src/mood";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

const WORKOUTS = ["Cardio", "Weights", "Rest Day", "Other"];
const COUNTS = ["1", "2", "3", "4", "All"];

type StepKey =
  | "mood"
  | "morningRitual"
  | "weeklyGoals"
  | "blessings"
  | "affirmations"
  | "workout"
  | "dailyGoals"
  | "quote"
  | "actionsYesterday"
  | "actionsTomorrow"
  | "journal"
  | "weekly"
  | "final";

const STEP_META: Record<StepKey, { page?: number; title: string; subtitle: string }> = {
  mood: { title: "How are you feeling?", subtitle: "Check in with your mood before you begin." },
  morningRitual: { page: 1, title: "Taking Control", subtitle: "Set three intentions for your morning ritual." },
  weeklyGoals: { page: 2, title: "Weekly Goals", subtitle: "What do you want to achieve this week?" },
  blessings: { page: 3, title: "Blessings", subtitle: "Three things you are grateful for today." },
  affirmations: { page: 4, title: "Affirmation", subtitle: "Choose one to carry with you — or write your own." },
  workout: { page: 5, title: "Workout", subtitle: "How will you move your body today? Select all that apply." },
  dailyGoals: { page: 6, title: "Currently Working Towards", subtitle: "Your goals for today — up to five." },
  quote: { page: 7, title: "Daily Inspiration", subtitle: "A moment to pause and reflect." },
  actionsYesterday: { page: 8, title: "Yesterday's Actions", subtitle: "What did you do yesterday to reach your goals?" },
  actionsTomorrow: { page: 9, title: "Today's Actions", subtitle: "What will you do today to reach your goals?" },
  journal: { page: 10, title: "Journal", subtitle: "Write freely — no rules, just you." },
  weekly: { page: 11, title: "Weekly Reflection", subtitle: "Look back on the week that was." },
  final: { title: "Your Affirmation", subtitle: "Carry this with you today." },
};

export default function FlowScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date || todayStr();

  const { data, isLoading } = useDay(userId, date);
  const saveMutation = useSaveDay(userId);

  const [entry, setEntry] = useState<DayEntry | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (data?.entry && !entry) {
      const e = data.entry;
      setEntry({
        morningRitual: e.morningRitual,
        weeklyGoals: e.weeklyGoals,
        blessings: e.blessings,
        affirmationSelected:
          e.affirmationSelected ||
          (data && !data.affirmationDay ? data.carriedAffirmation : ""),
        affirmationCustom: e.affirmationCustom,
        workouts: e.workouts ?? [],
        mood: e.mood ?? "",
        photos: e.photos ?? [],
        dailyGoals: e.dailyGoals,
        actionsYesterday: e.actionsYesterday,
        accomplishedYesterday: e.accomplishedYesterday,
        accomplishedCount: e.accomplishedCount,
        actionsTomorrow: e.actionsTomorrow,
        tomorrowNotes: e.tomorrowNotes,
        journal: e.journal,
        weekly: e.weekly,
      });
    }
  }, [data, entry]);

  const steps = useMemo<StepKey[]>(() => {
    const special = data?.isSpecial;
    const s: StepKey[] = ["mood"];
    if (data?.affirmationDay) s.push("affirmations");
    if (special) s.push("morningRitual", "weeklyGoals");
    s.push("blessings", "workout", "dailyGoals", "quote", "actionsYesterday", "actionsTomorrow", "journal");
    if (special) s.push("weekly");
    s.push("final");
    return s;
  }, [data?.isSpecial, data?.affirmationDay]);

  if (isLoading || !entry || !data) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  const stepKey = steps[index];
  const meta = STEP_META[stepKey];
  const progress = (index + 1) / steps.length;
  const isLast = index === steps.length - 1;

  const update = (patch: Partial<DayEntry>) => setEntry((prev) => ({ ...(prev as DayEntry), ...patch }));
  const setList = (key: keyof DayEntry, i: number, value: string) => {
    setEntry((prev) => {
      const arr = [...(prev as any)[key]] as string[];
      arr[i] = value;
      return { ...(prev as DayEntry), [key]: arr };
    });
  };

  const save = async () => {
    if (!entry) return;
    try {
      await saveMutation.mutateAsync({ date, entry });
    } catch {
      // keep going even if save fails
    }
  };

  const handleClose = async () => {
    await save();
    router.back();
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isLast) {
      await save();
      router.back();
      return;
    }
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const affirmationText = entry.affirmationCustom.trim() || entry.affirmationSelected;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.stepCount}>
            Step {index + 1} of {steps.length}
          </Text>
          <Pressable onPress={handleClose} hitSlop={10} testID="flow-close">
            <Text style={styles.saveClose}>Save & Close</Text>
          </Pressable>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={100}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.dateLabel}>{prettyDate(date)}</Text>
        {meta.page ? <Text style={styles.pageTag}>Page {meta.page}</Text> : null}
        <Text style={styles.stepTitle}>{meta.title}</Text>
        <Text style={styles.stepSubtitle}>{meta.subtitle}</Text>

        <View style={styles.fields}>
          {stepKey === "mood" && (
            <View style={styles.moodWrap}>
              {MOODS.map((m) => {
                const selected = entry.mood === m.key;
                return (
                  <Pressable
                    key={m.key}
                    testID={`mood-${m.key}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      update({ mood: entry.mood === m.key ? "" : m.key });
                    }}
                    style={[styles.moodItem, selected && styles.moodItemSelected]}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {stepKey === "morningRitual" &&
            entry.morningRitual.map((v, i) => (
              <TextField
                key={i}
                testID={`morning-ritual-${i}`}
                value={v}
                onChangeText={(t) => setList("morningRitual", i, t)}
                placeholder={`Intention ${i + 1}`}
                multiline
              />
            ))}

          {stepKey === "weeklyGoals" &&
            entry.weeklyGoals.map((v, i) => (
              <NumberedField
                key={i}
                index={i + 1}
                testID={`weekly-goal-${i}`}
                value={v}
                onChangeText={(t) => setList("weeklyGoals", i, t)}
                placeholder={`Goal ${i + 1}`}
              />
            ))}

          {stepKey === "blessings" &&
            entry.blessings.map((v, i) => (
              <NumberedField
                key={i}
                index={i + 1}
                testID={`blessing-${i}`}
                value={v}
                onChangeText={(t) => setList("blessings", i, t)}
                placeholder="I'm grateful for..."
              />
            ))}

          {stepKey === "affirmations" && (
            <View style={{ gap: 12 }}>
              {data.content.affirmations.map((a, i) => {
                const selected = entry.affirmationSelected === a && !entry.affirmationCustom.trim();
                return (
                  <Pressable
                    key={i}
                    testID={`affirmation-${i}`}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      update({ affirmationSelected: a, affirmationCustom: "" });
                    }}
                    style={[styles.affCard, selected && styles.affCardSelected]}
                  >
                    <Icon
                      name={selected ? "check-circle" : "circle"}
                      size={22}
                      color={selected ? colors.onBrandPrimary : colors.muted}
                    />
                    <Text style={[styles.affText, selected && styles.affTextSelected]}>{a}</Text>
                  </Pressable>
                );
              })}
              <Text style={styles.orLabel}>or write your own</Text>
              <TextField
                testID="affirmation-custom"
                value={entry.affirmationCustom}
                onChangeText={(t) => update({ affirmationCustom: t })}
                placeholder="My own affirmation..."
                multiline
              />
            </View>
          )}

          {stepKey === "workout" && (
            <View style={styles.chipWrap}>
              {WORKOUTS.map((w) => {
                const selected = entry.workouts.includes(w);
                return (
                  <Chip
                    key={w}
                    testID={`workout-${w}`}
                    label={w}
                    selected={selected}
                    onPress={() =>
                      update({
                        workouts: selected
                          ? entry.workouts.filter((x) => x !== w)
                          : [...entry.workouts, w],
                      })
                    }
                  />
                );
              })}
            </View>
          )}

          {stepKey === "dailyGoals" &&
            entry.dailyGoals.map((v, i) => (
              <NumberedField
                key={i}
                index={i + 1}
                testID={`daily-goal-${i}`}
                value={v}
                onChangeText={(t) => setList("dailyGoals", i, t)}
                placeholder={`Goal ${i + 1}`}
              />
            ))}

          {stepKey === "quote" && (
            <View style={styles.quoteBox}>
              <Icon name="feather" size={26} color={colors.brand} />
              <Text style={styles.bigQuote}>“{data.content.quote.text}”</Text>
              {data.content.quote.author ? (
                <Text style={styles.bigQuoteAuthor}>— {data.content.quote.author}</Text>
              ) : null}
            </View>
          )}

          {stepKey === "actionsYesterday" && (
            <View style={{ gap: 16 }}>
              <View style={styles.refCard}>
                <Text style={styles.refTitle}>Yesterday's goals</Text>
                {data.prevGoals.length > 0 ? (
                  data.prevGoals.map((g, i) => (
                    <Text key={i} style={styles.refItem}>•  {g}</Text>
                  ))
                ) : (
                  <Text style={styles.refEmpty}>No goals were logged yesterday.</Text>
                )}
              </View>
              {entry.actionsYesterday.map((v, i) => (
                <NumberedField
                  key={i}
                  index={i + 1}
                  testID={`action-yesterday-${i}`}
                  value={v}
                  onChangeText={(t) => setList("actionsYesterday", i, t)}
                  placeholder={`Action ${i + 1}`}
                />
              ))}
            </View>
          )}

          {stepKey === "actionsTomorrow" && (
            <View style={{ gap: 18 }}>
              <View style={styles.refCard}>
                <Text style={styles.refTitle}>Today's goals</Text>
                {entry.dailyGoals.filter((g) => g.trim()).length > 0 ? (
                  entry.dailyGoals
                    .filter((g) => g.trim())
                    .map((g, i) => <Text key={i} style={styles.refItem}>•  {g}</Text>)
                ) : (
                  <Text style={styles.refEmpty}>No goals set today yet.</Text>
                )}
              </View>
              <View style={styles.qBox}>
                <Text style={styles.qLabel}>Did you accomplish all your goals yesterday?</Text>
                <View style={styles.yesNoRow}>
                  <Chip
                    testID="accomplished-yes"
                    label="Yes"
                    icon="thumbs-up"
                    selected={entry.accomplishedYesterday === true}
                    onPress={() => update({ accomplishedYesterday: true })}
                  />
                  <Chip
                    testID="accomplished-no"
                    label="No"
                    icon="thumbs-down"
                    selected={entry.accomplishedYesterday === false}
                    onPress={() => update({ accomplishedYesterday: false, accomplishedCount: "" })}
                  />
                </View>
                {entry.accomplishedYesterday === true && (
                  <View style={{ gap: 10, marginTop: 4 }}>
                    <Text style={styles.qLabel}>How many?</Text>
                    <View style={styles.chipWrap}>
                      {COUNTS.map((n) => (
                        <Chip
                          key={n}
                          testID={`count-${n}`}
                          label={n}
                          selected={entry.accomplishedCount === n}
                          onPress={() => update({ accomplishedCount: n })}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.qLabel}>Notes</Text>
              <TextField
                testID="tomorrow-notes"
                value={entry.tomorrowNotes.join("\n")}
                onChangeText={(t) => update({ tomorrowNotes: t.split("\n") })}
                placeholder="A few lines for tomorrow..."
                multiline
              />

              <Text style={styles.qLabel}>Actions I will take today</Text>
              {entry.actionsTomorrow.map((v, i) => (
                <NumberedField
                  key={i}
                  index={i + 1}
                  testID={`action-tomorrow-${i}`}
                  value={v}
                  onChangeText={(t) => setList("actionsTomorrow", i, t)}
                  placeholder={`Action ${i + 1}`}
                />
              ))}
            </View>
          )}

          {stepKey === "journal" && (
            <View style={{ gap: 20 }}>
              <TextField
                testID="journal-input"
                value={entry.journal}
                onChangeText={(t) => update({ journal: t })}
                placeholder="Today I..."
                multiline
                style={{ minHeight: 220 }}
              />
              <Text style={styles.qLabel}>Photos</Text>
              {userId ? (
                <PhotoPicker
                  userId={userId}
                  value={entry.photos}
                  onChange={(photos) => update({ photos })}
                />
              ) : null}
            </View>
          )}

          {stepKey === "weekly" && (
            <View style={{ gap: 20 }}>
              <View style={{ gap: 8 }}>
                <Text style={styles.qLabel}>What went well? What were your biggest wins?</Text>
                <TextField
                  testID="weekly-wentWell"
                  value={entry.weekly.wentWell}
                  onChangeText={(t) => update({ weekly: { ...entry.weekly, wentWell: t } })}
                  placeholder="My wins this week..."
                  multiline
                />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={styles.qLabel}>How could you improve next week?</Text>
                <TextField
                  testID="weekly-improve"
                  value={entry.weekly.improve}
                  onChangeText={(t) => update({ weekly: { ...entry.weekly, improve: t } })}
                  placeholder="Next week I will..."
                  multiline
                />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={styles.qLabel}>What did you learn last week that will help you this week?</Text>
                <TextField
                  testID="weekly-learned"
                  value={entry.weekly.learned}
                  onChangeText={(t) => update({ weekly: { ...entry.weekly, learned: t } })}
                  placeholder="I learned that..."
                  multiline
                />
              </View>
            </View>
          )}

          {stepKey === "final" && (
            <View style={styles.finalBox}>
              {affirmationText ? (
                <>
                  <Icon name="sunrise" size={30} color={colors.brand} />
                  <Text style={styles.finalText}>{affirmationText}</Text>
                  <Text style={styles.finalHint}>Repeat it to yourself. You've got this.</Text>
                </>
              ) : (
                <>
                  <Icon name="sunrise" size={30} color={colors.muted} />
                  <Text style={styles.finalHint}>
                    You didn't pick an affirmation today — go back to page 4 to choose one.
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {affirmationText && stepKey !== "affirmations" && stepKey !== "final" && stepKey !== "morningRitual" ? (
          <View testID="affirmation-banner" style={styles.affBanner}>
            <Icon name="sun" size={16} color={colors.brand} />
            <Text style={styles.affBannerText}>{affirmationText}</Text>
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {/* Sticky footer */}
      <KeyboardStickyView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          {index > 0 ? (
            <Pressable
              testID="flow-back"
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              style={styles.backBtn}
              hitSlop={8}
            >
              <Icon name="arrow-left" size={22} color={colors.onSurface} />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <View style={{ flex: 1 }}>
            <PrimaryButton
              testID="flow-next"
              label={isLast ? "Finish" : "Next"}
              icon={isLast ? "check" : "arrow-right"}
              loading={saveMutation.isPending && isLast}
              onPress={handleNext}
            />
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    gap: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepCount: { fontFamily: fonts.semibold, fontSize: 14, color: c.muted },
  saveClose: { fontFamily: fonts.semibold, fontSize: 14, color: c.brand },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: c.brandPrimary },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  dateLabel: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  pageTag: { fontFamily: fonts.semibold, fontSize: 12, color: c.brand, marginTop: 6, textTransform: "uppercase", letterSpacing: 1 },
  stepTitle: { fontFamily: fonts.displayBold, fontSize: 30, color: c.onSurface, marginTop: 6 },
  stepSubtitle: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, marginTop: 6, lineHeight: 22 },
  fields: { marginTop: 28, gap: 16 },
  affBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 28,
    padding: 16,
    borderRadius: 14,
    backgroundColor: c.brandTertiary,
  },
  affBannerText: { flex: 1, fontFamily: fonts.display, fontSize: 15, lineHeight: 22, color: c.onBrandTertiary },
  affCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  affCardSelected: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  affText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: c.onSurface, lineHeight: 23 },
  affTextSelected: { color: c.onBrandPrimary },
  orLabel: { fontFamily: fonts.medium, fontSize: 13, color: c.muted, textAlign: "center", marginTop: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  moodWrap: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  moodItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  moodItemSelected: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  moodEmoji: { fontSize: 30 },
  moodLabel: { fontFamily: fonts.medium, fontSize: 11, color: c.onSurfaceTertiary },
  moodLabelSelected: { color: c.onBrandPrimary },
  quoteBox: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  bigQuote: { fontFamily: fonts.display, fontSize: 24, lineHeight: 34, color: c.onSurface, textAlign: "center" },
  bigQuoteAuthor: { fontFamily: fonts.medium, fontSize: 15, color: c.muted },
  qBox: { gap: 12 },
  refCard: { backgroundColor: c.brandTertiary, borderRadius: 14, padding: 16, gap: 6 },
  refTitle: { fontFamily: fonts.semibold, fontSize: 13, color: c.onBrandTertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  refItem: { fontFamily: fonts.medium, fontSize: 15, color: c.onBrandTertiary, lineHeight: 22 },
  refEmpty: { fontFamily: fonts.regular, fontSize: 14, color: c.onBrandTertiary, opacity: 0.7 },
  qLabel: { fontFamily: fonts.semibold, fontSize: 15, color: c.onSurface, lineHeight: 22 },
  yesNoRow: { flexDirection: "row", gap: 12 },
  finalBox: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  finalText: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 36, color: c.onSurface, textAlign: "center" },
  finalHint: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 22 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.divider,
  },
  backBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },
  backSpacer: { width: 0 },
}));
