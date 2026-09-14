import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { todayStr } from "@/src/date-utils";
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
const LAST_JOURNALED_KEY = "aura.lastJournaledDate";
const DAYS_AHEAD = 7; // how many upcoming daily nudges to keep armed

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

async function journaledToday(): Promise<boolean> {
  const last = await storage.getItem<string>(LAST_JOURNALED_KEY, "");
  return last === todayStr();
}

async function applySchedules(p: ReminderPrefs, doneToday: boolean) {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (p.enabled) {
    const now = new Date();
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const target = new Date();
      target.setHours(p.hour, p.minute, 0, 0);
      target.setDate(target.getDate() + d);
      // Skip today's nudge if it already passed or the user already journaled today.
      if (d === 0 && (target <= now || doneToday)) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "A gentle nudge 🌱",
          body: "Take a mindful moment to log in and journal today.",
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
      });
    }
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
    await applySchedules(p, await journaledToday());
  } catch {
    // scheduling unavailable (e.g. Expo Go / web) — pref is still saved
  }
}

/** Re-arm reminders based on current prefs + whether today is already journaled. */
export async function resyncReminder() {
  if (Platform.OS === "web") return;
  try {
    const p = await getReminderPrefs();
    if (!p.enabled && !p.recapEnabled) return;
    await applySchedules(p, await journaledToday());
  } catch {
    // ignore
  }
}

/** Record that the user journaled today and drop today's pending nudge. */
export async function markJournaledToday() {
  await storage.setItem(LAST_JOURNALED_KEY, todayStr());
  await resyncReminder();
}
