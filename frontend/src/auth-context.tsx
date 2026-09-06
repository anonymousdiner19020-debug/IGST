import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { api, getUserId, setAuthToken, type AuthUser } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { storage } from "@/src/utils/storage";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = "aura.token";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  signUpEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signUpEmail: async () => {},
  signInEmail: async () => {},
  signInGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const sentSessions = useRef<Set<string>>(new Set());

  const applyAuth = async (token: string, u: AuthUser) => {
    await storage.secureSet(TOKEN_KEY, token);
    setAuthToken(token);
    setUser(u);
    queryClient.invalidateQueries();
  };

  const completeGoogle = async (sessionId: string) => {
    if (sentSessions.current.has(sessionId)) return;
    sentSessions.current.add(sessionId);
    const device = await getUserId();
    const res = await api.googleSession(sessionId, device);
    await applyAuth(res.session_token, res.user);
  };

  const bootstrap = async () => {
    try {
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      if (token) {
        setAuthToken(token);
        const me = await api.me();
        setUser(me.user);
      }
    } catch {
      setAuthToken(null);
      await storage.secureRemove(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const raw = window.location.hash + window.location.search;
      const m = raw.match(/session_id=([^&#]+)/);
      if (m) {
        completeGoogle(m[1])
          .catch(() => {})
          .finally(() => {
            window.history.replaceState(window.history.state, "", window.location.pathname);
            setLoading(false);
          });
        return;
      }
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUpEmail = async (email: string, password: string, name?: string) => {
    const device = await getUserId();
    const res = await api.register(email.trim(), password, device, name);
    await applyAuth(res.session_token, res.user);
  };

  const signInEmail = async (email: string, password: string) => {
    const device = await getUserId();
    const res = await api.login(email.trim(), password, device);
    await applyAuth(res.session_token, res.user);
  };

  const signInGoogle = async () => {
    const redirectUrl =
      Platform.OS === "web" ? window.location.origin + "/" : Linking.createURL("");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }

    let captured: string | null = null;
    const sub = Linking.addEventListener("url", (e) => {
      captured = e.url;
    });
    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      let url: string | null = result.type === "success" ? result.url : null;
      if (!url) url = captured;
      if (!url) url = await Linking.getInitialURL();
      if (!url) return;
      const m = url.match(/[?#&]session_id=([^&#]+)/);
      if (!m) return;
      await completeGoogle(m[1]);
    } finally {
      sub.remove();
    }
  };

  const signOut = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    await storage.secureRemove(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
    queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signUpEmail, signInEmail, signInGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
