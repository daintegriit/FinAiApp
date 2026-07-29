// =====================================================
// 💎 FINAI — DASHBOARD HEADER
// =====================================================
// FILE:
// src/components/header/DashboardHeader.tsx
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
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  Feather,
} from "@expo/vector-icons";

import {
  useRouter,
} from "expo-router";

import Globe from "./Globe";

import {
  useFinanceStore,
} from "../../../src/store/financeStore";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

import TransactionTicker from "../../../src/components/dashboard/TransactionTicker";

import type {
  Transaction,
} from "../../../src/services/transactions";

import MonthlySummary
from "../../../src/components/dashboard/MonthlySummary";

/* =====================================================
   TYPES
===================================================== */

type Props = {
  hideSettings?: boolean;
  showBackButton?: boolean;
};
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

function formatNumber(
  num: number
): string {

  if (!Number.isFinite(num)) {
    return "0";
  }

  return Math.abs(num)
    .toLocaleString(
      undefined,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    );
}

/* =====================================================
   COMPONENT
===================================================== */

export default function DashboardHeader({
  hideSettings = false,
  showBackButton = false,
}: Props) {

  const router =
    useRouter();

  const { theme } =
    useTheme();

  /* ===================================================
     STORE
  =================================================== */

  const transactions =
    useFinanceStore(
      (s) =>
        Array.isArray(
          s.transactions
        )
          ? s.transactions
          : []
    );

  const income =
    useFinanceStore(
      (s) =>
        safeNumber(
          s.income
        )
    );

  const categories =
    useFinanceStore(
      (s) =>
        Array.isArray(
          s.userCategoryGrid
        )
          ? s.userCategoryGrid
          : []
    );

  /* ===================================================
     DATE
  =================================================== */

  const now =
    useMemo(
      () => new Date(),
      []
    );

  const currentMonth =
    now.getMonth();

  const currentYear =
    now.getFullYear();

  /* ===================================================
     MONTHLY TRANSACTIONS
  =================================================== */

  const monthlyTransactions =
    useMemo<Transaction[]>(() => {

      return transactions.filter(
        (t) => {

          if (
            !t?.created_at
          ) {
            return false;
          }

          const date =
            new Date(
              t.created_at
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return false;
          }

          return (
            date.getMonth() ===
              currentMonth &&
            date.getFullYear() ===
              currentYear
          );
        }
      );

    }, [
      transactions,
      currentMonth,
      currentYear,
    ]);

  /* ===================================================
     SPENDING
  =================================================== */

  const spending =
    useMemo(() => {

      return monthlyTransactions.reduce(
        (sum, tx) => {

          return (
            sum +
            Math.max(
              safeNumber(
                tx.amount
              ),
              0
            )
          );

        },
        0
      );

    }, [
      monthlyTransactions,
    ]);

  /* ===================================================
     BUDGET
  =================================================== */

  const totalBudget =
    useMemo(() => {

      return categories.reduce(
        (sum, category) => {

          return (
            sum +
            Math.max(
              safeNumber(
                category.budget
              ),
              0
            )
          );

        },
        0
      );

    }, [categories]);

  /* ===================================================
     REMAINING
  =================================================== */

  const remaining =
    useMemo(() => {

      return income - spending;

    }, [
      income,
      spending,
    ]);

  /* ===================================================
     UI
  =================================================== */

  return (

    <SafeAreaView
      edges={["top"]}
      style={{
        backgroundColor:
          theme.colors.background,
      }}
    >

      <View
        style={[
          styles.container,
          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >

        {/* ========================================== */}
        {/* HEADER */}
        {/* ========================================== */}

        <View
          style={styles.headerRow}
        >

          {showBackButton ? (

            <TouchableOpacity

              activeOpacity={0.8}

              onPress={() =>
                router.back()
              }

              style={[
                styles.iconButton,
                {
                  borderColor:
                    theme.colors.border,

                  backgroundColor:
                    theme.colors.card,
                },
              ]}
            >

              <Feather
                name="chevron-left"
                size={20}
                color={
                  theme.colors.text
                }
              />

            </TouchableOpacity>

          ) : !hideSettings ? (

            <TouchableOpacity

              activeOpacity={0.8}

              onPress={() =>
                router.push(
                  "/settings"
                )
              }

              style={[
                styles.iconButton,
                {
                  borderColor:
                    theme.colors.border,

                  backgroundColor:
                    theme.colors.card,
                },
              ]}
            >

              <Feather
                name="settings"
                size={20}
                color={
                  theme.colors.text
                }
              />

            </TouchableOpacity>

          ) : (

            <View
              style={
                styles.hiddenSpacer
              }
            />

          )}

          {/* ====================================== */}
          {/* BRAND */}
          {/* ====================================== */}

          <View
            style={
              styles.titleWrapper
            }
          >

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
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

              FinBudgetAI

            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    theme.colors
                      .textMuted,

                  fontFamily:
                    theme.fonts
                      .primary,
                },
              ]}
            >

              Financial Intelligence

            </Text>

          </View>

          {/* ====================================== */}
          {/* GLOBE */}
          {/* ====================================== */}

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/(tabs)/peers" as any)}
            style={[
              styles.globeWrapper,
              {
                borderColor:
                  theme.colors.border,
                backgroundColor:
                  theme.colors.card,
              },
            ]}
          >
            <Globe size={52} />
          </TouchableOpacity>

        </View>

        {/* ========================================== */}
        {/* METRICS */}
        {/* ========================================== */}

        <View
          style={styles.metricsRow}
        >

          <Metric
            label="Spending"
            value={spending}
          />

          <Metric
            label="Budget"
            value={totalBudget}
            isBudget
          />

          <Metric
            label="Remaining"
            value={remaining}
            isRemaining
          />

          <Metric
            label="Income"
            value={income}
          />

        </View>

        {/* ========================================== */}
        {/* TICKER */}
        {/* ========================================== */}

        <TransactionTicker />

        {/* ========================================== */}
        {/* TICKER */}
        {/* ========================================== */}

        <MonthlySummary />

      </View>

    </SafeAreaView>
  );
}

/* =====================================================
   METRIC
===================================================== */

function Metric({
  label,
  value,
  isRemaining = false,
  isBudget = false,
}: {
  label: string;
  value: number;
  isRemaining?: boolean;
  isBudget?: boolean;
}) {

  const { theme } =
    useTheme();

  let color =
    theme.colors.text;

  if (isRemaining) {

    color =
      value < 0
        ? theme.colors.danger
        : theme.colors.success;
  }

  if (isBudget) {

    color =
      theme.colors.chart2;
  }

  return (

    <View
      style={styles.metricBox}
    >

      <Text
        style={[
          styles.metricLabel,
          {
            color:
              theme.colors
                .textMuted,

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
          styles.metricAmount,
          {
            color,

            fontFamily:
              theme.fonts.semibold,
          },
        ]}
      >

        $
        {formatNumber(value)}

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

      paddingHorizontal: 16,

      paddingTop: 0,

      paddingBottom: 6,
    },

    /* =============================================== */
    /* HEADER BAR */
    /* =============================================== */

    headerRow: {

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",

      position: "relative",

      height: 56,

      marginBottom: 10,
    },
        /* =============================================== */
    /* SETTINGS BUTTON */
    /* =============================================== */

    iconButton: {

      width: 44,

      height: 44,

      borderRadius: 14,

      borderWidth: 1,

      justifyContent: "center",

      alignItems: "center",

      zIndex: 2, // 🔥 Keeps tap registration prioritized
    },

    hiddenSpacer: {

      width: 44,

      height: 44,
    },

    /* =============================================== */
    /* TITLE WRAPPER (TRUE ABSOLUTE CENTERING) */
    /* =============================================== */

    titleWrapper: {

      position: "absolute", // 🔥 Detaches layout from surrounding nodes

      left: 0,

      right: 0,

      top: 0,

      bottom: 0,

      justifyContent: "center", // 🔥 Vertically centers strings

      alignItems: "center", // 🔥 Horizontally centers strings

      zIndex: 1, // 🔥 Sits cleanly underneath icon touch vectors
    },

    title: {

      fontSize: 22,

      letterSpacing: -0.5,

      textAlign: "center", // 🔥 Forces multi-line balance centering
    },

    subtitle: {

      fontSize: 11,

      marginTop: 1,

      textAlign: "center", // 🔥 Forces subtitle string alignment centering
    },

    /* =============================================== */
    /* GLOBE WRAPPER */
    /* =============================================== */

    globeWrapper: {

      width: 56,

      height: 56,

      borderRadius: 28,

      borderWidth: 1,

      justifyContent: "center",

      alignItems: "center",

      overflow: "hidden",

      zIndex: 2, // 🔥 Ensures touch gestures hit your 3D OrbitControls
    },

    /* =============================================== */
    /* METRICS SHEET */
    /* =============================================== */

    metricsRow: {

      flexDirection: "row",

      justifyContent: "space-between",

      gap: 8,
    },

    metricBox: {

      flex: 1,

      alignItems: "center", // Keeps bottom numbers left-aligned per your design
    },

    metricLabel: {

      fontSize: 11,

      textTransform: "uppercase",

      letterSpacing: 0.3,

      marginBottom: 2,
    },

    metricAmount: {

      fontSize: 15,
    },
  });
