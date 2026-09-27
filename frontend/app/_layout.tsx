import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import OfflineBanner from "../src/components/system/OfflineBanner";
import InactivityLock from "../src/components/system/InactivityLock";   // ← add this line
import * as Notifications from "expo-notifications";
import { configureBilling } from "../src/services/billing";

// Configure RevenueCat at module load, before AuthProvider mounts.
// AuthContext's boot effect calls identifyUser(), which needs the SDK
// already configured — an in-component useEffect would run too late and
// race that first identify. This is safe with an empty API key: it
// no-ops with a dev warning until the key is set.
configureBilling();


export const unstable_settings = {
  anchor: "(tabs)",
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === "(auth)";
    const onTerms = segments[1] === "terms";
    const onOnboarding = segments[1] === "onboarding";

    // Step 1 — Not logged in → go to login (terms come AFTER auth)
    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login" as any);
      return;
    }

    // Step 2 — Logged in but hasn't accepted terms → force terms screen
    if (isAuthenticated && user && !user.terms_accepted_at) {
      if (!onTerms) router.replace("/(auth)/terms" as any);
      return;
    }

    // Step 3 — Logged in, terms accepted, but stuck in auth group → go to tabs
    // Exception: onboarding is allowed while authenticated
    if (isAuthenticated && inAuthGroup && !onOnboarding && !onTerms) {
      router.replace("/(tabs)" as any);
    }

  }, [isAuthenticated, isLoading, segments, user]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000000",
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <>
      {children}
      <InactivityLock />
    </>
  );
}


function RootLayoutNav() {
  const { theme, isDark } = useTheme();

  useEffect(() => {
    // Handle notification taps
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("📱 Notification tapped:", data);
        // Could navigate to a specific screen based on data
      }
    );
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={theme.colors.background}
      />
      <OfflineBanner />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Stack.Screen
            name="(auth)"
            options={{ headerShown: false, animation: "fade" }}
          />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: false,
              presentation: "card",
              animation: "slide_from_right",
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          />
          <Stack.Screen
            name="modal"
            options={{
              presentation: "modal",
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          />
        </Stack>
      </View>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    "Unageo-Regular": require("@/assets/fonts/Unageo-Regular.ttf"),
    "Unageo-Medium": require("@/assets/fonts/Unageo-Medium.ttf"),
    "Unageo-SemiBold": require("@/assets/fonts/Unageo-SemiBold.ttf"),
    "Unageo-Bold": require("@/assets/fonts/Unageo-Bold.ttf"),
    Select: require("@/assets/fonts/Select.ttf"),
    SelectLight: require("@/assets/fonts/SelectLight.ttf"),
    Klops: require("@/assets/fonts/Klops.otf"),
    RACESPACEREGULAR: require("@/assets/fonts/RACESPACEREGULAR.otf"),
    MAXIMUMSECURITY: require("@/assets/fonts/MAXIMUMSECURITY.ttf"),
    LucidStreams: require("@/assets/fonts/LucidStreams.otf"),
  });

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000000",
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AuthGate>
              <RootLayoutNav />
            </AuthGate>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}