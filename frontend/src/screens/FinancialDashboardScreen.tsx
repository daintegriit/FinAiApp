// =====================================================
// 💎 FINAI — FINANCIAL DASHBOARD SCREEN
// =====================================================
// FILE:
// src/screens/FinancialDashboardScreen.tsx
//
// PURPOSE
// -----------------------------------------------------
// Elite AI-powered financial intelligence command center.
//
// =====================================================

import React, {
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useTheme,
} from "../../src/theme/ThemeContext";

import {
  useFinanceStore,
} from "../../src/store/financeStore";

/* =====================================================
   COMPONENTS
===================================================== */

import RiskGauge
from "../../src/components/financial/RiskGauge";

import FinancialExecutiveSummary
from "../../src/components/financial/FinancialExecutiveSummary";

import FinancialHealthCard
from "../../src/components/financial/FinancialHealthCard";

import FinancialBreakdownChart
from "../../src/components/financial/FinancialBreakdownChart";

import SimulationInsights
from "../../src/components/financial/SimulationInsights";

import ScenarioComparison
from "../../src/components/financial/ScenarioComparison";

import SimulationHistoryCard
from "../../src/components/financial/SimulationHistoryCard";


import {
  useRouter,
} from "expo-router";

import DashboardHeader
from "../../src/components/header/DashboardHeader";

/* =====================================================
   COMPONENT
===================================================== */

export default function FinancialDashboardScreen() {

  const { theme } =
    useTheme();

  const router =
    useRouter();

  /* ===================================================
     STORE
  =================================================== */

  const analysis =
    useFinanceStore(
      (s) => s.analysis
    );

  const simulations =
    useFinanceStore(
      (s) => s.simulations || []
    );

  const transactions =
    useFinanceStore(
      (s) => s.transactions || []
    );

  const income =
    useFinanceStore(
      (s) => s.income || 0
    );

  /* ===================================================
     LOCAL STATE
  =================================================== */

  const [refreshing, setRefreshing] =
    useState(false);

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  /* ===================================================
     SELECTED SIMULATIONS
  =================================================== */

  const selectedSimulations =
    useMemo(() => {

      return simulations.filter(
        (simulation) =>
          selectedIds.includes(
            simulation.id
          )
      );

    }, [
      simulations,
      selectedIds,
    ]);

  /* ===================================================
     TOGGLE SELECT
  =================================================== */

  function handleToggleSelect(
    id: string
  ) {

    setSelectedIds((prev) => {

      if (prev.includes(id)) {

        return prev.filter(
          (x) => x !== id
        );
      }

      if (prev.length >= 2) {

        return [prev[1], id];
      }

      return [...prev, id];
    });
  }

  /* ===================================================
     DELETE
  =================================================== */

  function handleDelete(
    id: string
  ) {

    console.log(
      "Delete simulation:",
      id
    );
  }

  /* ===================================================
     REFRESH
  =================================================== */

  async function handleRefresh() {

    try {

      setRefreshing(true);

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1000
          )
      );

    } finally {

      setRefreshing(false);
    }
  }

  /* ===================================================
     METRICS
  =================================================== */

  const dashboardMetrics =
    useMemo(() => {

      const spending =
        transactions.reduce(
          (sum, tx) =>
            sum +
            Number(
              tx.amount || 0
            ),
          0
        );

      const remaining =
        income - spending;

      const savingsRate =
        income > 0
          ? remaining / income
          : 0;

      return {

        spending,

        remaining,

        savingsRate,
      };

    }, [
      income,
      transactions,
    ]);

  /* ===================================================
     EMPTY STATE
  =================================================== */

  if (!analysis) {

    return (

      <SafeAreaView
        style={[
          styles.emptyContainer,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >

        <Text
          style={[
            styles.emptyTitle,
            {
              color:
                theme.colors.text,

              fontFamily:
                theme.fonts.display,
            },
          ]}
        >

          No Financial Analysis Available

        </Text>

        <Text
          style={[
            styles.emptyText,
            {
              color:
                theme.colors
                  .textSecondary,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          Run a financial simulation to generate AI-powered financial intelligence insights.

        </Text>

      </SafeAreaView>
    );
  }

  /* ===================================================
     UI
  =================================================== */

  return (

    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[
        styles.container,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      <ScrollView

        showsVerticalScrollIndicator={
          false
        }

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }

        contentContainerStyle={{
          padding: 20,
          paddingBottom: 160,
        }}
      >

        <DashboardHeader
          hideSettings
          showBackButton
        />

        {/* ========================================= */}
        {/* HERO */}
        {/* ========================================= */}
        {/* ========================================= */}
        {/* HERO */}
        {/* ========================================= */}

        <View
          style={styles.hero}
        >

          <Text
            style={[
              styles.heroTitle,
              {
                color:
                  theme.colors.text,

                fontFamily:
                  theme.fonts.display,
              },
            ]}
          >

            Financial Intelligence Dashboard

          </Text>

          <Text
            style={[
              styles.heroSubtitle,
              {
                color:
                  theme.colors
                    .textSecondary,

                fontFamily:
                  theme.fonts.primary,
              },
            ]}
          >

            AI-powered executive financial analysis and strategic simulation intelligence.

          </Text>

        </View>

        {/* ========================================= */}
        {/* EXECUTIVE SUMMARY */}
        {/* ========================================= */}

        <FinancialExecutiveSummary
          analysis={analysis}
        />

        {/* ========================================= */}
        {/* RISK */}
        {/* ========================================= */}

        <RiskGauge
          analysis={analysis}
        />

        {/* ========================================= */}
        {/* HEALTH */}
        {/* ========================================= */}

        <FinancialHealthCard
          analysis={analysis}
        />

        {/* ========================================= */}
        {/* BREAKDOWN */}
        {/* ========================================= */}

        <FinancialBreakdownChart
          analysis={analysis}
        />

        {/* ========================================= */}
        {/* INSIGHTS */}
        {/* ========================================= */}

        <SimulationInsights
          analysis={analysis}
        />

        {/* ========================================= */}
        {/* COMPARISON */}
        {/* ========================================= */}

        {selectedSimulations.length ===
          2 && (

          <ScenarioComparison
            simulations={
              selectedSimulations
            }
          />
        )}

        {/* ========================================= */}
        {/* HISTORY */}
        {/* ========================================= */}

        <SimulationHistoryCard
          simulations={
            simulations
          }
          selectedIds={
            selectedIds
          }
          onToggleSelect={
            handleToggleSelect
          }
          onDelete={
            handleDelete
          }
        />

        {/* ========================================= */}
        {/* FOOTER */}
        {/* ========================================= */}

        <View
          style={[
            styles.footer,
            {
              borderColor:
                theme.colors.divider,
            },
          ]}
        >

          <Text
            style={[
              styles.footerTitle,
              {
                color:
                  theme.colors.text,

                fontFamily:
                  theme.fonts.display,
              },
            ]}
          >

            Financial Snapshot

          </Text>

          <Text
            style={[
              styles.footerText,
              {
                color:
                  theme.colors
                    .textSecondary,

                fontFamily:
                  theme.fonts.primary,
              },
            ]}
          >

            Monthly Spending: $
            {dashboardMetrics.spending.toLocaleString()}

          </Text>

          <Text
            style={[
              styles.footerText,
              {
                color:
                  theme.colors
                    .textSecondary,

                fontFamily:
                  theme.fonts.primary,
              },
            ]}
          >

            Remaining Cashflow: $
            {dashboardMetrics.remaining.toLocaleString()}

          </Text>

          <Text
            style={[
              styles.footerText,
              {
                color:
                  theme.colors
                    .textSecondary,

                fontFamily:
                  theme.fonts.primary,
              },
            ]}
          >

            Savings Rate:{" "}
            {Math.round(
              dashboardMetrics.savingsRate *
                100
            )}
            %

          </Text>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
    },

    emptyContainer: {

      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",

      padding: 40,
    },

    emptyTitle: {

      fontSize: 28,

      textAlign: "center",
    },

    emptyText: {

      marginTop: 12,

      fontSize: 15,

      textAlign: "center",

      lineHeight: 24,
    },

    topBar: {

      flexDirection: "row",

      alignItems: "center",

      borderBottomWidth: 1,

      paddingBottom: 18,

      marginBottom: 26,
    },

    backButton: {

      width: 46,

      height: 46,

      borderRadius: 14,

      borderWidth: 1,

      justifyContent: "center",

      alignItems: "center",
    },

    topTextWrap: {

      flex: 1,

      marginLeft: 14,
    },

    brandTitle: {

      fontSize: 24,

      letterSpacing: -0.5,
    },

    brandSub: {

      marginTop: 2,

      fontSize: 11,
    },

    hero: {

      marginBottom: 10,
    },

    heroTitle: {

      fontSize: 34,

      lineHeight: 40,
    },

    heroSubtitle: {

      marginTop: 8,

      fontSize: 15,

      lineHeight: 24,
    },

    footer: {

      marginTop: 30,

      paddingTop: 20,

      borderTopWidth: 1,
    },

    footerTitle: {

      fontSize: 16,

      marginBottom: 12,
    },

    footerText: {

      marginTop: 4,

      fontSize: 13,
    },
  });