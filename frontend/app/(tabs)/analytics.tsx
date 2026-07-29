import React from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DashboardHeader from "../../src/components/header/DashboardHeader";
import SpendingTrend from "../../src/components/dashboard/SpendingTrend";
import DonutSwitcher from "../../src/components/dashboard/DonutSwitcher";
import CategoryBreakdown from "../../src/components/dashboard/CategoryBreakdown";
import { useTheme } from "../../src/theme/ThemeContext";
import { useFinanceStore } from "../../src/store/financeStore";

export default function AnalyticsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const transactions = useFinanceStore((s) => s.transactions);
  const hasTransactions = transactions.length > 0;

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={theme.mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <DashboardHeader showBackButton={true} />

        {!hasTransactions ? (

          /* ============================================ */
          /* EMPTY STATE */
          /* ============================================ */

          <View style={[styles.emptyContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Feather name="bar-chart-2" size={48} color={theme.colors.textSecondary} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text, fontFamily: theme.fonts.semibold }]}>
              No data yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
              Add your first transaction to see spending analytics and trends.
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.colors.text }]}
              onPress={() => router.push("/(tabs)/add" as any)}
            >
              <Text style={[styles.emptyButtonText, { color: theme.colors.background, fontFamily: theme.fonts.semibold }]}>
                Add Transaction
              </Text>
            </TouchableOpacity>
          </View>

        ) : (

          /* ============================================ */
          /* ANALYTICS */
          /* ============================================ */

          <>
            <View style={styles.sectionSpacing}>
              <DonutSwitcher />
            </View>

            <View style={styles.sectionSpacing}>
              <SpendingTrend />
            </View>

            <View style={styles.sectionSpacing}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="insights" size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.fonts.accent2 }]}>
                  SPENDING BREAKDOWN
                </Text>
              </View>
              <CategoryBreakdown />
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 80,
    paddingHorizontal: 18,
  },
  sectionSpacing: { marginTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 14, letterSpacing: 2 },
  emptyContainer: {
    marginTop: 40,
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 22, letterSpacing: -0.5, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: { fontSize: 15 },
});