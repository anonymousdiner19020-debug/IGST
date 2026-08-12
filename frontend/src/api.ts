const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE}/api${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export type PlayerDTO = {
  id: string;
  username: string;
  coins: number;
  high_score: number;
  current_level: number;
  dishes_cooked: number;
  unlocked_dishes: string[];
  boosters: Record<string, number>;
  grill_level: number;
  created_at: string;
};

export type DailySpecial = {
  date: string;
  dish_id: string;
  name: string;
  emoji: string;
  bonus_multiplier: number;
};

export type GrillInfo = {
  grill_level: number;
  max_level: number;
  next_cost: number | null;
  maxed: boolean;
};

export type PantryInfo = {
  pantry_level: number;
  max_level: number;
  next_cost: number | null;
  maxed: boolean;
  per_item_cap: number;
  pantry: Record<string, number>;
};

export type WeeklyBoard = {
  week: string;
  resets_on: string;
  champion: { id: string; username: string; weekly_score: number } | null;
  leaderboard: { id: string; username: string; weekly_score: number }[];
};

export const api = {
  createPlayer: (username: string) =>
    req<PlayerDTO>("/players", { method: "POST", body: JSON.stringify({ username }) }),
  getPlayer: (id: string) => req<PlayerDTO>(`/players/${id}`),
  completeLevel: (
    id: string,
    payload: { level: number; dish_id: string; score: number; coins_earned: number; completed: boolean }
  ) =>
    req<PlayerDTO>(`/players/${id}/complete-level`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  purchase: (id: string, item_id: string) =>
    req<PlayerDTO>(`/players/${id}/purchase`, {
      method: "POST",
      body: JSON.stringify({ item_id }),
    }),
  useBooster: (id: string, item_id: string) =>
    req<PlayerDTO>(`/players/${id}/use-booster`, {
      method: "POST",
      body: JSON.stringify({ item_id }),
    }),
  getDishes: () => req<{ dishes: any[] }>("/dishes"),
  getShop: () => req<{ items: { id: string; name: string; emoji: string; cost: number; type: string }[] }>("/shop"),
  getLeaderboard: () =>
    req<{ leaderboard: { id: string; username: string; high_score: number; dishes_cooked: number }[] }>("/leaderboard"),
  upgradeGrill: (id: string) =>
    req<PlayerDTO>(`/players/${id}/upgrade-grill`, { method: "POST" }),
  getGrillInfo: (id: string) => req<GrillInfo>(`/grill-info/${id}`),
  getDailySpecial: () => req<DailySpecial>("/daily-special"),
  getPantryInfo: (id: string) => req<PantryInfo>(`/pantry-info/${id}`),
  upgradePantry: (id: string) =>
    req<PlayerDTO>(`/players/${id}/upgrade-pantry`, { method: "POST" }),
  savePantry: (id: string, pantry: Record<string, number>) =>
    req<PlayerDTO>(`/players/${id}/save-pantry`, {
      method: "POST",
      body: JSON.stringify({ pantry }),
    }),
  getWeeklyLeaderboard: () => req<WeeklyBoard>("/weekly-leaderboard"),
};
