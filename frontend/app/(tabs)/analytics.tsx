import React, { useMemo, useState } from "react";
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseServerDate(iso: string): Date {
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
  return new Date(hasTz ? iso : `${iso}Z`);
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const transactions = useFinanceStore((s) => s.transactions);
  const hasTransactions = transactions.length > 0;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // Totals for the selected month and the previous month (for comparison).
  const { thisTotal, lastTotal, thisCount } = useMemo(() => {
    let thisTotal = 0, lastTotal = 0, thisCount = 0;
    const prevMonthDate = new Date(year, month - 1, 1);
    const pYear = prevMonthDate.getFullYear();
    const pMonth = prevMonthDate.getMonth();
    transactions.forEach((tx) => {
      if (!tx.created_at) return;
      const d = parseServerDate(tx.created_at);
      const amt = Math.abs(Number(tx.amount) || 0);
      if (d.getFullYear() === year && d.getMonth() === month) {
        thisTotal += amt; thisCount += 1;
      } else if (d.getFullYear() === pYear && d.getMonth() === pMonth) {
        lastTotal += amt;
      }
    });
    return { thisTotal, lastTotal, thisCount };
  }, [transactions, year, month]);

  const pctChange = useMemo(() => {
    if (lastTotal <= 0) return null;
    return Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
  }, [thisTotal, lastTotal]);

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
          <>
            {/* MONTH NAVIGATION */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={prevMonth}
                style={[styles.navButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              >
                <Feather name="chevron-left" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
                {MONTH_NAMES[month]} {year}
              </Text>
              <TouchableOpacity
                onPress={nextMonth}
                style={[styles.navButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              >
                <Feather name="chevron-right" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* MONTH SUMMARY + COMPARISON */}
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.summaryBig, { color: theme.colors.text, fontFamily: theme.fonts.display }]}>
                    ${thisTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                  <Text style={[styles.summaryCaption, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                    Spent in {MONTH_NAMES[month]}
                  </Text>
                </View>
                {pctChange !== null && (
                  <View style={styles.changePill}>
                    <Feather
                      name={pctChange > 0 ? "trending-up" : pctChange < 0 ? "trending-down" : "minus"}
                      size={16}
                      color={pctChange > 0 ? theme.colors.danger : pctChange < 0 ? theme.colors.success : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.changeText,
                        {
                          color: pctChange > 0 ? theme.colors.danger : pctChange < 0 ? theme.colors.success : theme.colors.textSecondary,
                          fontFamily: theme.fonts.semibold,
                        },
                      ]}
                    >
                      {Math.abs(pctChange)}% vs last mo
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.summaryStats}>
                <Text style={[styles.summaryStat, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                  {thisCount} transaction{thisCount === 1 ? "" : "s"}
                </Text>
                {lastTotal > 0 && (
                  <Text style={[styles.summaryStat, { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }]}>
                    Last month: ${lastTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                )}
              </View>
            </View>

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
  scrollContent: { paddingTop: 0, paddingBottom: 80, paddingHorizontal: 18 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 14,
  },
  navButton: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  monthLabel: { fontSize: 18, letterSpacing: -0.3 },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 6,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryBig: { fontSize: 32, letterSpacing: -1 },
  summaryCaption: { fontSize: 13, marginTop: 4 },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  changeText: { fontSize: 12 },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  summaryStat: { fontSize: 12 },
  sectionSpacing: { marginTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 14, letterSpacing: 2 },
  emptyContainer: {
    marginTop: 40, padding: 32, borderRadius: 20, borderWidth: 1, alignItems: "center",
  },
  emptyTitle: { fontSize: 22, letterSpacing: -0.5, marginBottom: 10 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  emptyButton: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyButtonText: { fontSize: 15 },
});
