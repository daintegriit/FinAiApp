// =====================================================
// 💎 FINAI — FINANCIAL HEALTH CARD
// =====================================================
// FILE:
// src/components/financial/FinancialHealthCard.tsx
//
// PURPOSE
// -----------------------------------------------------
// Executive-level financial health intelligence card.
//
// FEATURES
// -----------------------------------------------------
// ✔ Financial health score
// ✔ Income vs expenses
// ✔ Savings rate
// ✔ Cashflow analysis
// ✔ AI-generated health status
// ✔ Stability indicators
// ✔ Executive summary
// ✔ Intelligent color grading
// ✔ Zero React hook warnings
// ✔ Zero ESLint warnings
// ✔ Production-safe numeric coercion
// ✔ TestFlight-safe rendering
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
  RiskLevel,
} from "../../../src/types/financial";

/* =====================================================
   TYPES
===================================================== */

interface Props {
  analysis?: FinancialAnalysisResponse | null;
}

interface HealthStatus {
  label: string;

  icon:
    keyof typeof Feather.glyphMap;

  color: string;

  summary: string;
}

/* =====================================================
   HELPERS
===================================================== */

function safeNumber(
  value: unknown
): number {

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatCurrency(
  value: number
): string {

  return `$${Math.round(
    value
  ).toLocaleString()}`;
}

/* =====================================================
   COMPONENT
===================================================== */

export default function FinancialHealthCard({
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
    safeNumber(
      health?.income
    );

  const expenses =
    safeNumber(
      health?.expenses
    );

  const cashflow =
    safeNumber(
      health?.cashflow
    );

  const savingsRate =
    safeNumber(
      health?.savings_rate
    );

  const score =
    safeNumber(
      analysis
        ?.global_financial_score
    );

  const riskLevel: RiskLevel =
    analysis?.risk_level ||
    "moderate";

  /* ===================================================
     SAVINGS %
  =================================================== */

  const savingsPercent =
    Math.round(
      savingsRate * 100
    );

  /* ===================================================
     STATUS
  =================================================== */

  const status =
    useMemo<HealthStatus>(() => {

      if (
        riskLevel === "critical"
      ) {

        return {
          label:
            "Critical Pressure",

          icon:
            "alert-octagon",

          color:
            theme.colors.danger,

          summary:
            analysis?.summary ||
            "Financial stress levels are critically elevated and long-term sustainability may be at risk.",
        };
      }

      if (
        riskLevel === "high"
      ) {

        return {
          label:
            "High Risk",

          icon:
            "alert-triangle",

          color:
            theme.colors.warning,

          summary:
            analysis?.summary ||
            "Financial pressure remains elevated and additional recurring obligations should be approached conservatively.",
        };
      }

      if (score >= 75) {

        return {
          label:
            "Strong Stability",

          icon:
            "shield",

          color:
            theme.colors.success,

          summary:
            analysis?.summary ||
            "Your current financial structure demonstrates strong resilience and healthy long-term sustainability.",
        };
      }

      if (score >= 55) {

        return {
          label:
            "Moderate Stability",

          icon:
            "activity",

          color:
            theme.colors.chart4,

          summary:
            analysis?.summary ||
            "Financial conditions remain relatively stable with manageable risk exposure and moderate resilience.",
        };
      }

      return {
        label:
          "Financial Pressure",

        icon:
          "trending-down",

        color:
          theme.colors.warning,

        summary:
          analysis?.summary ||
          "Current cashflow and expense pressure may reduce future flexibility and optionality.",
      };

    }, [
      analysis?.summary,
      riskLevel,
      score,
      theme.colors.chart4,
      theme.colors.danger,
      theme.colors.success,
      theme.colors.warning,
    ]);

  /* ===================================================
     CASHFLOW COLOR
  =================================================== */

  const cashflowColor =
    cashflow >= 0
      ? theme.colors.success
      : theme.colors.danger;

  /* ===================================================
     SAFE EMPTY STATE
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
                  `${status.color}18`,
              },
            ]}
          >

            <Feather
              name={status.icon}
              size={18}
              color={
                status.color
              }
            />

          </View>

          <View
            style={
              styles.titleContainer
            }
          >

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

              Financial Health

            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    status.color,

                  fontFamily:
                    theme.fonts.primary,
                },
              ]}
            >

              {status.label}

            </Text>

          </View>

        </View>

        {/* SCORE */}

        <View
          style={[
            styles.scoreBubble,
            {
              backgroundColor:
                `${status.color}15`,
            },
          ]}
        >

          <Text
            style={[
              styles.scoreText,
              {
                color:
                  status.color,

                fontFamily:
                  theme.fonts.display,
              },
            ]}
          >

            {Math.round(score)}

          </Text>

        </View>

      </View>

      {/* ============================================= */}
      {/* SUMMARY */}
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

          {status.summary}

        </Text>

      </View>

      {/* ============================================= */}
      {/* METRICS */}
      {/* ============================================= */}

      <View style={styles.grid}>

        <MetricCard
          label="Income"
          value={formatCurrency(
            income
          )}
          icon="trending-up"
          color={
            theme.colors.success
          }
        />

        <MetricCard
          label="Expenses"
          value={formatCurrency(
            expenses
          )}
          icon="credit-card"
          color={
            theme.colors.danger
          }
        />

        <MetricCard
          label="Cashflow"
          value={formatCurrency(
            cashflow
          )}
          icon="activity"
          color={cashflowColor}
        />

        <MetricCard
          label="Savings Rate"
          value={`${savingsPercent}%`}
          icon="shield"
          color={
            theme.colors.warning
          }
        />

      </View>

      {/* ============================================= */}
      {/* FOOTER */}
      {/* ============================================= */}

      <View style={styles.footer}>

        <Feather
          name="cpu"
          size={14}
          color={
            theme.colors
              .textSecondary
          }
        />

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

          AI-generated financial stability analysis

        </Text>

      </View>

    </View>
  );
}

/* =====================================================
   METRIC CARD
===================================================== */

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon:
    keyof typeof Feather.glyphMap;
  color: string;
}) {

  const { theme } =
    useTheme();

  return (

    <View
      style={[
        styles.metricCard,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      <View
        style={[
          styles.metricIcon,
          {
            backgroundColor:
              `${color}18`,
          },
        ]}
      >

        <Feather
          name={icon}
          size={14}
          color={color}
        />

      </View>

      <Text
        style={[
          styles.metricLabel,
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
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.metricValue,
          {
            color:
              theme.colors.text,

            fontFamily:
              theme.fonts.display,
            includeFontPadding: false,
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
      overflow: "hidden",
    },

    header: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingRight: 12,
    },

    titleContainer: {
      flexShrink: 1,
    },

    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 16,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginRight: 14,
    },

    title: {
      fontSize: 20,
      includeFontPadding: false,
    },

    subtitle: {
      marginTop: 2,
      fontSize: 13,
      includeFontPadding: false,
    },

    scoreBubble: {
      width: 70,
      height: 70,
      borderRadius: 35,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    scoreText: {
      fontSize: 28,
      includeFontPadding: false,
    },

    summaryBox: {
      marginTop: 20,
      borderRadius: 20,
      padding: 18,
    },

    summaryText: {
      fontSize: 14,
      lineHeight: 22,
    },

    grid: {
      marginTop: 22,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "space-between",
      gap: 14,
    },

    metricCard: {
      width: "47%",
      borderRadius: 20,
      padding: 16,
      minHeight: 120,
    },

    metricIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    metricLabel: {
      marginTop: 12,
      fontSize: 12,
      includeFontPadding: false,
    },

    metricValue: {
      marginTop: 4,
      fontSize: 18,
    },

    footer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 22,
    },

    footerText: {
      marginLeft: 8,
      fontSize: 12,
      flex: 1,
    },
  });