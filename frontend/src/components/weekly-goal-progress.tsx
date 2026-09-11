import { Pressable, Text, View } from "react-native";

import { Icon } from "@/src/components/ui";
import { fonts, makeStyles, useTheme } from "@/src/theme";

export function WeeklyGoalProgress({
  goals,
  done,
  onToggle,
  title = "This week's goals",
}: {
  goals: string[];
  done: number[];
  onToggle: (index: number) => void;
  title?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const doneSet = new Set(done);
  const completed = goals.filter((_, i) => doneSet.has(i)).length;
  const pct = goals.length ? (completed / goals.length) * 100 : 0;
  const allDone = completed === goals.length && goals.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>
          {completed}/{goals.length}
          {allDone ? "  🎉" : ""}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <View style={{ gap: 4 }}>
        {goals.map((g, i) => {
          const isDone = doneSet.has(i);
          return (
            <Pressable
              key={i}
              testID={`week-goal-toggle-${i}`}
              onPress={() => onToggle(i)}
              style={styles.row}
              hitSlop={6}
            >
              <Icon
                name={isDone ? "check-circle" : "circle"}
                size={22}
                color={isDone ? colors.brand : colors.muted}
              />
              <Text style={[styles.goalText, isDone && styles.goalDone]}>{g}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  count: { fontFamily: fonts.semibold, fontSize: 14, color: c.brand },
  track: { height: 8, borderRadius: 999, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999, backgroundColor: c.brandPrimary },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  goalText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.onSurface, lineHeight: 21 },
  goalDone: { color: c.muted, textDecorationLine: "line-through" },
}));
