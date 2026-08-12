import { Platform } from "react-native";

// RevenueCat is only available in a native dev/production build (not Expo Go / web).
// This wrapper loads the SDK lazily and degrades gracefully everywhere else.
let Purchases: any = null;
let available = false;

const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY;

export function purchasesAvailable() {
  return available;
}

export async function initPurchases(appUserId: string) {
  if (Platform.OS === "web") return false;
  const apiKey = Platform.OS === "ios" ? IOS_KEY : ANDROID_KEY;
  if (!apiKey || apiKey.startsWith("REPLACE")) return false; // keys not configured yet
  try {
    // Lazy require so Expo Go / web (without the native module) never crash.
    Purchases = require("react-native-purchases").default;
    await Purchases.configure({ apiKey, appUserID: appUserId });
    available = true;
    return true;
  } catch {
    available = false;
    return false;
  }
}

export async function getOfferingPackages(): Promise<any[]> {
  if (!available || !Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: any): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  if (!available || !Purchases) return { ok: false, error: "unavailable" };
  try {
    await Purchases.purchasePackage(pkg);
    return { ok: true };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    return { ok: false, error: e?.message ?? "Purchase failed" };
  }
}

export async function restore(): Promise<boolean> {
  if (!available || !Purchases) return false;
  try {
    await Purchases.restorePurchases();
    return true;
  } catch {
    return false;
  }
}
