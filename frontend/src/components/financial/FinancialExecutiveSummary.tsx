// =====================================================
// 💎 FINAI — FINANCIAL EXECUTIVE SUMMARY
// =====================================================
// FILE:
// src/components/financial/FinancialExecutiveSummary.tsx
//
// ✔ FIXED useMemo dependency warnings
// ✔ FIXED unstable array references
// ✔ FIXED hook ordering
// ✔ FIXED exhaustive-deps warnings
// ✔ Production-safe
// ✔ Zero yellow ESLint warnings
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
  ScenarioResult,
  RiskLevel,
  ExplanationBand,
} from "../../../src/types/financial";

/* =====================================================
   TYPES
===================================================== */

interface Props {
  analysis?: FinancialAnalysisResponse | null;
}

interface ExecutiveInsight {
  title: string;
  description: string;
  icon:
    keyof typeof Feather.glyphMap;
  color: string;
}

interface ExecutiveStatus {
  label: string;
  color: string;
  icon:
    keyof typeof Feather.glyphMap;
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

/* =====================================================
   COMPONENT
===================================================== */

export default function FinancialExecutiveSummary({
  analysis,
}: Props) {

  const { theme } =
    useTheme();

  /* ===================================================
     SAFE EXTRACTION
  =================================================== */

  const scenario =
    analysis?.engines
      ?.scenarios
      ?.scenario_results?.[0] as
      | ScenarioResult
      | undefined;

  const score =
    Math.round(
      safeNumber(
        scenario
          ?.global_financial_score ??
          analysis
            ?.global_financial_score
      )
    );

  const riskLevel: RiskLevel =
    analysis?.risk_level ||
    "moderate";

  const band: ExplanationBand =
    scenario
      ?.explanation_band ||
    "stable";

  // ===================================================
  // 🔥 FIXED ARRAY REFERENCES
  // ===================================================

  const strengths =
    useMemo<string[]>(() => {

      return Array.isArray(
        scenario?.key_strengths
      )
        ? [
            ...scenario.key_strengths,
          ]
        : [];

    }, [
      scenario?.key_strengths,
    ]);

  const risks =
    useMemo<string[]>(() => {

      return Array.isArray(
        scenario?.key_risks
      )
        ? [
            ...scenario.key_risks,
          ]
        : [];

    }, [
      scenario?.key_risks,
    ]);

  /* ===================================================
     STATUS
  =================================================== */

  const executiveStatus =
    useMemo<ExecutiveStatus>(() => {

      if (
        riskLevel ===
        "critical"
      ) {

        return {
          label:
            "Critical Financial Exposure",

          color:
            theme.colors.danger,

          icon:
            "alert-octagon",
        };
      }

      if (
        riskLevel === "high"
      ) {

        return {
          label:
            "Elevated Risk Environment",

          color:
            theme.colors.warning,

          icon:
            "alert-triangle",
        };
      }

      if (score >= 80) {

        return {
          label:
            "Strong Financial Position",

          color:
            theme.colors.success,

          icon:
            "shield",
        };
      }

      if (score >= 60) {

        return {
          label:
            "Stable Financial Position",

          color:
            theme.colors.chart4,

          icon:
            "activity",
        };
      }

      return {

        label:
          "Moderate Financial Pressure",

        color:
          "#FFD60A",

        icon:
          "bar-chart-2",
      };

    }, [
      riskLevel,
      score,
      theme.colors.chart4,
      theme.colors.danger,
      theme.colors.success,
      theme.colors.warning,
    ]);

  /* ===================================================
     EXECUTIVE NARRATIVE
  =================================================== */

  const executiveNarrative =
    useMemo(() => {

      if (
        riskLevel ===
        "critical"
      ) {

        return (
          "Financial trajectory modeling indicates elevated long-term pressure accumulation with materially reduced resilience. Current recurring obligations may significantly constrain optionality, liquidity preservation, and future strategic flexibility."
        );
      }

      if (
        riskLevel === "high"
      ) {

        return (
          "The current financial structure remains operational but demonstrates elevated exposure to cashflow volatility and long-term obligation pressure. Conservative commitment management and reserve strengthening are recommended."
        );
      }

      if (
        band ===
        "concerning_drift"
      ) {

        return (
          "Behavioral drift analysis suggests deteriorating long-term resilience characteristics and gradually increasing financial instability patterns over time."
        );
      }

      if (
        band ===
        "early_drift"
      ) {

        return (
          "Early trajectory indicators suggest future optionality and financial flexibility could gradually decline if recurring pressure continues increasing."
        );
      }

      if (
        band ===
          "improving" &&
        score >= 70
      ) {

        return (
          "Financial trajectory analysis indicates improving resilience, strengthening optionality, and healthy long-term sustainability characteristics across current behavioral patterns."
        );
      }

      if (score >= 80) {

        return (
          "Current financial positioning demonstrates strong resilience, healthy cashflow sustainability, and favorable long-term flexibility characteristics."
        );
      }

      return (
        "The overall financial trajectory remains relatively stable with moderate long-term resilience and manageable projected pressure exposure."
      );

    }, [
      band,
      riskLevel,
      score,
    ]);

  /* ===================================================
     INSIGHTS
  =================================================== */

  const insights =
    useMemo<
      ExecutiveInsight[]
    >(() => {

      const data:
        ExecutiveInsight[] = [];

      // ================================================
      // OPTIONALITY
      // ================================================

      if (score >= 75) {

        data.push({

          title:
            "Financial Optionality",

          description:
            "Current cashflow flexibility and resilience metrics suggest strong optionality for future strategic financial decisions.",

          icon:
            "zap",

          color:
            theme.colors.success,
        });

      } else {

        data.push({

          title:
            "Optionality Compression",

          description:
            "Recurring obligations may gradually reduce future flexibility and limit strategic financial maneuverability.",

          icon:
            "minimize-2",

          color:
            theme.colors.warning,
        });
      }

      // ================================================
      // RESILIENCE
      // ================================================

      if (
        riskLevel ===
          "high" ||
        riskLevel ===
          "critical"
      ) {

        data.push({

          title:
            "Resilience Pressure",

          description:
            "Stress modeling indicates elevated exposure to liquidity degradation during periods of volatility or income disruption.",

          icon:
            "shield-off",

          color:
            theme.colors.danger,
        });

      } else {

        data.push({

          title:
            "Resilience Stability",

          description:
            "Long-term resilience indicators currently remain within sustainable operational thresholds.",

          icon:
            "shield",

          color:
            theme.colors.chart4,
        });
      }

      // ================================================
      // BAND
      // ================================================

      if (
        band ===
        "concerning_drift"
      ) {

        data.push({

          title:
            "Behavioral Drift",

          description:
            "Behavioral trajectory analysis suggests worsening financial discipline patterns and rising long-term instability exposure.",

          icon:
            "trending-down",

          color:
            theme.colors.danger,
        });
      }

      if (
        band ===
        "improving"
      ) {

        data.push({

          title:
            "Positive Trajectory",

          description:
            "Behavioral trajectory indicators suggest improving financial discipline and strengthening sustainability trends.",

          icon:
            "trending-up",

          color:
            theme.colors.success,
        });
      }

      // ================================================
      // PRIMARY RISK
      // ================================================

      if (risks.length > 0) {

        data.push({

          title:
            "Primary Risk Vector",

          description:
            String(
              risks[0]
            ),

          icon:
            "alert-circle",

          color:
            theme.colors.warning,
        });
      }

      // ================================================
      // PRIMARY STRENGTH
      // ================================================

      if (
        strengths.length > 0
      ) {

        data.push({

          title:
            "Core Strength",

          description:
            String(
              strengths[0]
            ),

          icon:
            "check-circle",

          color:
            theme.colors.success,
        });
      }

      return data;

    }, [
      band,
      riskLevel,
      risks,
      score,
      strengths,
      theme.colors.chart4,
      theme.colors.danger,
      theme.colors.success,
      theme.colors.warning,
    ]);

  /* ===================================================
     RECOMMENDATION
  =================================================== */

  const recommendation =
    useMemo(() => {

      if (
        riskLevel ===
        "critical"
      ) {

        return (
          "Strategic priority should focus on liquidity preservation, obligation reduction, and restoring long-term resilience capacity before additional commitments are considered."
        );
      }

      if (
        riskLevel === "high"
      ) {

        return (
          "Additional recurring financial commitments should be approached conservatively while strengthening emergency reserves and cashflow durability."
        );
      }

      if (score >= 75) {

        return (
          "Current positioning may support moderate strategic investments, accelerated savings goals, or carefully managed long-term wealth expansion initiatives."
        );
      }

      return (
        "Maintaining stable expense control and improving free cashflow reserves may materially strengthen future optionality and resilience."
      );

    }, [
      riskLevel,
      score,
    ]);

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

      {/* HEADER */}

      <View style={styles.header}>

        <View
          style={
            styles.headerLeft
          }
        >

          <View
            style={[

              styles.iconWrap,

              {
                backgroundColor:
                  `${executiveStatus.color}18`,
              },
            ]}
          >

            <Feather
              name={
                executiveStatus.icon
              }
              size={20}
              color={
                executiveStatus.color
              }
            />

          </View>

          <View
            style={
              styles.titleWrap
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

              Executive Financial Intelligence

            </Text>

            <Text
              style={[

                styles.subtitle,

                {
                  color:
                    executiveStatus.color,

                  fontFamily:
                    theme.fonts.primary,
                },
              ]}
            >

              {
                executiveStatus.label
              }

            </Text>

          </View>

        </View>

        <View
          style={[

            styles.scoreBubble,

            {
              backgroundColor:
                `${executiveStatus.color}15`,
            },
          ]}
        >

          <Text
            style={[

              styles.scoreText,

              {
                color:
                  executiveStatus.color,

                fontFamily:
                  theme.fonts.display,
              },
            ]}
          >

            {score}

          </Text>

        </View>

      </View>

      {/* SUMMARY */}

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

          {
            executiveNarrative
          }

        </Text>

      </View>

      {/* INSIGHTS */}

      <View
        style={
          styles.insights
        }
      >

        {insights.map(
          (
            insight,
            index
          ) => (

            <View
              key={`${insight.title}-${index}`}
              style={
                styles.insightCard
              }
            >

              <View
                style={[

                  styles.insightIcon,

                  {
                    backgroundColor:
                      `${insight.color}18`,
                  },
                ]}
              >

                <Feather
                  name={
                    insight.icon
                  }
                  size={16}
                  color={
                    insight.color
                  }
                />

              </View>

              <View
                style={{
                  flex: 1,
                }}
              >

                <Text
                  style={[

                    styles.insightTitle,

                    {
                      color:
                        theme.colors.text,

                      fontFamily:
                        theme.fonts.display,
                    },
                  ]}
                >

                  {insight.title}

                </Text>

                <Text
                  style={[

                    styles.insightBody,

                    {
                      color:
                        theme.colors
                          .textSecondary,

                      fontFamily:
                        theme.fonts.primary,
                    },
                  ]}
                >

                  {
                    insight.description
                  }

                </Text>

              </View>

            </View>
          )
        )}

      </View>

      {/* RECOMMENDATION */}

      <View
        style={[

          styles.recommendationBox,

          {
            backgroundColor:
              `${executiveStatus.color}12`,
          },
        ]}
      >

        <View
          style={
            styles.recommendationHeader
          }
        >

          <Feather
            name="cpu"
            size={16}
            color={
              executiveStatus.color
            }
          />

          <Text
            style={[

              styles.recommendationTitle,

              {
                color:
                  executiveStatus.color,

                fontFamily:
                  theme.fonts.display,
              },
            ]}
          >

            Strategic Recommendation

          </Text>

        </View>

        <Text
          style={[

            styles.recommendationText,

            {
              color:
                theme.colors.text,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          {recommendation}

        </Text>

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

      marginTop: 24,

      borderRadius: 30,

      borderWidth: 1,

      padding: 22,
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
    },

    titleWrap: {

      flex: 1,
    },

    iconWrap: {

      width: 48,

      height: 48,

      borderRadius: 16,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginRight: 14,
    },

    title: {

      fontSize: 20,

      flexShrink: 1,
    },

    subtitle: {

      marginTop: 2,

      fontSize: 13,
    },

    scoreBubble: {

      width: 74,

      height: 74,

      borderRadius: 37,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginLeft: 16,
    },

    scoreText: {

      fontSize: 28,
    },

    summaryBox: {

      marginTop: 22,

      borderRadius: 20,

      padding: 18,
    },

    summaryText: {

      fontSize: 14,

      lineHeight: 24,
    },

    insights: {

      marginTop: 24,

      gap: 16,
    },

    insightCard: {

      flexDirection: "row",

      alignItems:
        "flex-start",
    },

    insightIcon: {

      width: 38,

      height: 38,

      borderRadius: 12,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginRight: 14,
    },

    insightTitle: {

      fontSize: 15,

      marginBottom: 4,
    },

    insightBody: {

      fontSize: 13,

      lineHeight: 21,
    },

    recommendationBox: {

      marginTop: 28,

      borderRadius: 22,

      padding: 18,
    },

    recommendationHeader: {

      flexDirection: "row",

      alignItems: "center",
    },

    recommendationTitle: {

      marginLeft: 8,

      fontSize: 15,
    },

    recommendationText: {

      marginTop: 12,

      fontSize: 14,

      lineHeight: 22,
    },
  });