// App-wide background preference state.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import {
  DEFAULT_BG_PREFS,
  getBackgroundPrefs,
  setBackgroundPrefs,
  type BackgroundPrefs,
} from "@/src/backgrounds";

type BackgroundState = {
  prefs: BackgroundPrefs;
  loaded: boolean;
  update: (patch: Partial<BackgroundPrefs>) => void;
};

const BackgroundContext = createContext<BackgroundState>({
  prefs: DEFAULT_BG_PREFS,
  loaded: false,
  update: () => {},
});

export function BackgroundProvider({ children }: PropsWithChildren) {
  const [prefs, setPrefs] = useState<BackgroundPrefs>(DEFAULT_BG_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getBackgroundPrefs().then((p) => {
      setPrefs(p);
      setLoaded(true);
    });
  }, []);

  const update = useCallback((patch: Partial<BackgroundPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      setBackgroundPrefs(next);
      return next;
    });
  }, []);

  return (
    <BackgroundContext.Provider value={{ prefs, loaded, update }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  return useContext(BackgroundContext);
}
