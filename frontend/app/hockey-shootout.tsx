import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { api } from "@/src/api";
import { playerStorage } from "@/src/storage";
import { sound } from "@/src/sound";
import { colors, radius, shadow, spacing } from "@/src/theme";
import FlyersGoalie from "@/src/components/FlyersGoalie";
import HockeyRink from "@/src/components/HockeyRink";
import HowToPlay from "@/src/components/HowToPlay";
import ReplayButton from "@/src/components/ReplayButton";

const FLYERS_ORANGE = "#F74902";
const FLYERS_BLACK = "#111111";
const SHOTS = 10;
const SHOT_TIME = 5; // seconds to shoot each puck
const PW = 34; // puck width
const GW = 74; // goalie width
const GH = 104; // goalie height
const NET_TOP = 30;
const GOAL_Y = 214; // goal line (puck target / goalie stance)
const GOALIE_SPEED = 4.5;

export default function HockeyShootout() {
  const router = useRouter();

  const [field, setField] = useState({ w: 0, h: 0 });
  const [puckX, setPuckX] = useState(0);
  const [goalieX, setGoalieX] = useState(0);
  const [net, setNet] = useState({ l: 0, r: 0 });
  const [phase, setPhase] = useState<"aim" | "shoot" | "done">("aim");
  const [shotsTaken, setShotsTaken] = useState(0);
  const [goals, setGoals] = useState(0);
  const [flash, setFlash] = useState<"GOAL!" | "SAVE!" | null>(null);
  const [timeLeft, setTimeLeft] = useState(SHOT_TIME);
  const [showHelp, setShowHelp] = useState(true);
  const [reward, setReward] = useState<{ coins: number; goals: number } | null>(null);

  const puckXRef = useRef(0);
  const goalieXRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(GOALIE_SPEED);
  const phaseRef = useRef<"aim" | "shoot" | "done">("aim");
  const startXRef = useRef(0);
  const boundsRef = useRef({ min: 0, max: 0 });
  const goalieBoundsRef = useRef({ min: 0, max: 0 });
  const shotsRef = useRef(0);
  const goalsRef = useRef(0);
  const shootRef = useRef<() => void>(() => {});
  const shotTimerRef = useRef<any>(null);
  const fieldRef = useRef({ w: 0, h: 0 });

  const puckAnim = useRef(new Animated.Value(0)).current;

  const finish = useCallback(async () => {
    phaseRef.current = "done";
    setPhase("done");
    if (shotTimerRef.current) clearInterval(shotTimerRef.current);
    const id = await playerStorage.get();
    if (!id) {
      setReward({ coins: 0, goals: goalsRef.current });
      return;
    }
    try {
      const res = await api.hockeyShootout(id, { goals: goalsRef.current });
      setReward({ coins: res.coins_awarded, goals: goalsRef.current });
      sound.play("coin");
    } catch {
      setReward({ coins: 0, goals: goalsRef.current });
    }
  }, [puckAnim]);

  const startShotTimer = useCallback(() => {
    if (shotTimerRef.current) clearInterval(shotTimerRef.current);
    setTimeLeft(SHOT_TIME);
    const start = Date.now();
    shotTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, SHOT_TIME - (Date.now() - start) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(shotTimerRef.current);
        shootRef.current(); // out of time — auto-launch from current spot
      }
    }, 100);
  }, []);

  const restart = useCallback(() => {
    if (shotTimerRef.current) clearInterval(shotTimerRef.current);
    shotsRef.current = 0;
    goalsRef.current = 0;
    phaseRef.current = "aim";
    setShotsTaken(0);
    setGoals(0);
    setFlash(null);
    setReward(null);
    setShowHelp(false);
    puckAnim.setValue(0);
    const centerX = fieldRef.current.w / 2;
    puckXRef.current = centerX;
    setPuckX(centerX);
    setPhase("aim");
    startShotTimer();
  }, [puckAnim, startShotTimer]);

  const shoot = useCallback(() => {
    if (phaseRef.current !== "aim") return;
    if (shotTimerRef.current) clearInterval(shotTimerRef.current);
    phaseRef.current = "shoot";
    setPhase("shoot");
    sound.play("ding");
    Animated.timing(puckAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start(() => {
      // Evaluate at the moment the puck reaches the net line.
      const blocked = Math.abs(puckXRef.current - goalieXRef.current) < (GW * 0.62 + PW) / 2;
      if (blocked) {
        setFlash("SAVE!");
        sound.play("boo");
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      } else {
        goalsRef.current += 1;
        setGoals(goalsRef.current);
        setFlash("GOAL!");
        sound.play("horn");
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      shotsRef.current += 1;
      setShotsTaken(shotsRef.current);
      setTimeout(() => {
        setFlash(null);
        puckAnim.setValue(0);
        const centerX = fieldRef.current.w / 2;
        puckXRef.current = centerX;
        setPuckX(centerX);
        if (shotsRef.current >= SHOTS) {
          finish();
        } else {
          phaseRef.current = "aim";
          setPhase("aim");
          startShotTimer();
        }
      }, 900);
    });
  }, [puckAnim, finish, startShotTimer]);

  shootRef.current = shoot;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === "aim",
      onMoveShouldSetPanResponder: () => phaseRef.current === "aim",
      onPanResponderGrant: () => {
        startXRef.current = puckXRef.current;
      },
      onPanResponderMove: (_e, g) => {
        const b = boundsRef.current;
        const nx = Math.max(b.min, Math.min(b.max, startXRef.current + g.dx));
        puckXRef.current = nx;
        setPuckX(nx);
      },
      onPanResponderRelease: () => shootRef.current(),
      onPanResponderTerminate: () => shootRef.current(),
    })
  ).current;

  // Goalie glides back and forth with random direction changes and speed.
  useEffect(() => {
    const iv = setInterval(() => {
      if (phaseRef.current === "done") return;
      const b = goalieBoundsRef.current;
      if (b.max <= b.min) return;
      // Occasionally flip direction mid-glide for unpredictable movement.
      if (Math.random() < 0.05) {
        dirRef.current *= -1;
        speedRef.current = 2.5 + Math.random() * 4.5; // new random speed 2.5–7
      }
      let nx = goalieXRef.current + dirRef.current * speedRef.current;
      if (nx <= b.min) {
        nx = b.min;
        dirRef.current = 1;
        speedRef.current = 2.5 + Math.random() * 4.5;
      } else if (nx >= b.max) {
        nx = b.max;
        dirRef.current = -1;
        speedRef.current = 2.5 + Math.random() * 4.5;
      }
      goalieXRef.current = nx;
      setGoalieX(nx);
    }, 30);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    return () => {
      if (shotTimerRef.current) clearInterval(shotTimerRef.current);
    };
  }, []);

  const onFieldLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (fieldRef.current.w > 0) return; // init once
    fieldRef.current = { w: width, h: height };
    setField({ w: width, h: height });
    const netL = Math.round(width * 0.24);
    const netR = Math.round(width * 0.76);
    setNet({ l: netL, r: netR });
    boundsRef.current = { min: netL + PW / 2, max: netR - PW / 2 };
    goalieBoundsRef.current = { min: netL + GW / 2, max: netR - GW / 2 };
    const cx = width / 2;
    puckXRef.current = cx;
    goalieXRef.current = cx;
    setPuckX(cx);
    setGoalieX(cx);
    if (!showHelp) startShotTimer();
  };

  if (phase === "done") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.resultWrap} testID="hockey-result">
          <Text style={styles.resultEmoji}>🏒</Text>
          <Text style={styles.resultTitle}>SHOOTOUT DONE!</Text>
          <View style={styles.resultCoinPill}>
            <Text style={styles.resultCoinText}>+{reward?.coins ?? 0} 🪙</Text>
          </View>
          <View style={styles.resultStat}>
            <Text style={[styles.resultStatVal, { color: FLYERS_ORANGE }]}>{reward?.goals ?? goals} / {SHOTS}</Text>
            <Text style={styles.resultStatLabel}>GOALS</Text>
          </View>
          <Text style={styles.resultNote}>10 coins per goal. Come back and beat your score!</Text>
          <ReplayButton onReplay={restart} color={FLYERS_ORANGE} />
          <Pressable
            testID="hockey-continue"
            onPress={() => router.replace("/level-map")}
            style={({ pressed }) => [styles.continueBtn, pressed && { transform: [{ scale: 0.96 }] }]}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const puckStartTop = field.h > 0 ? field.h - 96 : 0;
  const puckTargetTop = GOAL_Y - 34;
  const timeColor = timeLeft > 2.5 ? colors.success : timeLeft > 1 ? colors.warning : colors.error;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏒 MINI 3</Text>
        <Text style={styles.headerSub}>Drag the puck & release to shoot!</Text>
      </View>

      <View style={styles.topRow}>
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>Shot {Math.min(shotsTaken + 1, SHOTS)} / {SHOTS}</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>🥅 {goals}</Text>
        </View>
      </View>

      <View style={styles.timerTrack}>
        <View style={[styles.timerFill, { width: `${(timeLeft / SHOT_TIME) * 100}%`, backgroundColor: timeColor }]} testID="shot-timer" />
      </View>
      <Text style={[styles.timerLabel, { color: timeColor }]}>{Math.ceil(timeLeft)}s to shoot</Text>

      <View style={styles.field} onLayout={onFieldLayout}>
        {/* 3D perspective rink + net */}
        {field.w > 0 && (
          <HockeyRink w={field.w} h={field.h} netTop={NET_TOP} goalY={GOAL_Y} netL={net.l} netR={net.r} />
        )}

        {/* goalie shadow */}
        {field.w > 0 && (
          <View style={[styles.shadowEllipse, { width: GW * 0.8, left: goalieX - (GW * 0.8) / 2, top: GOAL_Y - 12 }]} />
        )}

        {/* goalie (full Flyers goalie, shooter's perspective) */}
        {field.w > 0 && (
          <View style={[styles.goalie, { width: GW, left: goalieX - GW / 2, top: GOAL_Y - GH }]}>
            <FlyersGoalie size={GW} />
          </View>
        )}

        {/* puck shadow (shrinks with depth) */}
        {field.w > 0 && (
          <Animated.View
            style={[
              styles.puckShadow,
              {
                width: PW,
                height: PW * 0.4,
                left: puckX - PW / 2,
                top: puckStartTop + PW * 0.55,
                opacity: puckAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.12] }),
                transform: [
                  { translateY: puckAnim.interpolate({ inputRange: [0, 1], outputRange: [0, puckTargetTop - puckStartTop] }) },
                  { scale: puckAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) },
                ],
              },
            ]}
          />
        )}

        {/* puck (scales down as it travels into the distance) */}
        {field.w > 0 && (
          <Animated.View
            {...pan.panHandlers}
            style={[
              styles.puck,
              {
                width: PW,
                height: PW * 0.6,
                left: puckX - PW / 2,
                top: puckStartTop,
                transform: [
                  { translateY: puckAnim.interpolate({ inputRange: [0, 1], outputRange: [0, puckTargetTop - puckStartTop] }) },
                  { scale: puckAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) },
                ],
              },
            ]}
          />
        )}

        {/* aim hint arrow */}
        {phase === "aim" && field.w > 0 && (
          <Text style={[styles.hint, { top: puckStartTop - 34, left: puckX - 40 }]}>⬆ shoot</Text>
        )}

        {/* flash */}
        {flash && (
          <View style={styles.flashWrap} pointerEvents="none">
            <Text style={[styles.flashText, { color: flash === "GOAL!" ? FLYERS_ORANGE : colors.error }]}>{flash}</Text>
          </View>
        )}
      </View>

      <HowToPlay
        visible={showHelp}
        emoji="🏒"
        title="How to Play — Mini 3"
        steps={[
          "Drag the puck left and right to line up your shot.",
          "Release your finger to launch the puck at the net.",
          "Beat the Flyers goalie sliding back and forth — you get 5 seconds per shot.",
          "10 shots total, and every goal is worth 10 coins!",
        ]}
        onDismiss={() => {
          setShowHelp(false);
          startShotTimer();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#DCEEFB" },
  header: {
    backgroundColor: FLYERS_ORANGE,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 4,
    borderBottomColor: FLYERS_BLACK,
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
  headerSub: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", opacity: 0.9, marginTop: 2 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  counterPill: {
    backgroundColor: FLYERS_BLACK,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  counterText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
  scorePill: {
    backgroundColor: FLYERS_ORANGE,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  scoreText: { fontSize: 16, fontWeight: "900", color: "#FFFFFF" },
  timerTrack: {
    height: 12,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  timerFill: { height: "100%", borderRadius: radius.pill },
  timerLabel: { textAlign: "center", fontSize: 12, fontWeight: "900", marginTop: 3 },
  field: { flex: 1, marginTop: spacing.sm, position: "relative", overflow: "hidden" },
  goalie: { position: "absolute", alignItems: "center", justifyContent: "flex-start" },
  shadowEllipse: {
    position: "absolute",
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  puck: {
    position: "absolute",
    backgroundColor: "#1A1A1A",
    borderRadius: PW / 2,
    borderWidth: 2,
    borderColor: "#000000",
    ...shadow.tier1,
  },
  puckShadow: {
    position: "absolute",
    backgroundColor: "#000000",
    borderRadius: 999,
  },
  hint: { position: "absolute", fontSize: 14, fontWeight: "900", color: FLYERS_ORANGE },
  flashWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  flashText: { fontSize: 52, fontWeight: "900", letterSpacing: 2 },
  resultWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  resultEmoji: { fontSize: 56 },
  resultTitle: { fontSize: 24, fontWeight: "900", color: FLYERS_ORANGE, letterSpacing: 1 },
  resultCoinPill: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
    ...shadow.tier2,
  },
  resultCoinText: { fontSize: 28, fontWeight: "900", color: colors.onBrand },
  resultStat: { alignItems: "center", marginTop: spacing.sm },
  resultStatVal: { fontSize: 40, fontWeight: "900" },
  resultStatLabel: { fontSize: 12, fontWeight: "900", color: colors.surfaceTertiary, letterSpacing: 1 },
  resultNote: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.surfaceInverse,
    opacity: 0.7,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  continueBtn: {
    backgroundColor: FLYERS_ORANGE,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    ...shadow.tier2,
    borderWidth: 3,
    borderColor: colors.surfaceInverse,
  },
  continueText: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1 },
});
