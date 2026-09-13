import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// eslint-disable-next-line import/no-unresolved
import { showPreloadedInterstitial } from "./admob";

// eslint-disable-next-line import/no-unresolved
export { initializeAds, preloadInterstitial } from "./admob";

const LAST_SHOWN = "aura.ads.interstitialLastShown";
const CAP_MS = 20 * 60 * 1000; // at most one interstitial every 20 minutes

/**
 * Show an interstitial only to trial (non-subscriber) users, at a natural
 * break, with a time-based frequency cap. Never blocks the user flow.
 */
export async function maybeShowInterstitial(showAds: boolean): Promise<boolean> {
  if (Platform.OS === "web" || !showAds) return false;
  try {
    const raw = await AsyncStorage.getItem(LAST_SHOWN);
    const last = raw ? Number(raw) : 0;
    if (Date.now() - last < CAP_MS) return false;
    const shown = showPreloadedInterstitial();
    if (shown) await AsyncStorage.setItem(LAST_SHOWN, String(Date.now()));
    return shown;
  } catch {
    return false;
  }
}
