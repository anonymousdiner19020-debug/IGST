// Aura page backgrounds — a curated set of motivational gradient backgrounds,
// plus support for the user's own photos, with optional daily / weekly rotation.
import dayjs from "dayjs";

import { storage } from "@/src/utils/storage";

export type GradientBg = {
  id: string;
  kind: "gradient";
  name: string;
  quote: string;
  colors: [string, string, ...string[]];
};

export type PhotoBg = { id: string; kind: "photo"; path: string };
export type NoneBg = { id: "none"; kind: "none" };

export type BgItem = GradientBg | PhotoBg | NoneBg;

export const NONE_BG: NoneBg = { id: "none", kind: "none" };

// Bold, masculine gradients — deeper slate / steel / earth tones, tuned so
// dark journal text stays readable.
export const APP_BACKGROUNDS: GradientBg[] = [
  { id: "slate", kind: "gradient", name: "Slate", quote: "Steady as stone.", colors: ["#C4CDD8", "#D6DDE5", "#A9B6C4"] },
  { id: "gunmetal", kind: "gradient", name: "Gunmetal", quote: "Forged, not given.", colors: ["#C6CBD0", "#D8DCE0", "#ABB2BA"] },
  { id: "midnight", kind: "gradient", name: "Midnight", quote: "Discipline over mood.", colors: ["#C0C9DA", "#D2D9E6", "#A4B0C8"] },
  { id: "storm", kind: "gradient", name: "Storm", quote: "Push through the weather.", colors: ["#B9C2CC", "#CDD5DD", "#9BA8B6"] },
  { id: "deepsea", kind: "gradient", name: "Deep Sea", quote: "Calm runs deep.", colors: ["#BAD0D1", "#D0DFDF", "#9FBCBE"] },
  { id: "forest", kind: "gradient", name: "Forest", quote: "Grow tall, hold firm.", colors: ["#BFCFBA", "#D3DECE", "#A2B69C"] },
  { id: "olive", kind: "gradient", name: "Olive Drab", quote: "Earn it every day.", colors: ["#CBCDAF", "#DDDECB", "#B0B48C"] },
  { id: "timber", kind: "gradient", name: "Timber", quote: "Build with your hands.", colors: ["#D6C7AF", "#E5DAC7", "#BFA985"] },
  { id: "bronze", kind: "gradient", name: "Bronze", quote: "Sharpen your edge.", colors: ["#DBC9A9", "#EADCC5", "#C6AC80"] },
  { id: "graphite", kind: "gradient", name: "Graphite", quote: "Own the grind.", colors: ["#C7C7C4", "#D9D9D6", "#ABABA7"] },
];

export type RotationMode = "fixed" | "mood" | "daily" | "weekly";
export type RotationPool = "app" | "mine" | "favorites" | "all";

export type BackgroundPrefs = {
  mode: RotationMode;
  selectedId: string; // used in "fixed" mode (and as fallback in "mood" mode)
  pool: RotationPool; // used in daily/weekly rotation
  custom: { id: string; path: string }[]; // user photos
  favorites: string[]; // starred background ids for "favorites" rotation
};

export const DEFAULT_BG_PREFS: BackgroundPrefs = {
  mode: "fixed",
  selectedId: "none",
  pool: "app",
  custom: [],
  favorites: [],
};

// Mood -> gradient (light so dark journal text stays readable) + a solid tint
// used to color calendar day cells so the calendar "feels alive".
export const MOOD_BACKGROUNDS: Record<string, { colors: [string, string, ...string[]]; tint: string }> = {
  "1": { colors: ["#DFE3EA", "#ECEEF3", "#D2D7E0"], tint: "#C7CFDE" }, // Rough
  "2": { colors: ["#E5E1EC", "#EEECF4", "#D8D2E6"], tint: "#D3CBE2" }, // Low
  "3": { colors: ["#ECE7DB", "#F4EFE4", "#DFD6C4"], tint: "#E2D6BE" }, // Okay
  "4": { colors: ["#DDECE3", "#EBF4EF", "#CBE4D6"], tint: "#BFE0CE" }, // Good
  "5": { colors: ["#FCE7C6", "#FDF1DC", "#F7DDA6"], tint: "#F5D69B" }, // Great
};

export function moodTint(mood: string | undefined): string | null {
  if (!mood) return null;
  return MOOD_BACKGROUNDS[mood]?.tint ?? null;
}

const KEY = "aura.background";

export async function getBackgroundPrefs(): Promise<BackgroundPrefs> {
  const p = await storage.getItem<BackgroundPrefs>(KEY, DEFAULT_BG_PREFS);
  return { ...DEFAULT_BG_PREFS, ...(p ?? {}) };
}

export async function setBackgroundPrefs(p: BackgroundPrefs): Promise<void> {
  await storage.setItem(KEY, p);
}

function dayIndex(date: string): number {
  return Math.floor(dayjs(date).valueOf() / 86400000);
}

// Resolve the background that should be shown for a given date (and optional mood).
export function resolveActive(prefs: BackgroundPrefs, date: string, mood?: string): BgItem {
  const customItems: PhotoBg[] = (prefs.custom || []).map((c) => ({
    id: c.id,
    kind: "photo",
    path: c.path,
  }));

  const findFixed = (): BgItem => {
    if (prefs.selectedId === "none") return NONE_BG;
    const app = APP_BACKGROUNDS.find((b) => b.id === prefs.selectedId);
    if (app) return app;
    const own = customItems.find((c) => c.id === prefs.selectedId);
    return own ?? NONE_BG;
  };

  if (prefs.mode === "fixed") return findFixed();

  if (prefs.mode === "mood") {
    if (mood && MOOD_BACKGROUNDS[mood]) {
      return { id: `mood_${mood}`, kind: "gradient", name: "Mood", quote: "", colors: MOOD_BACKGROUNDS[mood].colors };
    }
    return findFixed(); // no mood logged yet -> fall back to fixed pick
  }

  let pool: BgItem[] = [];
  if (prefs.pool === "app") pool = APP_BACKGROUNDS;
  else if (prefs.pool === "mine") pool = customItems;
  else if (prefs.pool === "favorites") {
    const favSet = new Set(prefs.favorites || []);
    pool = [...APP_BACKGROUNDS, ...customItems].filter((b) => favSet.has(b.id));
  } else pool = [...APP_BACKGROUNDS, ...customItems];

  if (pool.length === 0) return findFixed();

  const di = dayIndex(date);
  const idx = prefs.mode === "weekly" ? Math.floor(di / 7) : di;
  return pool[((idx % pool.length) + pool.length) % pool.length];
}
