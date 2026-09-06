import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { storage } from "@/src/utils/storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const KEY = "aura.reminder";

export type ReminderPrefs = { enabled: boolean; hour: number; minute: number; recapEnabled: boolean };
export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 9, minute: 0, recapEnabled: false };

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  const p = await storage.getItem<ReminderPrefs>(KEY, DEFAULT_REMINDER);
  return { ...DEFAULT_REMINDER, ...(p ?? {}) };
}

export async function requestPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (Platform.OS === "web") return { granted: false, canAskAgain: false };
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return { granted: true, canAskAgain: current.canAskAgain };
    if (!current.canAskAgain) return { granted: false, canAskAgain: false };
    const req = await Notifications.requestPermissionsAsync();
    return { granted: req.granted, canAskAgain: req.canAskAgain };
  } catch {
    return { granted: false, canAskAgain: false };
  }
}

async function applySchedules(p: ReminderPrefs) {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (p.enabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time for your check-in 🌱",
        body: "A few mindful minutes for yourself — keep your streak alive.",
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: p.hour, minute: p.minute },
    });
  }
  if (p.recapEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your week in review ✨",
        body: "See and share this week's wins in your Weekly Recap.",
      },
      // Sunday (weekday 1) at 6:00 PM
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 18, minute: 0 },
    });
  }
}

export async function cancelReminder() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function setReminderPrefs(p: ReminderPrefs) {
  await storage.setItem(KEY, p);
  try {
    await applySchedules(p);
  } catch {
    // scheduling unavailable (e.g. Expo Go / web) — pref is still saved
  }
}
