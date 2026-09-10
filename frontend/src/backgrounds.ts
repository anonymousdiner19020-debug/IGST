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

// Light, elegant motivational gradients — tuned so dark journal text stays readable.
export const APP_BACKGROUNDS: GradientBg[] = [
  { id: "sunrise", kind: "gradient", name: "Sunrise Resolve", quote: "Rise and begin again.", colors: ["#FFE7D0", "#FDF2E6", "#F8DFC2"] },
  { id: "golden", kind: "gradient", name: "Golden Hour", quote: "You are your own light.", colors: ["#FCEAC4", "#FCF3DC", "#F6DCA2"] },
  { id: "ocean", kind: "gradient", name: "Ocean Calm", quote: "Flow, don't force.", colors: ["#D8E9F1", "#EAF3F8", "#C7DDE9"] },
  { id: "sky", kind: "gradient", name: "Sky Dream", quote: "Dream in wide open spaces.", colors: ["#DCE6F6", "#EEF2FB", "#CAD7F0"] },
  { id: "forest", kind: "gradient", name: "Forest Focus", quote: "Grow steady, grow deep.", colors: ["#DFE8D5", "#EEF2E6", "#CFDCC0"] },
  { id: "mint", kind: "gradient", name: "Mint Fresh", quote: "Breathe. Reset. Begin.", colors: ["#D5EEE4", "#E8F6F0", "#BFE4D5"] },
  { id: "lavender", kind: "gradient", name: "Lavender Peace", quote: "Be gentle with yourself.", colors: ["#E8DFEF", "#F1ECF7", "#D9CCEB"] },
  { id: "rose", kind: "gradient", name: "Rose Bloom", quote: "Bloom where you are planted.", colors: ["#F6DBE0", "#FBEBEF", "#EFC6D0"] },
  { id: "sand", kind: "gradient", name: "Sand Dune", quote: "One step at a time.", colors: ["#EEE4D3", "#F5EEE0", "#E2D3BB"] },
  { id: "twilight", kind: "gradient", name: "Twilight", quote: "Rest is part of the work.", colors: ["#E0DEEB", "#ECEBF3", "#D0CDDF"] },
];

export type RotationMode = "fixed" | "daily" | "weekly";
export type RotationPool = "app" | "mine" | "all";

export type BackgroundPrefs = {
  mode: RotationMode;
  selectedId: string; // used in "fixed" mode
  pool: RotationPool; // used in daily/weekly rotation
  custom: { id: string; path: string }[]; // user photos
};

export const DEFAULT_BG_PREFS: BackgroundPrefs = {
  mode: "fixed",
  selectedId: "none",
  pool: "app",
  custom: [],
};

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

// Resolve the background that should be shown for a given date.
export function resolveActive(prefs: BackgroundPrefs, date: string): BgItem {
  const customItems: PhotoBg[] = (prefs.custom || []).map((c) => ({
    id: c.id,
    kind: "photo",
    path: c.path,
  }));

  if (prefs.mode === "fixed") {
    if (prefs.selectedId === "none") return NONE_BG;
    const app = APP_BACKGROUNDS.find((b) => b.id === prefs.selectedId);
    if (app) return app;
    const own = customItems.find((c) => c.id === prefs.selectedId);
    return own ?? NONE_BG;
  }

  let pool: BgItem[] = [];
  if (prefs.pool === "app") pool = APP_BACKGROUNDS;
  else if (prefs.pool === "mine") pool = customItems;
  else pool = [...APP_BACKGROUNDS, ...customItems];

  if (pool.length === 0) return NONE_BG;

  const di = dayIndex(date);
  const idx = prefs.mode === "weekly" ? Math.floor(di / 7) : di;
  return pool[((idx % pool.length) + pool.length) % pool.length];
}
