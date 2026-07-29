// =====================================================
// 💎 FINAI — FINANCIAL BREAKDOWN CHART
// =====================================================
// FILE:
// src/components/financial/FinancialBreakdownChart.tsx
//
// PURPOSE
// -----------------------------------------------------
// Elite executive-level financial visualization layer.
//
// FEATURES
// -----------------------------------------------------
// ✔ Income vs Expenses
// ✔ Cashflow visualization
// ✔ Savings allocation
// ✔ AI financial pressure analysis
// ✔ Dynamic color grading
// ✔ Responsive card system
// ✔ Executive dashboard styling
// ✔ Financial intelligence metrics
//
// =====================================================

import React, {
  useMemo,
} from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import {
  Feather,
} from "@expo/vector-icons";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

import type {
  FinancialAnalysisResponse,
} from "../../../src/types/financial";

/* =====================================================
   TYPES
===================================================== */

interface Props {
  analysis?: FinancialAnalysisResponse | null;
}

/* =====================================================
   COMPONENT
===================================================== */

export default function FinancialBreakdownChart({
  analysis,
}: Props) {

  const { theme } =
    useTheme();

  /* ===================================================
     SAFE EXTRACTION
  =================================================== */

  const health =
    analysis?.financial_health;

  const income =
    Number(
      health?.income ?? 0
    );

  const expenses =
    Number(
      health?.expenses ?? 0
    );

  const cashflow =
    Number(
      health?.cashflow ?? 0
    );

  const savingsRate =
    Number(
      health?.savings_rate ?? 0
    );

  const score =
    Number(
      analysis
        ?.global_financial_score ?? 0
    );

  /* ===================================================
     BAR DATA
  =================================================== */

  const chartData =
    useMemo(() => {

      const safeIncome =
        Math.max(income, 1);

      const expensePercent =
        Math.min(
          (expenses / safeIncome) * 100,
          100
        );

      const cashflowPercent =
        Math.min(
          (cashflow / safeIncome) * 100,
          100
        );

      const savingsPercent =
        Math.min(
          savingsRate * 100,
          100
        );

      return {
        expensePercent,
        cashflowPercent,
        savingsPercent,
      };

    }, [
      income,
      expenses,
      cashflow,
      savingsRate,
    ]);

  /* ===================================================
     PRESSURE ANALYSIS
  =================================================== */

  const pressure =
    useMemo(() => {

      if (score >= 80) {

        return {
          label:
            "Low Pressure",

          color:
            "#30D158",

          icon:
            "shield" as const,

          text:
            "Financial obligations remain highly manageable relative to current income capacity.",
        };
      }

      if (score >= 60) {

        return {
          label:
            "Moderate Pressure",

          color:
            "#0A84FF",

          icon:
            "activity" as const,

          text:
            "Current obligations remain sustainable with manageable long-term exposure.",
        };
      }

      if (score >= 40) {

        return {
          label:
            "Elevated Pressure",

          color:
            "#FF9F0A",

          icon:
            "alert-circle" as const,

          text:
            "Expense pressure is beginning to reduce long-term optionality and financial flexibility.",
        };
      }

      return {
        label:
          "High Pressure",

        color:
          "#FF453A",

        icon:
          "alert-triangle" as const,

        text:
          "Financial commitments may significantly impact resilience and future cashflow stability.",
      };

    }, [score]);

  /* ===================================================
     SAFE GUARD
  =================================================== */

  if (!analysis) {
    return null;
  }

  /* ===================================================
     UI
  =================================================== */

  return (

    <View
      style={[

        styles.container,

        {
          backgroundColor:
            theme.colors.card,

          borderColor:
            theme.colors.divider,
        },
      ]}
    >

      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <View style={styles.header}>

        <View
          style={styles.headerLeft}
        >

          <View
            style={[

              styles.iconWrap,

              {
                backgroundColor:
                  `${pressure.color}18`,
              },
            ]}
          >

            <Feather
              name={pressure.icon}
              size={18}
              color={
                pressure.color
              }
            />

          </View>

          <View>

            <Text
              style={[

                styles.title,

                {
                  color:
                    theme.colors.text,

                  fontFamily:
                    theme.fonts.display,
                },
              ]}
            >

              Financial Breakdown

            </Text>

            <Text
              style={[

                styles.subtitle,

                {
                  color:
                    pressure.color,

                  fontFamily:
                    theme.fonts.primary,
                },
              ]}
            >

              {pressure.label}

            </Text>

          </View>

        </View>

      </View>

      {/* ============================================= */}
      {/* EXEC SUMMARY */}
      {/* ============================================= */}

      <View
        style={[

          styles.summaryBox,

          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >

        <Text
          style={[

            styles.summaryText,

            {
              color:
                theme.colors.text,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          {pressure.text}

        </Text>

      </View>

      {/* ============================================= */}
      {/* CHART */}
      {/* ============================================= */}

      <View
        style={styles.chartContainer}
      >

        {/* ========================================= */}
        {/* EXPENSES */}
        {/* ========================================= */}

        <BreakdownBar
          label="Expenses"
          value={`$${expenses.toLocaleString()}`}
          percent={
            chartData.expensePercent
          }
          color="#FF453A"
          theme={theme}
        />

        {/* ========================================= */}
        {/* CASHFLOW */}
        {/* ========================================= */}

        <BreakdownBar
          label="Cashflow"
          value={`$${cashflow.toLocaleString()}`}
          percent={
            chartData.cashflowPercent
          }
          color="#0A84FF"
          theme={theme}
        />

        {/* ========================================= */}
        {/* SAVINGS */}
        {/* ========================================= */}

        <BreakdownBar
          label="Savings Rate"
          value={`${Math.round(
            savingsRate * 100
          )}%`}
          percent={
            chartData.savingsPercent
          }
          color="#30D158"
          theme={theme}
        />

      </View>

      {/* ============================================= */}
      {/* FOOTER STATS */}
      {/* ============================================= */}

      <View style={styles.footerGrid}>

        <FooterMetric
          label="Income"
          value={`$${income.toLocaleString()}`}
          theme={theme}
        />

        <FooterMetric
          label="Score"
          value={`${Math.round(score)}`}
          theme={theme}
        />

      </View>

    </View>
  );
}

/* =====================================================
   BREAKDOWN BAR
===================================================== */

function BreakdownBar({
  label,
  value,
  percent,
  color,
  theme,
}: any) {

  return (

    <View
      style={styles.barBlock}
    >

      <View
        style={styles.barTop}
      >

        <Text
          style={[

            styles.barLabel,

            {
              color:
                theme.colors.text,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          {label}

        </Text>

        <Text
          style={[

            styles.barValue,

            {
              color,
              fontFamily:
                theme.fonts.display,
            },
          ]}
        >

          {value}

        </Text>

      </View>

      <View
        style={[

          styles.track,

          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >

        <View
          style={[

            styles.fill,

            {
              width:
                `${Math.max(percent, 4)}%`,

              backgroundColor:
                color,
            },
          ]}
        />

      </View>

    </View>
  );
}

/* =====================================================
   FOOTER METRIC
===================================================== */

function FooterMetric({
  label,
  value,
  theme,
}: any) {

  return (

    <View
      style={[

        styles.footerMetric,

        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      <Text
        style={[

          styles.footerLabel,

          {
            color:
              theme.colors
                .textSecondary,

            fontFamily:
              theme.fonts.primary,
          },
        ]}
      >

        {label}

      </Text>

      <Text
        style={[

          styles.footerValue,

          {
            color:
              theme.colors.text,

            fontFamily:
              theme.fonts.display,
          },
        ]}
      >

        {value}

      </Text>

    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {

      marginTop: 24,

      borderRadius: 30,

      borderWidth: 1,

      padding: 22,
    },

    header: {

      flexDirection: "row",

      alignItems: "center",
    },

    headerLeft: {

      flexDirection: "row",

      alignItems: "center",
    },

    iconWrap: {

      width: 46,

      height: 46,

      borderRadius: 16,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginRight: 14,
    },

    title: {

      fontSize: 20,
    },

    subtitle: {

      marginTop: 2,

      fontSize: 13,
    },

    summaryBox: {

      marginTop: 20,

      borderRadius: 18,

      padding: 18,
    },

    summaryText: {

      fontSize: 14,

      lineHeight: 22,
    },

    chartContainer: {

      marginTop: 24,

      gap: 22,
    },

    barBlock: {

      width: "100%",
    },

    barTop: {

      flexDirection: "row",

      justifyContent:
        "space-between",

      marginBottom: 8,
    },

    barLabel: {

      fontSize: 14,
    },

    barValue: {

      fontSize: 14,
    },

    track: {

      width: "100%",

      height: 16,

      borderRadius: 999,

      overflow: "hidden",
    },

    fill: {

      height: "100%",

      borderRadius: 999,
    },

    footerGrid: {

      marginTop: 26,

      flexDirection: "row",

      gap: 14,
    },

    footerMetric: {

      flex: 1,

      borderRadius: 18,

      padding: 16,
    },

    footerLabel: {

      fontSize: 12,
    },

    footerValue: {

      marginTop: 8,

      fontSize: 20,
    },
  });