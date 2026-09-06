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

export type ReminderPrefs = { enabled: boolean; hour: number; minute: number };
export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 9, minute: 0 };

export async function getReminderPrefs(): Promise<ReminderPrefs> {
  const p = await storage.getItem<ReminderPrefs>(KEY, DEFAULT_REMINDER);
  return p ?? DEFAULT_REMINDER;
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

async function scheduleDaily(hour: number, minute: number) {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time for your check-in 🌱",
      body: "A few mindful minutes for yourself — keep your streak alive.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
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
    if (p.enabled) await scheduleDaily(p.hour, p.minute);
    else await cancelReminder();
  } catch {
    // scheduling unavailable (e.g. Expo Go / web) — pref is still saved
  }
}
