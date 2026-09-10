import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Modal, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from "react-native-reanimated";

import { PrimaryButton } from "@/src/components/ui";
import { fonts, makeStyles } from "@/src/theme";

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

function messageFor(streak: number): string {
  switch (streak) {
    case 3:
      return "Three days strong — momentum is building.";
    case 7:
      return "A full week of showing up. Beautiful.";
    case 14:
      return "Two weeks! This is becoming who you are.";
    case 21:
      return "21 days — they say that makes a habit. You did it.";
    case 30:
      return "A whole month of devotion to yourself.";
    case 50:
      return "Fifty days. You are unstoppable.";
    case 75:
      return "75 days of showing up. Remarkable.";
    case 100:
      return "One hundred days. You're extraordinary.";
    default:
      return "What a streak — keep showing up for yourself.";
  }
}

export function StreakCelebration({ streak, onClose }: { streak: number; onClose: () => void }) {
  const styles = useStyles();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut} style={styles.backdrop}>
        <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={[styles.spark, styles.sparkTL]}>
          ✨
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(250).duration(500)} style={[styles.spark, styles.sparkTR]}>
          🌟
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(350).duration(500)} style={[styles.spark, styles.sparkBL]}>
          ⭐
        </Animated.Text>

        <Animated.View entering={ZoomIn.springify().damping(13).mass(0.8)} style={styles.card}>
          <View style={styles.flameCircle}>
            <Text style={styles.flame}>🔥</Text>
          </View>
          <Text style={styles.num}>{streak}</Text>
          <Text style={styles.title}>day streak!</Text>
          <Text style={styles.msg}>{messageFor(streak)}</Text>
          <View style={{ width: "100%", marginTop: 4 }}>
            <PrimaryButton label="Keep it going" icon="arrow-right" onPress={onClose} testID="celebration-close" />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(45,43,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: c.surface,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  flameCircle: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  flame: { fontSize: 52 },
  num: { fontFamily: fonts.displayBold, fontSize: 56, color: c.onSurface, lineHeight: 62 },
  title: { fontFamily: fonts.display, fontSize: 22, color: c.brand, marginTop: -4 },
  msg: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: c.onSurfaceSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 12,
  },
  spark: { position: "absolute", fontSize: 30 },
  sparkTL: { top: "26%", left: "16%" },
  sparkTR: { top: "22%", right: "16%" },
  sparkBL: { bottom: "28%", left: "22%" },
}));
