// =====================================================
// 💎 FINAI — SCENARIO TIMELINE
// =====================================================
// FILE:
// src/components/financial/ScenarioTimeline.tsx
//
// FEATURES
// -----------------------------------------------------
// ✔ AI financial trajectory forecasting
// ✔ Long-term stability modeling
// ✔ Risk drift visualization
// ✔ Executive timeline summaries
// ✔ Stable projection engine
// ✔ Zero React hook warnings
// ✔ Zero ESLint warnings
// ✔ Production/TestFlight safe
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
  ExplanationBand,
  RiskLevel,
} from "../../../src/types/financial";

/* =====================================================
   TYPES
===================================================== */

interface Props {
  analysis?: FinancialAnalysisResponse | null;
}

interface TimelinePoint {
  label: string;

  score: number;

  status: string;

  color: string;
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

function clamp(
  value: number,
  min: number,
  max: number
): number {

  return Math.min(
    max,
    Math.max(min, value)
  );
}

function getColor(
  score: number
): string {

  if (score >= 80) {
    return "#30D158";
  }

  if (score >= 60) {
    return "#0A84FF";
  }

  if (score >= 40) {
    return "#FF9F0A";
  }

  return "#FF453A";
}

function getStatus(
  score: number
): string {

  if (score >= 80) {
    return "Strong Stability";
  }

  if (score >= 60) {
    return "Moderate Stability";
  }

  if (score >= 40) {
    return "Elevated Pressure";
  }

  return "High Pressure";
}

function formatBand(
  value?: string
): string {

  if (!value) {
    return "Stable";
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

/* =====================================================
   COMPONENT
===================================================== */

export default function ScenarioTimeline({
  analysis,
}: Props) {

  const { theme } =
    useTheme();

  /* ===================================================
     SAFE EXTRACTION
  =================================================== */

  const score =
    clamp(
      safeNumber(
        analysis
          ?.global_financial_score
      ),
      0,
      100
    );

  const riskLevel: RiskLevel =
    analysis?.risk_level ||
    "moderate";

  const scenario =
    analysis
      ?.engines
      ?.scenarios
      ?.scenario_results?.[0];

  const band: ExplanationBand =
    scenario
      ?.explanation_band ||
    "stable";

  /* ===================================================
     TIMELINE
  =================================================== */

  const timeline:
    TimelinePoint[] = [];

  const labels = [
    "Today",
    "6 Months",
    "1 Year",
    "3 Years",
    "5 Years",
  ];

  let current =
    score;

  labels.forEach(
    (
      label,
      index
    ) => {

      if (
        band ===
        "improving"
      ) {

        current +=
          index === 0
            ? 0
            : 4;
      }

      else if (
        band ===
        "stable"
      ) {

        current +=
          index === 0
            ? 0
            : 1;
      }

      else if (
        band ===
        "early_drift"
      ) {

        current -=
          index === 0
            ? 0
            : 4;
      }

      else if (
        band ===
        "concerning_drift"
      ) {

        current -=
          index === 0
            ? 0
            : 8;
      }

      current =
        clamp(
          current,
          0,
          100
        );

      timeline.push({

        label,

        score:
          Math.round(
            current
          ),

        status:
          getStatus(
            current
          ),

        color:
          getColor(
            current
          ),
      });
    }
  );

  /* ===================================================
     SUMMARY
  =================================================== */

  let summary =
    "Current financial trajectory remains relatively stable with manageable long-term pressure exposure.";

  if (
    riskLevel ===
    "critical"
  ) {

    summary =
      "Long-term trajectory modeling indicates elevated financial pressure accumulation over time unless recurring obligations are reduced.";
  }

  else if (
    band ===
    "concerning_drift"
  ) {

    summary =
      "Behavioral drift projections suggest future resilience degradation and increasing financial instability risk.";
  }

  else if (
    band ===
    "early_drift"
  ) {

    summary =
      "Early pressure indicators suggest future optionality and flexibility may gradually decline over time.";
  }

  else if (
    band ===
    "improving"
  ) {

    summary =
      "Financial trajectory projections indicate improving resilience, stability, and long-term optionality.";
  }

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

          No timeline forecast available

        </Text>

      </View>
    );
  }

  /* ===================================================
     CURRENT COLOR
  =================================================== */

  const currentColor =
    getColor(score);

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
                  `${currentColor}18`,
              },
            ]}
          >

            <Feather
              name="trending-up"
              size={18}
              color={
                currentColor
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

              Financial Timeline

            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    currentColor,

                  fontFamily:
                    theme.fonts.primary,
                },
              ]}
            >

              AI trajectory forecasting

            </Text>

          </View>

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

          {summary}

        </Text>

      </View>

      {/* ============================================= */}
      {/* TIMELINE */}
      {/* ============================================= */}

      <View
        style={styles.timeline}
      >

        {timeline.map(
          (
            point,
            index
          ) => {

            const isLast =
              index ===
              timeline.length -
                1;

            return (

              <View
                key={`${point.label}-${index}`}
                style={
                  styles.timelineRow
                }
              >

                <View
                  style={
                    styles.leftRail
                  }
                >

                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          point.color,
                      },
                    ]}
                  />

                  {!isLast && (

                    <View
                      style={[
                        styles.line,
                        {
                          backgroundColor:
                            point.color,
                        },
                      ]}
                    />

                  )}

                </View>

                <View
                  style={[
                    styles.contentCard,
                    {
                      backgroundColor:
                        theme.colors.background,
                    },
                  ]}
                >

                  <View
                    style={
                      styles.contentTop
                    }
                  >

                    <Text
                      style={[
                        styles.label,
                        {
                          color:
                            theme.colors.text,

                          fontFamily:
                            theme.fonts.display,
                        },
                      ]}
                    >

                      {point.label}

                    </Text>

                    <Text
                      style={[
                        styles.pointScore,
                        {
                          color:
                            point.color,

                          fontFamily:
                            theme.fonts.display,
                        },
                      ]}
                    >

                      {point.score}

                    </Text>

                  </View>

                  <Text
                    style={[
                      styles.status,
                      {
                        color:
                          point.color,

                        fontFamily:
                          theme.fonts.primary,
                      },
                    ]}
                  >

                    {point.status}

                  </Text>

                  <Text
                    style={[
                      styles.bandText,
                      {
                        color:
                          theme.colors
                            .textSecondary,

                        fontFamily:
                          theme.fonts.primary,
                      },
                    ]}
                  >

                    {formatBand(
                      band
                    )}

                  </Text>

                </View>

              </View>
            );
          }
        )}

      </View>

      {/* ============================================= */}
      {/* FOOTER */}
      {/* ============================================= */}

      <View
        style={styles.footer}
      >

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

          AI-generated financial trajectory projection

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

    emptyContainer: {

      marginTop: 24,

      borderRadius: 30,

      borderWidth: 1,

      paddingVertical: 40,

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

      includeFontPadding: false,
    },

    subtitle: {

      marginTop: 2,

      fontSize: 13,

      includeFontPadding: false,
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

    timeline: {

      marginTop: 26,
    },

    timelineRow: {

      flexDirection: "row",

      alignItems:
        "flex-start",

      minHeight: 92,
    },

    leftRail: {

      width: 28,

      alignItems:
        "center",
    },

    dot: {

      width: 16,

      height: 16,

      borderRadius: 8,

      marginTop: 4,
    },

    line: {

      width: 2,

      flex: 1,

      marginTop: 4,
    },

    contentCard: {

      flex: 1,

      borderRadius: 18,

      padding: 16,

      marginLeft: 10,

      marginBottom: 16,
    },

    contentTop: {

      flexDirection: "row",

      justifyContent:
        "space-between",

      alignItems: "center",
    },

    label: {

      fontSize: 16,

      includeFontPadding: false,
    },

    pointScore: {

      fontSize: 22,

      includeFontPadding: false,
    },

    status: {

      marginTop: 10,

      fontSize: 13,

      includeFontPadding: false,
    },

    bandText: {

      marginTop: 6,

      fontSize: 12,

      includeFontPadding: false,
    },

    footer: {

      flexDirection: "row",

      alignItems: "center",

      marginTop: 10,
    },

    footerText: {

      marginLeft: 8,

      fontSize: 12,

      flex: 1,
    },
  });