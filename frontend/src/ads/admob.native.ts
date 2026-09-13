import { Platform } from "react-native";

// Lazy-require so the app never crashes where the native module is absent
// (e.g. Expo Go). Ads only work in a dev/release build; elsewhere these no-op.
let mod: any = null;
let tried = false;
function getMod(): any {
  if (tried) return mod;
  tried = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("react-native-google-mobile-ads");
  } catch {
    mod = null;
  }
  return mod;
}

const ANDROID_UNIT = process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID ?? "";
const IOS_UNIT = process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID ?? "";

function unitId(): string {
  const m = getMod();
  if (__DEV__ && m?.TestIds?.INTERSTITIAL) return m.TestIds.INTERSTITIAL;
  return Platform.OS === "ios" ? IOS_UNIT : ANDROID_UNIT;
}

let initialized = false;
let current: any = null;
let loaded = false;

export async function initializeAds() {
  const m = getMod();
  if (!m || initialized) return;
  try {
    await m.default().initialize();
    initialized = true;
  } catch {
    // ignore — ads simply stay unavailable
  }
}

export function preloadInterstitial() {
  const m = getMod();
  if (!m || current) return;
  const id = unitId();
  if (!id) return;
  try {
    const ad = m.InterstitialAd.createForAdRequest(id, {
      requestNonPersonalizedAdsOnly: __DEV__,
    });
    current = ad;
    loaded = false;
    ad.addAdEventListener(m.AdEventType.LOADED, () => {
      loaded = true;
    });
    ad.addAdEventListener(m.AdEventType.ERROR, () => {
      current = null;
      loaded = false;
    });
    ad.addAdEventListener(m.AdEventType.CLOSED, () => {
      current = null;
      loaded = false;
      preloadInterstitial();
    });
    ad.load();
  } catch {
    current = null;
    loaded = false;
  }
}

export function showPreloadedInterstitial(): boolean {
  if (!current || !loaded) {
    preloadInterstitial();
    return false;
  }
  try {
    current.show();
    return true;
  } catch {
    return false;
  }
}
