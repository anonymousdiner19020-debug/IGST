import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { useUser } from "@/src/user-context";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pro";
export const TRIAL_DAYS = 10;

// Expo Go and the web preview run the SDK in Browser Mode against the Test Store.
export const rcEnabled = Platform.OS !== "web" || __DEV__;

function getRevenueCatApiKey() {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat public API keys not found — run the Setup section first");
  }
  if (Platform.OS === "web" || __DEV__) return REVENUECAT_TEST_API_KEY;
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat() {
  if (!rcEnabled) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: getRevenueCatApiKey() });
}

function useSubscriptionContext() {
  const queryClient = useQueryClient();
  const { userId } = useUser();
  const boundRef = useRef<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Bind the RevenueCat identity to the app's stable user id (account id when
  // signed in, else the persisted anonymous device id — both are stable).
  useEffect(() => {
    if (!rcEnabled || !userId) return;
    (async () => {
      try {
        if (boundRef.current !== userId) {
          await Purchases.logIn(userId);
          boundRef.current = userId;
          queryClient.invalidateQueries({ queryKey: ["revenuecat"] });
        }
      } catch (e) {
        setIdentityError(String(e));
      }
    })();
  }, [userId, queryClient]);

  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: () => Purchases.getCustomerInfo(),
    enabled: rcEnabled,
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    enabled: rcEnabled,
    staleTime: 300 * 1000,
  });

  useEffect(() => {
    if (!rcEnabled) return;
    const listener = (info: CustomerInfo) =>
      queryClient.setQueryData(["revenuecat", "customer-info"], info);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient]);

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      const id = (await Purchases.getCustomerInfo()).originalAppUserId;
      if (id.startsWith("$RCAnonymousID:")) throw new Error("identity_not_ready");
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  const originalAppUserId = customerInfoQuery.data?.originalAppUserId;
  const identityReady = !!originalAppUserId && !originalAppUserId.startsWith("$RCAnonymousID:");

  return {
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    identityReady,
    identityError,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}

/**
 * Combined access model: everyone gets a TRIAL_DAYS free-trial window from
 * signup; after that, an active `pro` entitlement is required. `hasAccess`
 * gates the premium experience across the app.
 */
export function useAccess() {
  const { init, ready } = useUser();
  const { isSubscribed, isLoading } = useSubscription();

  const signup = init?.signupDate ? dayjs(init.signupDate).startOf("day") : null;
  const daysSinceSignup = signup ? dayjs().startOf("day").diff(signup, "day") : 0;
  const trialDaysLeft = Math.max(0, TRIAL_DAYS - daysSinceSignup);
  const inTrial = trialDaysLeft > 0;

  // Until we know signup + subscription state, don't lock the user out.
  const resolving = !ready || (rcEnabled && isLoading);

  return {
    isSubscribed,
    inTrial,
    trialDaysLeft,
    hasAccess: isSubscribed || inTrial || resolving,
    resolving,
  };
}
