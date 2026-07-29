// =====================================================
// 💎 FINAI — SPENDING TREND
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
  CartesianChart,
  Line,
  useChartPressState,
} from "victory-native";

import {
  Circle,
  useFont,
} from "@shopify/react-native-skia";

import {
  useFinanceStore,
} from "../../../src/store/financeStore";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

/* =====================================================
   TYPES
===================================================== */

type TrendPoint = {
  day: string;
  amount: number;
};

/* =====================================================
   HELPERS
===================================================== */

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildDailyTrend(transactions: any[]): TrendPoint[] {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const now = new Date();
  const days: TrendPoint[] = [];

  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const label = date.toLocaleDateString("en-US", { weekday: "short" });

    const dayTotal = transactions
      .filter((tx) => {
        const txDate = tx.created_at || tx.date;
        if (!txDate) return false;
        return String(txDate).startsWith(dateStr);
      })
      .reduce((sum, tx) => sum + safeNumber(tx.amount), 0);

    days.push({ day: label, amount: dayTotal });
  }

  return days;
}

/* =====================================================
   COMPONENT
===================================================== */

export default function SpendingTrend() {

  const { theme } = useTheme();

  /* ===================================================
     STORE — derived from real transactions
  =================================================== */

  const transactions =
    useFinanceStore(
      (state) => state.transactions
    );

  const trendData =
    useMemo<TrendPoint[]>(() => {
      return buildDailyTrend(transactions);
    }, [transactions]);

  /* ===================================================
     CHART PRESS STATE
  =================================================== */

  const {
    state,
    isActive,
  } = useChartPressState({
    x: "",
    y: {
      amount: 0,
    },
  });

  /* ===================================================
     FONT
  =================================================== */

  const font =
    useFont(
      require("../../../assets/fonts/Unageo-Regular.ttf"),
      10
    );

  /* ===================================================
     ACTIVE VALUE
  =================================================== */

  const activeAmount =
    safeNumber(state.y.amount.value);

  /* ===================================================
     EMPTY STATE
  =================================================== */

  if (!trendData.length) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.divider,
          },
        ]}
      >
        <Text
          style={[
            styles.emptyText,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.fonts.primary,
            },
          ]}
        >
          No spending trend data available
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
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.divider,
        },
      ]}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: theme.colors.text, fontFamily: theme.fonts.display },
          ]}
        >
          Spending Trend
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
          ]}
        >
          Daily financial activity visualization
        </Text>
      </View>

      {isActive && (
        <View style={styles.activeContainer}>
          <Text
            style={[
              styles.activeLabel,
              { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
            ]}
          >
            Active Amount
          </Text>

          <Text
            style={[
              styles.activeValue,
              { color: theme.colors.chart4, fontFamily: theme.fonts.display },
            ]}
          >
            ${activeAmount.toFixed(2)}
          </Text>
        </View>
      )}

      <View style={styles.chartWrapper}>
        <CartesianChart
          data={trendData}
          xKey="day"
          yKeys={["amount"]}
          chartPressState={state}
          domainPadding={{ left: 24, right: 24, top: 20, bottom: 10 }}
          axisOptions={{
            font,
            tickCount: 5,
            labelColor: theme.colors.textSecondary,
            lineColor: theme.colors.divider,
          }}
        >
          {({ points }) => (
            <>
              <Line
                points={points.amount}
                color={theme.colors.chart4}
                strokeWidth={3}
                animate={{ type: "timing", duration: 700 }}
              />

              {isActive && (
                <Circle
                  cx={safeNumber(state.x.position)}
                  cy={safeNumber(state.y.amount.position)}
                  r={6}
                  color={theme.colors.chart4}
                />
              )}
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 18,
    paddingBottom: 14,
  },
  header: {
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  title: { fontSize: 20 },
  subtitle: { marginTop: 4, fontSize: 13 },
  activeContainer: {
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  activeLabel: { fontSize: 12 },
  activeValue: { marginTop: 4, fontSize: 24 },
  chartWrapper: {
    height: 260,
    paddingRight: 12,
  },
  emptyContainer: {
    marginTop: 20,
    paddingVertical: 30,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 14 },
});