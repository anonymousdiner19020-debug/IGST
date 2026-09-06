// Provides the anonymous device userId + init stats (streak / day number) app-wide.
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { api, getUserId, type InitResponse } from "@/src/api";

type UserState = {
  userId: string | null;
  init: InitResponse | null;
  ready: boolean;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserState>({
  userId: null,
  init: null,
  ready: false,
  refresh: async () => {},
});

export function UserProvider({ children }: PropsWithChildren) {
  const [userId, setUserId] = useState<string | null>(null);
  const [init, setInit] = useState<InitResponse | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    const id = await getUserId();
    setUserId(id);
    try {
      const res = await api.init(id);
      setInit(res);
    } catch {
      // Keep the app usable even if init fails; stats simply stay null.
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <UserContext.Provider value={{ userId, init, ready, refresh }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
