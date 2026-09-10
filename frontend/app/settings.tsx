import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth-context";
import { Icon, PrimaryButton } from "@/src/components/ui";
import {
  DEFAULT_REMINDER,
  getReminderPrefs,
  requestPermission,
  setReminderPrefs,
  type ReminderPrefs,
} from "@/src/notifications";
import { fonts, makeStyles, useTheme } from "@/src/theme";

function fmt(hour: number, minute: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

export default function SettingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    getReminderPrefs().then(setPrefs);
  }, []);

  const persist = async (next: ReminderPrefs) => {
    setPrefs(next);
    await setReminderPrefs(next);
  };

  const toggleReminder = async (value: boolean) => {
    if (value) {
      const res = await requestPermission();
      if (!res.granted) {
        setBlocked(!res.canAskAgain);
        if (Platform.OS === "web") setBlocked(true);
        return;
      }
      setBlocked(false);
    }
    await persist({ ...prefs, enabled: value });
  };

  const toggleRecap = async (value: boolean) => {
    if (value) {
      const res = await requestPermission();
      if (!res.granted) {
        setBlocked(!res.canAskAgain);
        if (Platform.OS === "web") setBlocked(true);
        return;
      }
      setBlocked(false);
    }
    await persist({ ...prefs, recapEnabled: value });
  };

  const bumpHour = (delta: number) =>
    persist({ ...prefs, hour: (prefs.hour + delta + 24) % 24 });
  const cycleMinute = () => {
    const steps = [0, 15, 30, 45];
    const i = steps.indexOf(prefs.minute);
    persist({ ...prefs, minute: steps[(i + 1) % steps.length] });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="settings-back">
          <Icon name="arrow-left" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          {user ? (
            <>
              <View style={styles.accountRow}>
                <View style={styles.avatar}>
                  <Icon name="user" size={22} color={colors.onBrandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{user.name || "Signed in"}</Text>
                  <Text style={styles.accountEmail}>{user.email}</Text>
                </View>
              </View>
              <PrimaryButton
                testID="sign-out-btn"
                label="Sign out"
                icon="log-out"
                variant="secondary"
                onPress={signOut}
              />
              <Pressable
                testID="account-safety-btn"
                onPress={() => router.push("/account")}
                style={styles.linkRow}
              >
                <Icon name="shield" size={18} color={colors.onSurface} />
                <Text style={styles.linkText}>Account safety & password</Text>
                <Icon name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.cardText}>
                Sign in to safely sync your journal across your phone and any new device.
              </Text>
              <PrimaryButton
                testID="sign-in-btn"
                label="Sign in or create account"
                icon="log-in"
                onPress={() => router.push("/auth")}
              />
            </>
          )}
        </View>

        {/* Appearance */}
        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.card}>
          <Pressable
            testID="change-background-btn"
            onPress={() => router.push("/background")}
            style={styles.linkRow}
          >
            <Icon name="image" size={18} color={colors.onSurface} />
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>Change background</Text>
              <Text style={styles.accountEmail}>Motivational themes or your own photos</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Daily reminder */}
        <Text style={styles.sectionLabel}>Daily reminder</Text>
        <View style={styles.card}>
          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>Gentle daily nudge</Text>
              <Text style={styles.accountEmail}>Remind me to check in each day</Text>
            </View>
            <Switch
              testID="reminder-switch"
              value={prefs.enabled}
              onValueChange={toggleReminder}
              trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }}
              thumbColor={colors.surface}
            />
          </View>

          {prefs.enabled ? (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Reminder time</Text>
              <View style={styles.stepper}>
                <Pressable onPress={() => bumpHour(-1)} hitSlop={8} testID="hour-down" style={styles.stepBtn}>
                  <Icon name="minus" size={18} color={colors.onSurface} />
                </Pressable>
                <Pressable onPress={cycleMinute} testID="time-display" style={styles.timeDisplay}>
                  <Text style={styles.timeText}>{fmt(prefs.hour, prefs.minute)}</Text>
                </Pressable>
                <Pressable onPress={() => bumpHour(1)} hitSlop={8} testID="hour-up" style={styles.stepBtn}>
                  <Icon name="plus" size={18} color={colors.onSurface} />
                </Pressable>
              </View>
            </View>
          ) : null}

          {blocked ? (
            <View style={styles.blockedBox}>
              <Text style={styles.blockedText}>
                Notifications are turned off. Enable them in your device settings to get reminders.
              </Text>
              <PrimaryButton
                testID="open-settings-btn"
                label="Open Settings"
                icon="external-link"
                variant="secondary"
                onPress={() => Linking.openSettings()}
              />
            </View>
          ) : null}

          <View style={styles.recapDivider} />
          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>Sunday recap nudge</Text>
              <Text style={styles.accountEmail}>Review & share your week every Sunday</Text>
            </View>
            <Switch
              testID="recap-switch"
              value={prefs.recapEnabled}
              onValueChange={toggleRecap}
              trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }}
              thumbColor={colors.surface}
            />
          </View>

          <Text style={styles.note}>
            Reminders fire on an installed build, not in the Expo Go preview.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  sectionLabel: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -8,
  },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: 18,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardText: { fontFamily: fonts.regular, fontSize: 15, color: c.onSurfaceSecondary, lineHeight: 22 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  accountName: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface },
  accountEmail: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 2 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  linkText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.onSurface },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  recapDivider: { height: 1, backgroundColor: c.divider },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeLabel: { fontFamily: fonts.medium, fontSize: 15, color: c.onSurface },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },
  timeDisplay: {
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
  },
  timeText: { fontFamily: fonts.semibold, fontSize: 16, color: c.onSurface },
  blockedBox: { gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 14 },
  blockedText: { fontFamily: fonts.regular, fontSize: 14, color: c.onSurfaceSecondary, lineHeight: 20 },
  note: { fontFamily: fonts.regular, fontSize: 12, color: c.muted, lineHeight: 18 },
}));
