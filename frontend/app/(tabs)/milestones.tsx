import dayjs from "dayjs";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  useCreateMilestone,
  useDeleteMilestone,
  useMilestones,
  useToggleMilestone,
  type Milestone,
} from "@/src/api";
import { Icon, PrimaryButton, TextField } from "@/src/components/ui";
import { prettyDate, todayStr } from "@/src/date-utils";
import { fonts, makeStyles, useTheme } from "@/src/theme";
import { useUser } from "@/src/user-context";

const MARKERS = [7, 14, 30, 60, 100, 180, 365, 730];

function daysBetween(from: string, to: string): number {
  return Math.max(0, dayjs(to).startOf("day").diff(dayjs(from).startOf("day"), "day"));
}

export default function MilestonesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userId } = useUser();

  const { data, isLoading } = useMilestones(userId);
  const createM = useCreateMilestone(userId);
  const toggleM = useToggleMilestone(userId);
  const deleteM = useDeleteMilestone(userId);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [pickerOpen, setPickerOpen] = useState(false);

  const milestones = data?.milestones ?? [];
  const active = milestones.filter((m) => !m.completed);
  const done = milestones.filter((m) => m.completed);

  const resetForm = () => {
    setTitle("");
    setStartDate(todayStr());
    setAdding(false);
  };

  const save = () => {
    if (!title.trim()) return;
    createM.mutate(
      { title: title.trim(), startDate },
      { onSuccess: resetForm },
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={styles.headerTitle}>Milestones</Text>
          <Text style={styles.headerSub}>Track how far you've come</Text>
        </View>
        <Pressable testID="add-milestone-btn" onPress={() => setAdding(true)} style={styles.addBtn} hitSlop={8}>
          <Icon name="plus" size={22} color={colors.onBrandPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : milestones.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Icon name="flag" size={30} color={colors.brand} />
          </View>
          <Text style={styles.emptyTitle}>No milestones yet</Text>
          <Text style={styles.emptyText}>
            Add a milestone with the day you started, and watch your progress grow.
          </Text>
          <View style={{ marginTop: 8 }}>
            <PrimaryButton label="Add your first milestone" icon="plus" onPress={() => setAdding(true)} testID="empty-add" />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {active.map((m) => (
            <MilestoneCard
              key={m.id}
              m={m}
              onToggle={() => toggleM.mutate(m.id)}
              onDelete={() => deleteM.mutate(m.id)}
            />
          ))}
          {done.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Completed</Text>
              {done.map((m) => (
                <MilestoneCard
                  key={m.id}
                  m={m}
                  onToggle={() => toggleM.mutate(m.id)}
                  onDelete={() => deleteM.mutate(m.id)}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      {/* Add milestone modal */}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={resetForm}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New milestone</Text>

            <Text style={styles.fieldLabel}>What are you working towards?</Text>
            <TextField
              testID="milestone-title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 90 days sober, Learn guitar..."
            />

            <Text style={styles.fieldLabel}>Start date</Text>
            <Pressable testID="milestone-date" onPress={() => setPickerOpen(true)} style={styles.dateRow}>
              <Icon name="calendar" size={18} color={colors.onSurface} />
              <Text style={styles.dateText}>{prettyDate(startDate)}</Text>
              <Icon name="chevron-down" size={18} color={colors.muted} />
            </Pressable>

            <View style={{ marginTop: 20, gap: 10 }}>
              <PrimaryButton
                label="Save milestone"
                icon="check"
                onPress={save}
                testID="milestone-save"
                disabled={!title.trim() || createM.isPending}
              />
              <Pressable onPress={resetForm} style={styles.cancelBtn} testID="milestone-cancel">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <MonthPicker
        visible={pickerOpen}
        value={startDate}
        onClose={() => setPickerOpen(false)}
        onSelect={(d) => {
          setStartDate(d);
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

function MilestoneCard({
  m,
  onToggle,
  onDelete,
}: {
  m: Milestone;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const today = todayStr();

  const daysIn = daysBetween(m.startDate, today);
  const nextMarker = MARKERS.find((x) => x > daysIn) ?? daysIn;
  const pct = nextMarker ? Math.min(100, (daysIn / nextMarker) * 100) : 100;

  if (m.completed && m.completedDate) {
    const sinceDone = daysBetween(m.completedDate, today);
    const lasted = daysBetween(m.startDate, m.completedDate);
    return (
      <View style={[styles.card, styles.cardDone]}>
        <View style={styles.cardHead}>
          <View style={styles.doneBadge}>
            <Icon name="check" size={16} color={colors.onBrandPrimary} />
          </View>
          <Text style={[styles.cardTitle, { flex: 1 }]}>{m.title}</Text>
          <Pressable onPress={onDelete} hitSlop={8} testID={`milestone-delete-${m.id}`}>
            <Icon name="trash-2" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <Text style={styles.completedLine}>
          Completed {prettyDate(m.completedDate)} · {sinceDone === 0 ? "today" : `${sinceDone} day${sinceDone === 1 ? "" : "s"} ago`}
        </Text>
        <Text style={styles.metaLine}>Lasted {lasted} day{lasted === 1 ? "" : "s"} from start</Text>
        <Pressable onPress={onToggle} style={styles.reopenBtn} testID={`milestone-toggle-${m.id}`}>
          <Icon name="rotate-ccw" size={15} color={colors.brand} />
          <Text style={styles.reopenText}>Reopen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardTitle, { flex: 1 }]}>{m.title}</Text>
        <Pressable onPress={onDelete} hitSlop={8} testID={`milestone-delete-${m.id}`}>
          <Icon name="trash-2" size={18} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.counterRow}>
        <Text style={styles.bigNum}>{daysIn}</Text>
        <View>
          <Text style={styles.bigLabel}>day{daysIn === 1 ? "" : "s"} in</Text>
          <Text style={styles.startedLine}>Started {prettyDate(m.startDate)}</Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {daysIn} / {nextMarker} days
        </Text>
      </View>

      <Pressable onPress={onToggle} style={styles.completeBtn} testID={`milestone-toggle-${m.id}`}>
        <Icon name="check-circle" size={16} color={colors.onBrandPrimary} />
        <Text style={styles.completeText}>Mark complete</Text>
      </Pressable>
    </View>
  );
}

function MonthPicker({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (d: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [month, setMonth] = useState(() => dayjs(value).startOf("month"));

  const cells = useMemo(() => {
    const start = month.startOf("month");
    const lead = start.day(); // Sunday = 0
    const total = month.daysInMonth();
    const arr: (string | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(start.date(d).format("YYYY-MM-DD"));
    return arr;
  }, [month]);

  const today = todayStr();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <View style={styles.pickerHead}>
            <Pressable onPress={() => setMonth((m) => m.subtract(1, "month"))} hitSlop={8} testID="picker-prev">
              <Icon name="chevron-left" size={22} color={colors.onSurface} />
            </Pressable>
            <Text style={styles.pickerMonth}>{month.format("MMMM YYYY")}</Text>
            <Pressable
              onPress={() => setMonth((m) => m.add(1, "month"))}
              hitSlop={8}
              testID="picker-next"
              disabled={month.endOf("month").isAfter(dayjs())}
            >
              <Icon
                name="chevron-right"
                size={22}
                color={month.endOf("month").isAfter(dayjs()) ? colors.border : colors.onSurface}
              />
            </Pressable>
          </View>
          <View style={styles.dowRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={styles.dow}>{d}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((c, i) => {
              if (!c) return <View key={i} style={styles.dayCell} />;
              const isFuture = dayjs(c).isAfter(dayjs(today));
              const selected = c === value;
              return (
                <Pressable
                  key={i}
                  style={styles.dayCell}
                  disabled={isFuture}
                  onPress={() => onSelect(c)}
                  testID={`picker-day-${c}`}
                >
                  <View style={[styles.dayInner, selected && styles.daySelected]}>
                    <Text
                      style={[
                        styles.dayNum,
                        selected && { color: colors.onBrandPrimary },
                        isFuture && { color: colors.border },
                      ]}
                    >
                      {dayjs(c).date()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => onSelect(today)} style={styles.todayBtn} testID="picker-today">
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 28, color: c.onSurface },
  headerSub: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 22 },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardDone: { backgroundColor: c.surface, gap: 8 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 19, color: c.onSurface },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  bigNum: { fontFamily: fonts.displayBold, fontSize: 52, color: c.brand, lineHeight: 56 },
  bigLabel: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface },
  startedLine: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 2 },
  progressWrap: { gap: 6 },
  track: { height: 8, borderRadius: 999, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: c.brandPrimary },
  progressLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.muted, textAlign: "right" },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.brandPrimary,
  },
  completeText: { fontFamily: fonts.semibold, fontSize: 15, color: c.onBrandPrimary },
  doneBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  completedLine: { fontFamily: fonts.medium, fontSize: 15, color: c.onSurface },
  metaLine: { fontFamily: fonts.regular, fontSize: 13, color: c.muted },
  reopenBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 4 },
  reopenText: { fontFamily: fonts.semibold, fontSize: 14, color: c.brand },
  // sheet
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(45,43,42,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 10,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: c.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: c.onSurface, marginBottom: 6 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface, marginTop: 8 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  dateText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.onSurface },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { fontFamily: fonts.semibold, fontSize: 15, color: c.muted },
  // picker
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(45,43,42,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  pickerCard: { width: "100%", maxWidth: 360, backgroundColor: c.surface, borderRadius: 24, padding: 20, gap: 12 },
  pickerHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerMonth: { fontFamily: fonts.displayBold, fontSize: 18, color: c.onSurface },
  dowRow: { flexDirection: "row" },
  dow: { flex: 1, textAlign: "center", fontFamily: fonts.semibold, fontSize: 12, color: c.muted },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayInner: { width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: c.brandPrimary },
  dayNum: { fontFamily: fonts.medium, fontSize: 15, color: c.onSurface },
  todayBtn: { alignSelf: "center", paddingVertical: 8, paddingHorizontal: 20 },
  todayText: { fontFamily: fonts.semibold, fontSize: 15, color: c.brand },
}));
