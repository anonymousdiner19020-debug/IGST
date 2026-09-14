import React, { createContext, useContext, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

const KEY = "aura.privacy";

export type PrivacyIconKey =
  | "lock"
  | "heart"
  | "star"
  | "book"
  | "moon"
  | "shield"
  | "activity"
  | "calendar";

/** feather = icon name used on web/Android JS tabs & in-app; sf = iOS native tab symbol. */
export const PRIVACY_ICONS: Record<PrivacyIconKey, { feather: string; sf: string }> = {
  lock: { feather: "lock", sf: "lock.fill" },
  heart: { feather: "heart", sf: "heart.fill" },
  star: { feather: "star", sf: "star.fill" },
  book: { feather: "book", sf: "book.fill" },
  moon: { feather: "moon", sf: "moon.fill" },
  shield: { feather: "shield", sf: "shield.fill" },
  activity: { feather: "activity", sf: "waveform.path.ecg" },
  calendar: { feather: "calendar", sf: "calendar" },
};

export type PrivacyPrefs = { label: string; icon: PrivacyIconKey };
export const DEFAULT_PRIVACY: PrivacyPrefs = { label: "Private", icon: "lock" };

type Ctx = PrivacyPrefs & {
  ready: boolean;
  setPrefs: (p: Partial<PrivacyPrefs>) => void;
};

const PrivacyContext = createContext<Ctx | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<PrivacyPrefs>(DEFAULT_PRIVACY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    storage.getItem<PrivacyPrefs>(KEY, DEFAULT_PRIVACY).then((p) => {
      setPrefsState({ ...DEFAULT_PRIVACY, ...(p ?? {}) });
      setReady(true);
    });
  }, []);

  const setPrefs = (patch: Partial<PrivacyPrefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...patch };
      storage.setItem(KEY, next);
      return next;
    });
  };

  return (
    <PrivacyContext.Provider value={{ ...prefs, ready, setPrefs }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used within a PrivacyProvider");
  return ctx;
}
