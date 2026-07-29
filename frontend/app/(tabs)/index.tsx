import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeContext";
import { useFinanceStore } from "../../src/store/financeStore";
import { useAuth } from "../../src/context/AuthContext";
import { api } from "../../src/services/api";
import { getTransactions } from "../../src/services/transactions";
import DashboardHeader from "../../src/components/header/DashboardHeader";
import CategoryDonut from "../../src/components/dashboard/CategoryDonut";
import CategoryBreakdown from "../../src/components/dashboard/CategoryBreakdown";

export default function Dashboard() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const hasHydrated = useFinanceStore((s) => s.hasHydrated);
  const setTransactions = useFinanceStore((s) => s.setTransactions);

  const [profileChecked, setProfileChecked] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const hasCheckedProfile = React.useRef(false);
  const hasFetchedTransactions = React.useRef(false);

  // ===================================================
  // CHECK BACKEND PROFILE
  // ===================================================

  useEffect(() => {
    if (!hasHydrated || !user) return;
    if (hasCheckedProfile.current) return;
    hasCheckedProfile.current = true;

    async function checkProfile() {
      try {
        await api.get("/profile");
        setProfileChecked(true);
      } catch (err: any) {
        if (err?.isOffline) {
          setProfileError("No internet connection. Please check your network.");
          setProfileChecked(true);
        } else if (err?.response?.status === 404) {
          router.replace("/(auth)/onboarding" as any);
        } else {
          // Network/server error — still show dashboard with cached data
          setProfileChecked(true);
        }
      }
    }

    checkProfile();
  }, [hasHydrated, user]);

  // ===================================================
  // LOAD TRANSACTIONS FROM BACKEND
  // ===================================================

  useEffect(() => {
    if (!hasHydrated || !user?.id) return;
    if (hasFetchedTransactions.current) return;
    hasFetchedTransactions.current = true;

    async function loadTransactions() {
      try {
        const remote = await getTransactions(user!.id);

        if (remote.length > 0) {
          setTransactions(remote);
        }
      } catch (err) {
        console.error("⚠️ Failed to load transactions from backend:", err);
      }
    }

    loadTransactions();
  }, [hasHydrated, user]);

  // ===================================================
  // LOADING
  // ===================================================

  // ===================================================
  // LOADING
  // ===================================================

  if (!hasHydrated || !profileChecked) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
          gap: 16,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.text} />
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: 14,
            fontFamily: theme.fonts.primary,
          }}
        >
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  // ===================================================
  // OFFLINE / ERROR BANNER
  // ===================================================

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>

      {/* OFFLINE BANNER */}
      {profileError && (
        <View
          style={{
            backgroundColor: "#EF444420",
            borderBottomWidth: 1,
            borderBottomColor: "#EF4444",
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Feather name="wifi-off" size={14} color="#EF4444" />
          <Text
            style={{
              color: "#EF4444",
              fontSize: 13,
              fontFamily: theme.fonts.primary,
              flex: 1,
            }}
          >
            {profileError}
          </Text>
          <TouchableOpacity onPress={() => {
            hasCheckedProfile.current = false;
            setProfileError(null);
            setProfileChecked(false);
          }}>
            <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: theme.fonts.semibold }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={{
          paddingHorizontal: 16,
          backgroundColor: theme.colors.background,
        }}
      >
        <DashboardHeader />
        <CategoryDonut />
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          marginTop: 16,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 16,
            marginBottom: 10,
            letterSpacing: 4,
            fontFamily: theme.fonts.accent2,
          }}
        >
          SPENDING BREAKDOWN
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <CategoryBreakdown />
        </ScrollView>
      </View>
    </View>
  );
}