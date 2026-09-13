// Aura API client + react-query hooks.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

import { storage } from "@/src/utils/storage";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
const USER_KEY = "aura.userId";

let cachedUserId: string | null = null;
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function makeId(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const existing = await storage.getItem<string>(USER_KEY, "");
  if (existing) {
    cachedUserId = existing;
    return existing;
  }
  const id = makeId();
  await storage.setItem(USER_KEY, id);
  cachedUserId = id;
  return id;
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    let msg = `API ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) msg = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ---- Photo upload / display ----
export function fileUrl(path: string, userId: string): string {
  return `${BASE}/files/${path}?uid=${encodeURIComponent(userId)}`;
}

export async function uploadPhoto(
  userId: string,
  asset: { uri: string; fileName?: string | null; mimeType?: string | null },
): Promise<{ path: string }> {
  const form = new FormData();
  const name = asset.fileName || `photo_${Date.now()}.jpg`;
  const type = asset.mimeType || "image/jpeg";
  if (Platform.OS === "web") {
    const blob = await (await fetch(asset.uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri: asset.uri, name, type } as any);
  }
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}/upload?userId=${encodeURIComponent(userId)}`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

// ---- Types ----
export type DayEntry = {
  morningRitual: string[];
  weeklyGoals: string[];
  blessings: string[];
  affirmationSelected: string;
  affirmationCustom: string;
  workouts: string[];
  mood: string;
  photos: string[];
  dailyGoals: string[];
  actionsYesterday: string[];
  accomplishedYesterday: boolean | null;
  accomplishedCount: string;
  actionsTomorrow: string[];
  tomorrowNotes: string[];
  journal: string;
  weekly: { wentWell: string; improve: string; learned: string };
  habits: Habit[];
};

export type Habit = {
  text: string;
  type: "create" | "eliminate";
  days: string;
};

export type Milestone = {
  id: string;
  title: string;
  startDate: string;
  completed: boolean;
  completedDate: string | null;
  createdAt: string;
};

export type DayResponse = {
  date: string;
  dayNumber: number;
  isSpecial: boolean;
  entry: DayEntry & { userId?: string; date?: string };
  content: { affirmations: string[]; quote: { text: string; author: string } };
  hasContent: boolean;
  prevGoals: string[];
  weekGoals: string[];
  weekGoalsAnchor: string;
  weekGoalsDone: number[];
  affirmationDay: boolean;
  reflectionDay: boolean;
  carriedAffirmation: string;
};

export type InitResponse = {
  userId: string;
  signupDate: string;
  today: string;
  dayNumber: number;
  isSpecial: boolean;
  loginDays: number;
  currentStreak: number;
  longestStreak: number;
  restDayAvailable: boolean;
};

export type CalendarResponse = {
  days: { date: string; completed: boolean; isSpecial: boolean; mood: string }[];
  loginDates: string[];
  totalEntries: number;
  loginDays: number;
  currentStreak: number;
  longestStreak: number;
  restDayAvailable: boolean;
};

export type SearchResponse = {
  results: {
    date: string;
    dayNumber: number;
    matches: { page: number; label: string; snippet: string }[];
  }[];
};

export type InsightsResponse = {
  signupDate: string;
  dayNumber: number;
  totalEntries: number;
  workoutBreakdown: Record<string, number>;
  moodBreakdown: Record<string, number>;
  loginDays: number;
  currentStreak: number;
  longestStreak: number;
};

export type RecapResponse = {
  startDate: string;
  endDate: string;
  entriesCount: number;
  moodCounts: Record<string, number>;
  moodsByDay: { date: string; mood: string }[];
  wins: string[];
  highlightQuote: { text: string; author: string } | null;
  bestDay: { date: string; mood: string } | null;
  currentStreak: number;
};

export type AuthUser = { user_id: string; email: string; name: string; picture: string; hasPassword: boolean };
export type AuthResponse = { session_token: string; user: AuthUser };

export type MoodTrendResponse = {
  days: { date: string; mood: string }[];
  average: number;
  count: number;
  startDate: string;
  endDate: string;
};

export type OnThisDayResponse = {
  found: boolean;
  date?: string;
  weeksAgo?: number;
  dayNumber?: number;
  mood?: string;
  snippet?: string;
};

export type GratitudeTrendsResponse = {
  blessings: { text: string; count: number }[];
  goals: { text: string; count: number }[];
};

export type GratitudeWallResponse = {
  items: { date: string; text: string }[];
  total: number;
};

export type YearlyWrapResponse = {
  year: number;
  entriesCount: number;
  daysLoggedIn: number;
  avgMood: number;
  moodCounts: Record<string, number>;
  workoutBreakdown: Record<string, number>;
  photos: number;
  bestMonth: string | null;
  topWins: string[];
  longestStreak: number;
  currentStreak: number;
};

// ---- API calls ----
export const api = {
  init: (userId: string) =>
    request<InitResponse>("/init", { method: "POST", body: JSON.stringify({ userId }) }),
  getDay: (userId: string, date: string) =>
    request<DayResponse>(`/day/${date}?userId=${encodeURIComponent(userId)}`),
  saveDay: (userId: string, date: string, entry: DayEntry) =>
    request<{ ok: boolean }>(`/day/${date}?userId=${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify(entry),
    }),
  calendar: (userId: string) =>
    request<CalendarResponse>(`/calendar?userId=${encodeURIComponent(userId)}`),
  search: (userId: string, q: string, opts?: { pages?: number[]; from?: string; to?: string }) => {
    const params = new URLSearchParams({ userId, q });
    if (opts?.pages?.length) params.set("pages", opts.pages.join(","));
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    return request<SearchResponse>(`/search?${params.toString()}`);
  },
  insights: (userId: string) =>
    request<InsightsResponse>(`/insights?userId=${encodeURIComponent(userId)}`),
  recap: (userId: string, offset: number) =>
    request<RecapResponse>(`/weekly-recap?userId=${encodeURIComponent(userId)}&offset=${offset}`),
  moodTrend: (userId: string, days: number) =>
    request<MoodTrendResponse>(`/mood-trend?userId=${encodeURIComponent(userId)}&days=${days}`),
  onThisDay: (userId: string) =>
    request<OnThisDayResponse>(`/on-this-day?userId=${encodeURIComponent(userId)}`),
  gratitudeTrends: (userId: string) =>
    request<GratitudeTrendsResponse>(`/gratitude-trends?userId=${encodeURIComponent(userId)}`),
  gratitudeWall: (userId: string) =>
    request<GratitudeWallResponse>(`/gratitude-wall?userId=${encodeURIComponent(userId)}`),
  yearlyWrap: (userId: string, year: number) =>
    request<YearlyWrapResponse>(`/yearly-wrap?userId=${encodeURIComponent(userId)}&year=${year}`),
  toggleWeeklyGoal: (userId: string, anchor: string, index: number) =>
    request<{ ok: boolean; done: number[] }>("/weekly-goals/toggle", {
      method: "POST",
      body: JSON.stringify({ userId, anchor, index }),
    }),
  listMilestones: (userId: string) =>
    request<{ milestones: Milestone[] }>(`/milestones?userId=${encodeURIComponent(userId)}`),
  createMilestone: (userId: string, title: string, startDate: string) =>
    request<{ ok: boolean; milestone: Milestone }>("/milestones", {
      method: "POST",
      body: JSON.stringify({ userId, title, startDate }),
    }),
  toggleMilestone: (userId: string, id: string) =>
    request<{ ok: boolean; milestone: Milestone }>(`/milestones/${id}/toggle`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
  deleteMilestone: (userId: string, id: string) =>
    request<{ ok: boolean }>(`/milestones/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  // auth
  register: (email: string, password: string, deviceUserId: string, name?: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name, deviceUserId }),
    }),
  login: (email: string, password: string, deviceUserId: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, deviceUserId }),
    }),
  googleSession: (session_id: string, deviceUserId: string) =>
    request<AuthResponse>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ session_id, deviceUserId }),
    }),
  me: () => request<{ user: AuthUser }>("/auth/me"),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
  setPassword: (new_password: string) =>
    request<{ ok: boolean }>("/auth/set-password", {
      method: "POST",
      body: JSON.stringify({ new_password }),
    }),
  deleteAccount: (confirmation: string, current_password?: string) =>
    request<{ ok: boolean }>("/auth/delete", {
      method: "POST",
      body: JSON.stringify({ confirmation, current_password }),
    }),
};

// ---- Hooks ----
export function useDay(userId: string | null, date: string) {
  return useQuery({
    queryKey: ["day", userId, date],
    queryFn: () => api.getDay(userId!, date),
    enabled: !!userId,
  });
}

export function useSaveDay(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, entry }: { date: string; entry: DayEntry }) =>
      api.saveDay(userId!, date, entry),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["day", userId, vars.date] });
      qc.invalidateQueries({ queryKey: ["calendar", userId] });
      qc.invalidateQueries({ queryKey: ["insights", userId] });
      qc.invalidateQueries({ queryKey: ["recap", userId] });
      qc.invalidateQueries({ queryKey: ["mood-trend", userId] });
      qc.invalidateQueries({ queryKey: ["on-this-day", userId] });
      qc.invalidateQueries({ queryKey: ["gratitude-trends", userId] });
      qc.invalidateQueries({ queryKey: ["gratitude-wall", userId] });
    },
  });
}

export function useCalendar(userId: string | null) {
  return useQuery({
    queryKey: ["calendar", userId],
    queryFn: () => api.calendar(userId!),
    enabled: !!userId,
  });
}

export function useSearch(
  userId: string | null,
  q: string,
  filters?: { pages?: number[]; from?: string; to?: string },
) {
  return useQuery({
    queryKey: ["search", userId, q, filters?.pages ?? [], filters?.from ?? "", filters?.to ?? ""],
    queryFn: () => api.search(userId!, q, filters),
    enabled: !!userId && q.trim().length > 0,
  });
}

export function useInsights(userId: string | null) {
  return useQuery({
    queryKey: ["insights", userId],
    queryFn: () => api.insights(userId!),
    enabled: !!userId,
  });
}

export function useWeeklyRecap(userId: string | null, offset: number) {
  return useQuery({
    queryKey: ["recap", userId, offset],
    queryFn: () => api.recap(userId!, offset),
    enabled: !!userId,
  });
}

export function useMoodTrend(userId: string | null, days = 30) {
  return useQuery({
    queryKey: ["mood-trend", userId, days],
    queryFn: () => api.moodTrend(userId!, days),
    enabled: !!userId,
  });
}

export function useOnThisDay(userId: string | null) {
  return useQuery({
    queryKey: ["on-this-day", userId],
    queryFn: () => api.onThisDay(userId!),
    enabled: !!userId,
  });
}

export function useGratitudeTrends(userId: string | null) {
  return useQuery({
    queryKey: ["gratitude-trends", userId],
    queryFn: () => api.gratitudeTrends(userId!),
    enabled: !!userId,
  });
}

export function useGratitudeWall(userId: string | null) {
  return useQuery({
    queryKey: ["gratitude-wall", userId],
    queryFn: () => api.gratitudeWall(userId!),
    enabled: !!userId,
  });
}

export function useYearlyWrap(userId: string | null, year: number) {
  return useQuery({
    queryKey: ["yearly-wrap", userId, year],
    queryFn: () => api.yearlyWrap(userId!, year),
    enabled: !!userId,
  });
}

export function useToggleWeeklyGoal(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ anchor, index }: { date: string; anchor: string; index: number }) =>
      api.toggleWeeklyGoal(userId!, anchor, index),
    onMutate: async ({ date, index }) => {
      await qc.cancelQueries({ queryKey: ["day", userId, date] });
      const prev = qc.getQueryData<DayResponse>(["day", userId, date]);
      if (prev) {
        const done = new Set(prev.weekGoalsDone ?? []);
        if (done.has(index)) done.delete(index);
        else done.add(index);
        qc.setQueryData<DayResponse>(["day", userId, date], {
          ...prev,
          weekGoalsDone: Array.from(done).sort((a, b) => a - b),
        });
      }
      return { prev, date };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["day", userId, ctx.date], ctx.prev);
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ["day", userId, vars.date] });
    },
  });
}


export function useMilestones(userId: string | null) {
  return useQuery({
    queryKey: ["milestones", userId],
    queryFn: () => api.listMilestones(userId!),
    enabled: !!userId,
  });
}

export function useCreateMilestone(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, startDate }: { title: string; startDate: string }) =>
      api.createMilestone(userId!, title, startDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", userId] }),
  });
}

export function useToggleMilestone(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.toggleMilestone(userId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", userId] }),
  });
}

export function useDeleteMilestone(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMilestone(userId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones", userId] }),
  });
}
