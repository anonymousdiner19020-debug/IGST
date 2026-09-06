// Provides the effective userId (account when signed in, else anonymous device id)
// + init stats (streak / day number) app-wide.
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { api, getUserId, type InitResponse } from "@/src/api";
import { useAuth } from "@/src/auth-context";

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
  const { user, loading } = useAuth();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [init, setInit] = useState<InitResponse | null>(null);
  const [ready, setReady] = useState(false);

  const userId = user?.user_id ?? deviceId;

  const refresh = async () => {
    const id = await getUserId();
    setDeviceId(id);
    try {
      const res = await api.init(id);
      setInit(res);
    } catch {
      // keep app usable even if init fails
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    if (loading) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.user_id]);

  return (
    <UserContext.Provider value={{ userId, init, ready, refresh }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
