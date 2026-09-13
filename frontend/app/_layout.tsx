import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { AuthProvider } from "@/src/auth-context";
import { BackgroundProvider } from "@/src/background-context";
import { queryClient } from "@/src/query-client";
import { initializeRevenueCat, SubscriptionProvider } from "@/src/revenuecat";
import { UserProvider } from "@/src/user-context";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync().catch(() => {});

try {
  initializeRevenueCat();
} catch (err) {
  console.warn("RevenueCat unavailable:", err);
}

export default function RootLayout() {
  const [loaded] = useFonts({
    "Fraunces-SemiBold": require("../assets/fonts/Fraunces-SemiBold.ttf"),
    "Fraunces-Bold": require("../assets/fonts/Fraunces-Bold.ttf"),
    "PlusJakartaSans-Regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    // Register the Feather glyph font so icons render in Expo Go / web.
    Feather: require("@react-native-vector-icons/feather/fonts/Feather.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <KeyboardProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <UserProvider>
                  <SubscriptionProvider>
                    <BackgroundProvider>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="flow" options={{ presentation: "card", animation: "slide_from_bottom" }} />
                        <Stack.Screen name="day/[date]" options={{ presentation: "card" }} />
                        <Stack.Screen name="settings" options={{ presentation: "card" }} />
                        <Stack.Screen name="background" options={{ presentation: "card" }} />
                        <Stack.Screen name="auth" options={{ presentation: "modal" }} />
                        <Stack.Screen name="account" options={{ presentation: "card" }} />
                        <Stack.Screen name="recap" options={{ presentation: "card" }} />
                        <Stack.Screen name="yearly-wrap" options={{ presentation: "card" }} />
                        <Stack.Screen name="gratitude-wall" options={{ presentation: "card" }} />
                        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
                      </Stack>
                    </BackgroundProvider>
                  </SubscriptionProvider>
                </UserProvider>
              </AuthProvider>
            </QueryClientProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
