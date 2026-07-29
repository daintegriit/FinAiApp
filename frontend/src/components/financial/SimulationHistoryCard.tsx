// =====================================================
// 💎 FINAI — SIMULATION HISTORY CARD
// =====================================================
// FILE:
// src/components/financial/SimulationHistoryCard.tsx
//
// PURPOSE
// -----------------------------------------------------
// Executive-level historical simulation intelligence.
//
// FEATURES
// -----------------------------------------------------
// ✔ Historical simulation archive
// ✔ Best/worst simulation detection
// ✔ AI financial trend analysis
// ✔ Score movement indicators
// ✔ Risk visualization
// ✔ Stability ranking
// ✔ Executive insights
// ✔ Selection support
// ✔ Compare-ready architecture
// ✔ Zero conditional hooks
// ✔ Zero unsafe numeric rendering
// ✔ Zero unstable memo dependencies
// ✔ Zero invalid dates
// ✔ Production-safe rendering
//
// =====================================================

import React, {
  useMemo,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import {
  Feather,
} from "@expo/vector-icons";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

import type {
  FinancialSimulation,
  ScenarioResult,
} from "../../../src/types/financial";

/* =====================================================
   TYPES
===================================================== */

interface Props {
  simulations?: FinancialSimulation[];

  selectedIds?: string[];

  onToggleSelect?: (
    id: string
  ) => void;

  onDelete?: (
    id: string
  ) => void;
}

type TrendDirection =
  | "up"
  | "down"
  | "stable";

interface AnalyticsResult {
  average: number;

  best:
    | FinancialSimulation
    | null;

  worst:
    | FinancialSimulation
    | null;

  trend: TrendDirection;
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

function safeString(
  value: unknown,
  fallback = ""
): string {

  if (
    typeof value === "string"
  ) {

    return value;
  }

  return fallback;
}

function safeDate(
  value: unknown
): number {

  const parsed =
    new Date(
      safeString(value)
    ).getTime();

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function getSimulationScore(
  simulation?:
    | FinancialSimulation
    | null
): number {

  if (!simulation) {
    return 0;
  }

  const scenario =
    simulation.result
      ?.engines
      ?.scenarios
      ?.scenario_results?.[0] as
      | ScenarioResult
      | undefined;

  return Math.round(
    safeNumber(
      scenario
        ?.global_financial_score ??
        simulation.result
          ?.global_financial_score
    )
  );
}

function getScoreColor(
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

function formatDate(
  date?: string
): string {

  if (!date) {
    return "Unknown";
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return "Unknown";
  }

  return parsed.toLocaleDateString();
}

function buildSummary({
  trend,
  average,
}: {
  trend: TrendDirection;
  average: number;
}) {

  if (trend === "up") {

    return `Historical simulation analysis indicates improving long-term financial resilience trends with an average projected stability score of ${average}.`;
  }

  if (trend === "down") {

    return `Historical modeling suggests declining financial resilience patterns and increasing long-term pressure exposure with an average score of ${average}.`;
  }

  return `Historical simulations remain relatively stable overall with moderate long-term resilience consistency and an average projected score of ${average}.`;
}

/* =====================================================
   COMPONENT
===================================================== */

export default function SimulationHistoryCard({
  simulations = [],
  selectedIds = [],
  onToggleSelect,
  onDelete,
}: Props) {

  const { theme } =
    useTheme();

  /* ===================================================
     SAFE SORTED DATA
  =================================================== */

  const sorted =
    useMemo<
      FinancialSimulation[]
    >(() => {

      if (
        !Array.isArray(
          simulations
        )
      ) {

        return [];
      }

      return [...simulations]
        .filter(Boolean)
        .sort(
          (a, b) =>
            safeDate(
              b?.created_at
            ) -
            safeDate(
              a?.created_at
            )
        );

    }, [simulations]);

  /* ===================================================
     ANALYTICS
  =================================================== */

  const analytics =
    useMemo<AnalyticsResult>(() => {

      if (
        sorted.length === 0
      ) {

        return {
          average: 0,
          best: null,
          worst: null,
          trend: "stable",
        };
      }

      const scores =
        sorted.map(
          (simulation) =>
            getSimulationScore(
              simulation
            )
        );

      const total =
        scores.reduce(
          (
            sum,
            value
          ) =>
            sum +
            safeNumber(
              value
            ),
          0
        );

      const average =
        Math.round(
          total /
            Math.max(
              scores.length,
              1
            )
        );

      const best =
        sorted.reduce(
          (
            previous,
            current
          ) => {

            return getSimulationScore(
              current
            ) >
              getSimulationScore(
                previous
              )
              ? current
              : previous;
          }
        );

      const worst =
        sorted.reduce(
          (
            previous,
            current
          ) => {

            return getSimulationScore(
              current
            ) <
              getSimulationScore(
                previous
              )
              ? current
              : previous;
          }
        );

      const latest =
        scores[0] ?? 0;

      const oldest =
        scores[
          scores.length - 1
        ] ?? 0;

      let trend:
        | "up"
        | "down"
        | "stable" =
        "stable";

      if (
        latest - oldest > 5
      ) {

        trend = "up";
      }

      if (
        oldest - latest > 5
      ) {

        trend = "down";
      }

      return {
        average,
        best,
        worst,
        trend,
      };

    }, [sorted]);

  /* ===================================================
     SUMMARY
  =================================================== */

  const summary =
    useMemo(() => {

      return buildSummary({
        trend:
          analytics.trend,
        average:
          analytics.average,
      });

    }, [
      analytics.average,
      analytics.trend,
    ]);

  /* ===================================================
     EMPTY STATE
  =================================================== */

  if (
    sorted.length === 0
  ) {

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

          No simulation history available

        </Text>

      </View>
    );
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
                  `${theme.colors.primary}15`,
              },
            ]}
          >

            <Feather
              name="clock"
              size={18}
              color={
                theme.colors.primary
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

              Simulation Archive

            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    theme.colors
                      .textSecondary,

                  fontFamily:
                    theme.fonts.primary,
                },
              ]}
            >

              Historical financial intelligence

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
      {/* STATS */}
      {/* ============================================= */}

      <View style={styles.statsRow}>

        <StatCard
          label="Average"
          value={`${analytics.average}`}
          icon="activity"
          color="#0A84FF"
        />

        <StatCard
          label="Best"
          value={`${getSimulationScore(
            analytics.best
          )}`}
          icon="award"
          color="#30D158"
        />

        <StatCard
          label="Worst"
          value={`${getSimulationScore(
            analytics.worst
          )}`}
          icon="alert-triangle"
          color="#FF453A"
        />

      </View>

      {/* ============================================= */}
      {/* HISTORY */}
      {/* ============================================= */}

      <View
        style={
          styles.historyWrapper
        }
      >

        {sorted.map(
          (
            simulation,
            index
          ) => {

            const simulationId =
              safeString(
                simulation?.id,
                `simulation-${index}`
              );

            const score =
              getSimulationScore(
                simulation
              );

            const risk =
              safeString(
                simulation
                  ?.result
                  ?.risk_level,
                "moderate"
              );

            const color =
              getScoreColor(
                score
              );

            const isSelected =
              selectedIds.includes(
                simulationId
              );

            const previous =
              sorted[index + 1];

            const previousScore =
              previous
                ? getSimulationScore(
                    previous
                  )
                : score;

            const delta =
              score -
              previousScore;

            return (

              <TouchableOpacity
                key={
                  simulationId
                }
                activeOpacity={
                  0.9
                }
                onPress={() =>
                  onToggleSelect?.(
                    simulationId
                  )
                }
                style={[
                  styles.historyCard,
                  {
                    backgroundColor:
                      theme.colors
                        .background,

                    borderColor:
                      isSelected
                        ? color
                        : theme.colors
                            .divider,
                  },
                ]}
              >

                {/* ================================= */}
                {/* TOP */}
                {/* ================================= */}

                <View
                  style={
                    styles.cardTop
                  }
                >

                  <View
                    style={
                      styles.cardInfo
                    }
                  >

                    <Text
                      style={[
                        styles.simTitle,
                        {
                          color:
                            theme.colors
                              .text,

                          fontFamily:
                            theme.fonts
                              .display,
                        },
                      ]}
                    >

                      {safeString(
                        simulation?.name,
                        "Untitled Simulation"
                      )}

                    </Text>

                    <Text
                      style={[
                        styles.simMeta,
                        {
                          color:
                            theme.colors
                              .textSecondary,

                          fontFamily:
                            theme.fonts
                              .primary,
                        },
                      ]}
                    >

                      $
                      {safeNumber(
                        simulation?.amount
                      ).toLocaleString()}
                      {" / "}
                      {safeNumber(
                        simulation?.term
                      )}
                      {" months"}

                    </Text>

                  </View>

                  <View
                    style={
                      styles.scoreWrap
                    }
                  >

                    <Text
                      style={[
                        styles.score,
                        {
                          color,

                          fontFamily:
                            theme.fonts
                              .display,
                        },
                      ]}
                    >

                      {score}

                    </Text>

                    <View
                      style={
                        styles.deltaRow
                      }
                    >

                      <Feather
                        name={
                          delta >= 0
                            ? "trending-up"
                            : "trending-down"
                        }
                        size={12}
                        color={
                          delta >= 0
                            ? "#30D158"
                            : "#FF453A"
                        }
                      />

                      <Text
                        style={[
                          styles.deltaText,
                          {
                            color:
                              delta >= 0
                                ? "#30D158"
                                : "#FF453A",
                          },
                        ]}
                      >

                        {delta >= 0
                          ? "+"
                          : ""}
                        {delta}

                      </Text>

                    </View>

                  </View>

                </View>

                {/* ================================= */}
                {/* BADGES */}
                {/* ================================= */}

                <View
                  style={
                    styles.badgeRow
                  }
                >

                  <Badge
                    label={`${risk} risk`}
                    color={color}
                  />

                  <Badge
                    label={safeString(
                      simulation?.category,
                      "General"
                    )}
                    color="#0A84FF"
                  />

                </View>

                {/* ================================= */}
                {/* FOOTER */}
                {/* ================================= */}

                <View
                  style={
                    styles.footer
                  }
                >

                  <Text
                    style={[
                      styles.date,
                      {
                        color:
                          theme.colors
                            .textSecondary,

                        fontFamily:
                          theme.fonts
                            .primary,
                      },
                    ]}
                  >

                    {formatDate(
                      simulation?.created_at
                    )}

                  </Text>

                  {onDelete && (

                    <TouchableOpacity
                      onPress={() =>
                        onDelete(
                          simulationId
                        )
                      }
                    >

                      <Feather
                        name="trash-2"
                        size={16}
                        color="#FF453A"
                      />

                    </TouchableOpacity>
                  )}

                </View>

              </TouchableOpacity>
            );
          }
        )}

      </View>

    </View>
  );
}

/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
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
        styles.statCard,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      <View
        style={[
          styles.statIcon,
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
          styles.statLabel,
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
          styles.statValue,
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
   BADGE
===================================================== */

function Badge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {

  return (

    <View
      style={[
        styles.badge,
        {
          backgroundColor:
            `${color}15`,
        },
      ]}
    >

      <Text
        style={[
          styles.badgeText,
          {
            color,
          },
        ]}
      >

        {label}

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

    emptyContainer: {
      marginTop: 24,
      borderRadius: 30,
      borderWidth: 1,
      paddingVertical: 40,
      paddingHorizontal: 20,
      alignItems: "center",
    },

    emptyText: {
      fontSize: 14,
      textAlign: "center",
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
      width: 44,
      height: 44,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
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

    statsRow: {
      marginTop: 22,
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 12,
    },

    statCard: {
      flex: 1,
      borderRadius: 20,
      padding: 14,
    },

    statIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },

    statLabel: {
      marginTop: 10,
      fontSize: 11,
    },

    statValue: {
      marginTop: 4,
      fontSize: 20,
    },

    historyWrapper: {
      marginTop: 24,
    },

    historyCard: {
      marginBottom: 16,
      borderRadius: 22,
      borderWidth: 1.5,
      padding: 18,
    },

    cardTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
    },

    cardInfo: {
      flex: 1,
      paddingRight: 12,
    },

    scoreWrap: {
      alignItems: "flex-end",
    },

    simTitle: {
      fontSize: 17,
    },

    simMeta: {
      marginTop: 4,
      fontSize: 12,
    },

    score: {
      fontSize: 34,
    },

    deltaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },

    deltaText: {
      marginLeft: 4,
      fontSize: 12,
    },

    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18,
    },

    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },

    badgeText: {
      fontSize: 11,
      fontWeight: "600",
    },

    footer: {
      marginTop: 18,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    date: {
      fontSize: 12,
    },
  });