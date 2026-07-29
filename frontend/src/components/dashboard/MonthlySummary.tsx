// =====================================================
// 💎 FINAI — MONTHLY SUMMARY
// =====================================================
// FILE:
// src/components/dashboard/MonthlySummary.tsx
//
// PURPOSE
// -----------------------------------------------------
// Executive financial intelligence summary strip.
//
// FEATURES
// -----------------------------------------------------
// ✔ Risk band display
// ✔ Financial score overview
// ✔ AI signal extraction
// ✔ Stable engine-safe access
// ✔ Theme-safe rendering
// ✔ Production-safe contracts
// ✔ TestFlight-safe rendering
//
// =====================================================

import React from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import {
  useFinanceStore,
} from "../../../src/store/financeStore";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

/* =====================================================
   COMPONENT
===================================================== */

export default function MonthlySummary() {

  const { theme } =
    useTheme();

  /* ===================================================
     STORE
  =================================================== */

  const analysis =
    useFinanceStore(
      (state) => state.analysis
    );

  /* ===================================================
     SAFE ANALYSIS
  =================================================== */

  const scenario =
    analysis
      ?.engines
      ?.scenarios
      ?.scenario_results?.[0];

  /* ===================================================
     SCORE
  =================================================== */

  const score =
    analysis
      ?.global_financial_score ??

    scenario
      ?.global_financial_score ??

    0;

  /* ===================================================
     BAND
  =================================================== */

  const band =
    analysis
      ?.risk_level ??

    scenario
      ?.explanation_band ??

    "N/A";

  /* ===================================================
     TOP SIGNAL
  =================================================== */

  const topRisk =

    scenario
      ?.key_risks?.[0] ||

    analysis
      ?.summary ||

    analysis
      ?.explanation ||

    "No major risks detected";

  /* ===================================================
     SCORE COLOR
  =================================================== */

  const scoreColor =

    score >= 75

      ? theme.colors.success

      : score >= 50

      ? theme.colors.warning

      : theme.colors.danger;

  /* ===================================================
     BAND COLOR
  =================================================== */

  const bandColor =
    getBandColor(
      band,
      theme
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
              theme.colors.background,

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
                theme.colors.textSecondary,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          No financial analysis available yet

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
            theme.colors.background,

          borderTopWidth: 1,

          borderBottomWidth: 1,

          borderColor:
            theme.colors.divider,
        },
      ]}
    >

      {/* ========================================== */}
      {/* RISK BAND */}
      {/* ========================================== */}

      <View
        style={styles.leftSummaryBox}
      >

        <Text

          style={[

            styles.label,

            {
              color:
                theme.colors.textSecondary,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          Risk {"\n"} Band

        </Text>

        <Text

          style={[

            styles.amount,

            {
              color:
                bandColor,

              fontFamily:
                theme.fonts.semibold,
            },
          ]}
        >

          {formatBand(band)}

        </Text>

      </View>

      {/* ========================================== */}
      {/* FINANCIAL SCORE */}
      {/* ========================================== */}

      <View
        style={styles.middleSummaryBox}
      >

        <Text

          style={[

            styles.label,

            {
              color:
                theme.colors.textSecondary,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          Financial {"\n"} Score

        </Text>

        <Text

          style={[

            styles.amount,

            {
              color:
                scoreColor,

              fontFamily:
                theme.fonts.semibold,
            },
          ]}
        >

          {Number(score).toFixed(0)}

        </Text>

      </View>

      {/* ========================================== */}
      {/* TOP SIGNAL */}
      {/* ========================================== */}

      <View
        style={styles.rightSummaryBox}
      >

        <Text

          style={[

            styles.label,

            {
              color:
                theme.colors.textSecondary,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          Top Signal

        </Text>

        <Text

          numberOfLines={2}

          style={[

            styles.smallText,

            {
              color:
                theme.colors.text,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          {topRisk}

        </Text>

      </View>

    </View>
  );
}

/* =====================================================
   HELPERS
===================================================== */

function formatBand(
  band: string
) {

  if (!band)
    return "N/A";

  switch (
    band.toLowerCase()
  ) {

    case "low":
      return "Low";

    case "moderate":
      return "Moderate";

    case "high":
      return "High";

    case "critical":
      return "Critical";

    case "improving":
      return "Improving";

    case "stable":
      return "Stable";

    case "early_drift":
      return "Early Drift";

    case "concerning_drift":
      return "Concerning";

    default:
      return band
        .replace(/_/g, " ");
  }
}

function getBandColor(
  band: string,
  theme: any
) {

  if (!band)
    return theme.colors.text;

  switch (
    band.toLowerCase()
  ) {

    case "low":
      return theme.colors.success;

    case "moderate":
      return theme.colors.warning;

    case "high":
      return theme.colors.danger;

    case "critical":
      return theme.colors.danger;

    case "improving":
      return theme.colors.success;

    case "stable":
      return theme.colors.chart2;

    case "early_drift":
      return theme.colors.warning;

    case "concerning_drift":
      return theme.colors.danger;

    default:
      return theme.colors.text;
  }
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {

      flexDirection: "row",

      justifyContent:
        "space-around",

      paddingVertical: 16,
    },

    emptyContainer: {

      paddingVertical: 24,

      alignItems: "center",

      borderTopWidth: 1,

      borderBottomWidth: 1,
    },

    emptyText: {

      fontSize: 14,
    },

    summaryBox: {

      alignItems: "center",

      maxWidth: 110,
    },

    /* =============================================== */
    /* 👈 TARGETED LEFT COLUMN SHIFT (RISK BAND) */
    /* =============================================== */
    leftSummaryBox: {

      alignItems: "center",

      maxWidth: 110,

      // Set to 0 by default. Change this number to nudge left (negative) or right (positive)
      transform: [{ translateX: 9 }], 
    },

    /* =============================================== */
    /* 🔥 TARGETED MIDDLE COLUMN SHIFT (FINANCIAL SCORE) */
    /* =============================================== */
    middleSummaryBox: {

      alignItems: "center",

      maxWidth: 110,

      // Nudges the entire column 14 pixels to the right to clear the "Top Signal" block
      transform: [{ translateX: 30 }], 
    },

    /* =============================================== */
    /* 👉 TARGETED RIGHT COLUMN SHIFT (TOP SIGNAL) */
    /* =============================================== */
    rightSummaryBox: {

      alignItems: "center",

      maxWidth: 110,

      // Set to 0 by default. Change this number to nudge left (negative) or right (positive)
      transform: [{ translateX: 25 }], 
    },
    
    label: {

      fontSize: 16,

      textAlign: "center",
    },

    amount: {

      fontSize: 20,

      marginTop: 6,
    },

    smallText: {

      fontSize: 13,

      marginTop: 6,

      textAlign: "center",

      lineHeight: 18,
    },
  });
