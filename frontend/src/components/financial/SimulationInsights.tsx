// =====================================================
// 💎 FINAI — SIMULATION INSIGHTS
// =====================================================
// FILE:
// src/components/financial/SimulationInsights.tsx
//
// FEATURES
// -----------------------------------------------------
// ✔ AI-generated financial insights
// ✔ Risk interpretation
// ✔ Strength detection
// ✔ Executive recommendations
// ✔ Stable scenario extraction
// ✔ Production-safe contracts
// ✔ Zero hook warnings
// ✔ Zero ESLint warnings
// ✔ Defensive rendering
//
// =====================================================

import React from "react";

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
  ScenarioResult,
} from "../../../src/types/financial";

/* =====================================================
   TYPES
===================================================== */

interface Props {
  analysis?: FinancialAnalysisResponse | null;
}

type InsightType =
  | "risk"
  | "strength"
  | "warning"
  | "recommendation";

interface Insight {
  type: InsightType;

  icon:
    keyof typeof Feather.glyphMap;

  text: string;
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

function safeArray(
  value: unknown
): string[] {

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item ===
        "string" &&
      item.trim().length >
        0
  );
}

function buildExecutiveSummary({
  score,
  band,
  riskLevel,
}: {
  score: number;
  band: string;
  riskLevel: string;
}) {

  if (
    riskLevel ===
    "critical"
  ) {

    return (
      "The current financial structure presents elevated long-term pressure and reduced resilience. Strategic reduction of recurring obligations may be necessary to improve financial stability."
    );
  }

  if (
    riskLevel ===
    "high"
  ) {

    return (
      "Your financial position remains functional but vulnerable to volatility and cashflow stress. Additional commitments should be approached conservatively."
    );
  }

  if (
    score >= 70 &&
    band === "stable"
  ) {

    return (
      "Your financial trajectory currently demonstrates strong stability, manageable risk exposure, and healthy long-term sustainability characteristics."
    );
  }

  if (
    band ===
    "early_drift"
  ) {

    return (
      "Early financial drift indicators suggest future instability could emerge if spending pressure or recurring obligations continue increasing."
    );
  }

  return (
    "Your financial profile reflects moderate stability with opportunities to improve resilience, liquidity, and long-term optionality."
  );
}

function getInsightColor(
  type: InsightType
): string {

  switch (type) {

    case "risk":
      return "#FF453A";

    case "warning":
      return "#FF9F0A";

    case "recommendation":
      return "#0A84FF";

    case "strength":
    default:
      return "#30D158";
  }
}

/* =====================================================
   COMPONENT
===================================================== */

export default function SimulationInsights({
  analysis,
}: Props) {

  const { theme } =
    useTheme();

  /* ===================================================
     SAFE EMPTY STATE
  =================================================== */

  if (!analysis) {

    return (

      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor:
              theme.colors.card,

            borderColor:
              theme.colors.divider,
          },
        ]}
      >

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

          No simulation insights available

        </Text>

      </View>
    );
  }

  /* ===================================================
     SAFE EXTRACTION
  =================================================== */

  const scenario =
    analysis
      ?.engines
      ?.scenarios
      ?.scenario_results?.[0] as
      | ScenarioResult
      | undefined;

  const score =
    safeNumber(
      scenario
        ?.global_financial_score ??
      analysis
        ?.global_financial_score
    );

  const riskLevel =
    analysis?.risk_level ||
    "moderate";

  const band =
    scenario
      ?.explanation_band ||
    "stable";

  const risks =
    safeArray(
      scenario?.key_risks
    );

  const strengths =
    safeArray(
      scenario
        ?.key_strengths
    );

  /* ===================================================
     GENERATED INSIGHTS
  =================================================== */

  const generatedInsights:
    Insight[] = [];

  /* ============================================= */
  /* SCORE ANALYSIS */
  /* ============================================= */

  if (score >= 80) {

    generatedInsights.push({

      type: "strength",

      icon: "shield",

      text:
        "Your financial positioning appears exceptionally stable with strong long-term resilience indicators.",
    });

  }

  else if (
    score >= 60
  ) {

    generatedInsights.push({

      type: "strength",

      icon:
        "trending-up",

      text:
        "Your current financial trajectory remains relatively healthy with manageable risk exposure.",
    });

  }

  else if (
    score >= 40
  ) {

    generatedInsights.push({

      type: "warning",

      icon:
        "alert-circle",

      text:
        "Moderate financial pressure detected. Large recurring commitments could reduce future flexibility.",
    });

  }

  else {

    generatedInsights.push({

      type: "risk",

      icon:
        "alert-triangle",

      text:
        "High financial stress indicators detected. Current obligations may significantly impact long-term stability.",
    });
  }

  /* ============================================= */
  /* RISK LEVEL */
  /* ============================================= */

  if (
    riskLevel ===
    "critical"
  ) {

    generatedInsights.push({

      type: "risk",

      icon:
        "x-octagon",

      text:
        "Critical financial risk detected. Immediate reduction of financial pressure is strongly recommended.",
    });

  }

  else if (
    riskLevel ===
    "high"
  ) {

    generatedInsights.push({

      type: "risk",

      icon:
        "alert-octagon",

      text:
        "High risk exposure detected. Additional debt or aggressive spending could weaken resilience.",
    });

  }

  else if (
    riskLevel ===
    "moderate"
  ) {

    generatedInsights.push({

      type: "warning",

      icon:
        "activity",

      text:
        "Your current position is stable, but maintaining emergency liquidity is recommended.",
    });
  }

  /* ============================================= */
  /* EXPLANATION BAND */
  /* ============================================= */

  if (
    band ===
    "concerning_drift"
  ) {

    generatedInsights.push({

      type: "risk",

      icon:
        "trending-down",

      text:
        "Behavioral drift patterns suggest increasing long-term financial instability.",
    });
  }

  if (
    band ===
    "early_drift"
  ) {

    generatedInsights.push({

      type: "warning",

      icon:
        "bar-chart-2",

      text:
        "Early drift indicators suggest future spending pressure may begin increasing.",
    });
  }

  if (
    band ===
    "stable"
  ) {

    generatedInsights.push({

      type: "strength",

      icon:
        "check-circle",

      text:
        "Your financial behavior currently aligns with stable long-term sustainability patterns.",
    });
  }

  if (
    band ===
    "improving"
  ) {

    generatedInsights.push({

      type: "strength",

      icon: "award",

      text:
        "Your financial indicators are improving and suggest strengthening resilience over time.",
    });
  }

  /* ============================================= */
  /* BACKEND RISKS */
  /* ============================================= */

  risks.forEach(
    (risk) => {

      generatedInsights.push({

        type: "risk",

        icon:
          "alert-triangle",

        text: risk,
      });
    }
  );

  /* ============================================= */
  /* BACKEND STRENGTHS */
  /* ============================================= */

  strengths.forEach(
    (
      strength
    ) => {

      generatedInsights.push({

        type: "strength",

        icon: "check",

        text: strength,
      });
    }
  );

  /* ============================================= */
  /* RECOMMENDATIONS */
  /* ============================================= */

  if (
    score < 70
  ) {

    generatedInsights.push({

      type:
        "recommendation",

      icon: "target",

      text:
        "Reducing recurring monthly obligations may significantly improve long-term optionality.",
    });
  }

  if (
    score < 50
  ) {

    generatedInsights.push({

      type:
        "recommendation",

      icon:
        "dollar-sign",

      text:
        "Increasing free cashflow reserves and emergency savings is recommended before taking on additional commitments.",
    });
  }

  if (
    score >= 70
  ) {

    generatedInsights.push({

      type:
        "recommendation",

      icon: "zap",

      text:
        "Your current financial structure may support moderate strategic investments or accelerated wealth-building goals.",
    });
  }

  /* ===================================================
     SUMMARY
  =================================================== */

  const summary =
    buildExecutiveSummary({
      score,
      band,
      riskLevel,
    });

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

      <View
        style={styles.header}
      >

        <Feather
          name="cpu"
          size={18}
          color={
            theme.colors.text
          }
        />

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

          AI Financial Insights

        </Text>

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

          {summary}

        </Text>

      </View>

      {/* ============================================= */}
      {/* INSIGHTS */}
      {/* ============================================= */}

      <View
        style={
          styles.insightsContainer
        }
      >

        {generatedInsights.map(
          (
            insight,
            index
          ) => {

            const color =
              getInsightColor(
                insight.type
              );

            return (

              <View
                key={`${insight.text}-${index}`}
                style={
                  styles.insightRow
                }
              >

                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor:
                        `${color}18`,
                    },
                  ]}
                >

                  <Feather
                    name={
                      insight.icon
                    }
                    size={16}
                    color={color}
                  />

                </View>

                <Text
                  style={[
                    styles.insightText,
                    {
                      color:
                        theme.colors.text,

                      fontFamily:
                        theme.fonts.primary,
                    },
                  ]}
                >

                  {insight.text}

                </Text>

              </View>
            );
          }
        )}

      </View>

    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {

      marginTop: 20,

      borderRadius: 28,

      borderWidth: 1,

      padding: 22,
    },

    emptyContainer: {

      marginTop: 20,

      borderRadius: 28,

      borderWidth: 1,

      paddingVertical: 36,

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    emptyText: {

      fontSize: 14,
    },

    header: {

      flexDirection: "row",

      alignItems: "center",

      gap: 8,
    },

    title: {

      fontSize: 18,

      includeFontPadding: false,
    },

    summaryBox: {

      marginTop: 18,

      borderRadius: 18,

      padding: 16,
    },

    summaryText: {

      fontSize: 14,

      lineHeight: 22,
    },

    insightsContainer: {

      marginTop: 20,

      gap: 14,
    },

    insightRow: {

      flexDirection: "row",

      alignItems:
        "flex-start",
    },

    iconWrap: {

      width: 34,

      height: 34,

      borderRadius: 12,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginRight: 12,

      marginTop: 2,
    },

    insightText: {

      flex: 1,

      fontSize: 14,

      lineHeight: 22,
    },
  });