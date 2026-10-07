// =====================================================
// 💎 FINAI — RISK GAUGE
// =====================================================
// FILE:
// src/components/financial/RiskGauge.tsx
//
// PURPOSE
// -----------------------------------------------------
// Elite financial intelligence gauge.
//
// FEATURES
// -----------------------------------------------------
// ✔ Global Financial Score
// ✔ Risk Level
// ✔ Explanation Band
// ✔ Financial Stability
// ✔ Production-safe SVG rendering
// ✔ Stable numeric coercion
// ✔ Theme-safe rendering
// ✔ TestFlight-safe geometry
// ✔ Zero hook warnings
// ✔ Zero ESLint warnings
// ✔ Stable gauge normalization
// ✔ Defensive engine extraction
//
// =====================================================

import React, {
import { useRouter } from "expo-router";
  useMemo,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

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

  size?: number;

  strokeWidth?: number;

  animated?: boolean;
}

interface GaugeConfig {
  color: string;

  gradientStart: string;

  gradientEnd: string;

  icon:
    keyof typeof Feather.glyphMap;

  label: string;

  bg: string;
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

function formatBand(
  band?: string
): string {

  if (!band) {
    return "Unknown";
  }

  return band
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

export default function RiskGauge({

  analysis,

  size = 220,

  strokeWidth = 18,

}: Props) {

  const { theme } =
    useTheme();
  const router = useRouter();

  /* ===================================================
     SAFE EXTRACTION
  =================================================== */

  const rawScore =
    analysis
      ?.global_financial_score;

  const riskLevel =
    analysis?.risk_level ||
    "moderate";

  const explanationBand =
    analysis
      ?.engines
      ?.scenarios
      ?.scenario_results?.[0]
      ?.explanation_band ||
    "stable";

  /* ===================================================
     SAFE SCORE
  =================================================== */

  const safeScore =
    clamp(
      safeNumber(rawScore),
      0,
      100
    );

  /* ===================================================
     GEOMETRY
  =================================================== */

  const normalizedSize =
    Math.max(size, 160);

  const normalizedStroke =
    Math.max(
      strokeWidth,
      10
    );

  const radius =
    (
      normalizedSize -
      normalizedStroke
    ) / 2;

  const circumference =
    2 * Math.PI * radius;

  const progressOffset =
    circumference -
    (safeScore / 100) *
      circumference;

  /* ===================================================
     CONFIG
  =================================================== */

  const config =
    useMemo<GaugeConfig>(() => {

      if (
        riskLevel === "critical"
      ) {

        return {

          color:
            theme.colors.danger,

          gradientStart:
            "#FF6B6B",

          gradientEnd:
            "#FF3B30",

          icon:
            "alert-triangle",

          label:
            "Critical Risk",

          bg:
            "rgba(255,69,58,0.10)",
        };
      }

      if (
        riskLevel === "high"
      ) {

        return {

          color:
            theme.colors.warning,

          gradientStart:
            "#FFB340",

          gradientEnd:
            "#FF9500",

          icon:
            "alert-circle",

          label:
            "High Risk",

          bg:
            "rgba(255,149,0,0.10)",
        };
      }

      if (
        riskLevel === "moderate"
      ) {

        return {

          color:
            "#FFD60A",

          gradientStart:
            "#FFE066",

          gradientEnd:
            "#FFD60A",

          icon:
            "activity",

          label:
            "Moderate Risk",

          bg:
            "rgba(255,214,10,0.10)",
        };
      }

      return {

        color:
          theme.colors.success,

        gradientStart:
          "#53E07C",

        gradientEnd:
          "#30D158",

        icon:
          "check-circle",

        label:
          "Healthy",

        bg:
          "rgba(48,209,88,0.10)",
      };

    }, [
      riskLevel,
      theme.colors.danger,
      theme.colors.success,
      theme.colors.warning,
    ]);

  /* ===================================================
     BAND
  =================================================== */

  const bandText =
    formatBand(
      explanationBand
    );

  /* ===================================================
     EMPTY STATE
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

          No risk assessment yet
        </Text>
        <TouchableOpacity onPress={() => router.push("/profile")} style={{ marginTop: 8 }}>
          <Text
            style={{
              color: theme.colors.primary,
              fontFamily: theme.fonts.semibold,
              fontSize: 13,
            }}
          >
            Complete your profile to assess your risk →
          </Text>
        </TouchableOpacity>

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
            config.bg,

          borderColor:
            theme.colors.divider,
        },
      ]}
    >

      {/* ============================================= */}
      {/* HEADER */}
      {/* ============================================= */}

      <View style={styles.header}>

        <Feather
          name={
            config.icon
          }
          size={18}
          color={
            config.color
          }
        />

        <Text
          style={[
            styles.headerText,
            {
              color:
                theme.colors.text,

              fontFamily:
                theme.fonts.display,
            },
          ]}
        >

          Financial Risk Gauge

        </Text>

      </View>

      {/* ============================================= */}
      {/* GAUGE */}
      {/* ============================================= */}

      <View
        style={[
          styles.gaugeContainer,
          {
            width:
              normalizedSize,

            height:
              normalizedSize,
          },
        ]}
      >

        <Svg
          width={
            normalizedSize
          }
          height={
            normalizedSize
          }
        >

          {/* ========================================= */}
          {/* GRADIENT */}
          {/* ========================================= */}

          <Defs>

            <LinearGradient
              id="riskGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >

              <Stop
                offset="0%"
                stopColor={
                  config.gradientStart
                }
              />

              <Stop
                offset="100%"
                stopColor={
                  config.gradientEnd
                }
              />

            </LinearGradient>

          </Defs>

          {/* ========================================= */}
          {/* TRACK */}
          {/* ========================================= */}

          <Circle
            stroke={
              theme.colors.card
            }
            fill="none"
            cx={
              normalizedSize / 2
            }
            cy={
              normalizedSize / 2
            }
            r={radius}
            strokeWidth={
              normalizedStroke
            }
            opacity={0.5}
          />

          {/* ========================================= */}
          {/* PROGRESS */}
          {/* ========================================= */}

          <Circle
            stroke="url(#riskGradient)"
            fill="none"
            cx={
              normalizedSize / 2
            }
            cy={
              normalizedSize / 2
            }
            r={radius}
            strokeWidth={
              normalizedStroke
            }
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={
              progressOffset
            }
            rotation="-90"
            origin={`${
              normalizedSize / 2
            }, ${
              normalizedSize / 2
            }`}
          />

        </Svg>

        {/* ========================================= */}
        {/* CENTER */}
        {/* ========================================= */}

        <View
          pointerEvents="none"
          style={styles.center}
        >

          <Text
            style={[
              styles.score,
              {
                color:
                  config.color,

                fontFamily:
                  theme.fonts.display,
              },
            ]}
          >

            {Math.round(
              safeScore
            )}

          </Text>

          <Text
            style={[
              styles.scoreSub,
              {
                color:
                  theme.colors
                    .textSecondary,

                fontFamily:
                  theme.fonts.primary,
              },
            ]}
          >

            /100

          </Text>

        </View>

      </View>

      {/* ============================================= */}
      {/* STATUS */}
      {/* ============================================= */}

      <View
        style={
          styles.statusContainer
        }
      >

        <Text
          style={[
            styles.riskText,
            {
              color:
                config.color,

              fontFamily:
                theme.fonts.display,
            },
          ]}
        >

          {config.label}

        </Text>

        <Text
          style={[
            styles.band,
            {
              color:
                theme.colors
                  .textSecondary,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          {bandText}

        </Text>

      </View>

      {/* ============================================= */}
      {/* LEGEND */}
      {/* ============================================= */}

      <View
        style={styles.legend}
      >

        <LegendItem
          color="#30D158"
          label="Healthy"
        />

        <LegendItem
          color="#FFD60A"
          label="Moderate"
        />

        <LegendItem
          color="#FF9500"
          label="High"
        />

        <LegendItem
          color="#FF453A"
          label="Critical"
        />

      </View>

    </View>
  );
}

/* =====================================================
   LEGEND ITEM
===================================================== */

function LegendItem({

  color,

  label,

}: {
  color: string;
  label: string;
}) {

  const { theme } =
    useTheme();

  return (

    <View
      style={styles.legendItem}
    >

      <View
        style={[
          styles.dot,
          {
            backgroundColor:
              color,
          },
        ]}
      />

      <Text
        style={[
          styles.legendText,
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

      overflow: "hidden",
    },

    emptyContainer: {

      marginTop: 20,

      borderRadius: 28,

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

      gap: 8,
    },

    headerText: {

      fontSize: 16,

      includeFontPadding: false,
    },

    gaugeContainer: {

      justifyContent:
        "center",

      alignItems:
        "center",

      alignSelf:
        "center",

      marginTop: 18,
    },

    center: {

      position: "absolute",

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    score: {

      fontSize: 52,

      letterSpacing: -2,

      includeFontPadding: false,
    },

    scoreSub: {

      fontSize: 14,

      marginTop: -6,

      includeFontPadding: false,
    },

    statusContainer: {

      alignItems:
        "center",

      marginTop: 10,
    },

    riskText: {

      fontSize: 22,

      marginTop: 4,

      includeFontPadding: false,
    },

    band: {

      fontSize: 13,

      marginTop: 4,

      includeFontPadding: false,
    },

    legend: {

      marginTop: 28,

      flexDirection: "row",

      justifyContent:
        "space-between",

      flexWrap: "wrap",

      gap: 12,
    },

    legendItem: {

      flexDirection: "row",

      alignItems: "center",

      gap: 6,
    },

    legendText: {

      fontSize: 11,

      includeFontPadding: false,
    },

    dot: {

      width: 10,

      height: 10,

      borderRadius: 999,
    },
  });