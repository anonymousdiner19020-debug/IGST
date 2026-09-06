// Aura API client + react-query hooks.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

// ---- Types ----
export type DayEntry = {
  morningRitual: string[];
  weeklyGoals: string[];
  blessings: string[];
  affirmationSelected: string;
  affirmationCustom: string;
  workouts: string[];
  mood: string;
  dailyGoals: string[];
  actionsYesterday: string[];
  accomplishedYesterday: boolean | null;
  accomplishedCount: string;
  actionsTomorrow: string[];
  tomorrowNotes: string[];
  journal: string;
  weekly: { wentWell: string; improve: string; learned: string };
};

export type DayResponse = {
  date: string;
  dayNumber: number;
  isSpecial: boolean;
  entry: DayEntry & { userId?: string; date?: string };
  content: { affirmations: string[]; quote: { text: string; author: string } };
  hasContent: boolean;
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
};

export type CalendarResponse = {
  days: { date: string; completed: boolean; isSpecial: boolean; mood: string }[];
  loginDates: string[];
  totalEntries: number;
  loginDays: number;
  currentStreak: number;
  longestStreak: number;
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
  currentStreak: number;
};

export type AuthUser = { user_id: string; email: string; name: string; picture: string };
export type AuthResponse = { session_token: string; user: AuthUser };

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
  search: (userId: string, q: string) =>
    request<SearchResponse>(`/search?userId=${encodeURIComponent(userId)}&q=${encodeURIComponent(q)}`),
  insights: (userId: string) =>
    request<InsightsResponse>(`/insights?userId=${encodeURIComponent(userId)}`),
  recap: (userId: string, offset: number) =>
    request<RecapResponse>(`/weekly-recap?userId=${encodeURIComponent(userId)}&offset=${offset}`),
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

export function useSearch(userId: string | null, q: string) {
  return useQuery({
    queryKey: ["search", userId, q],
    queryFn: () => api.search(userId!, q),
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
