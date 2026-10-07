// =====================================================
// 💎 FINAI — SPENDING TREND (elite)
// =====================================================
// Fixes the flat-line bug: instead of a hardcoded "last 14 days
// from today" window (which misses data dated outside it), the
// trend is built from the 14-day window ending on the user's most
// recent transaction — so real spending always shows. Adds an area
// fill, a period total, and a direction indicator.

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  CartesianChart,
  Line,
  Area,
  useChartPressState,
} from "victory-native";
import { Circle, useFont } from "@shopify/react-native-skia";
import { useFinanceStore } from "../../../src/store/financeStore";
import { useTheme } from "../../../src/theme/ThemeContext";

type TrendPoint = { day: string; amount: number };

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmtDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(iso: string): Date {
  const hasTz = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
  return new Date(hasTz ? iso : `${iso}Z`);
}

// Build a 14-day daily-spend series ending on the most recent
// transaction date (not "today"), so data is always in-window.
function buildDailyTrend(transactions: any[]): TrendPoint[] {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];

  // Find the latest transaction date.
  let latest = 0;
  for (const tx of transactions) {
    const raw = tx.created_at || tx.date;
    if (!raw) continue;
    const t = parseDate(String(raw)).getTime();
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  const anchor = latest > 0 ? new Date(latest) : new Date();

  // Pre-sum spend per day key for speed.
  const perDay: Record<string, number> = {};
  for (const tx of transactions) {
    const raw = tx.created_at || tx.date;
    if (!raw) continue;
    const key = fmtDateKey(parseDate(String(raw)));
    perDay[key] = (perDay[key] || 0) + Math.abs(safeNumber(tx.amount));
  }

  const days: TrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(anchor);
    date.setDate(date.getDate() - i);
    const key = fmtDateKey(date);
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    days.push({ day: label, amount: Math.round((perDay[key] || 0) * 100) / 100 });
  }
  return days;
}

export default function SpendingTrend() {
  const { theme } = useTheme();
  const transactions = useFinanceStore((state) => state.transactions);

  const trendData = useMemo<TrendPoint[]>(
    () => buildDailyTrend(transactions),
    [transactions]
  );

  const total = useMemo(
    () => trendData.reduce((s, p) => s + p.amount, 0),
    [trendData]
  );

  // Direction: compare the back half vs the front half of the window.
  const direction = useMemo(() => {
    if (trendData.length < 4) return 0;
    const half = Math.floor(trendData.length / 2);
    const first = trendData.slice(0, half).reduce((s, p) => s + p.amount, 0);
    const second = trendData.slice(half).reduce((s, p) => s + p.amount, 0);
    if (second > first * 1.05) return 1;
    if (second < first * 0.95) return -1;
    return 0;
  }, [trendData]);

  const { state, isActive } = useChartPressState({
    x: "",
    y: { amount: 0 },
  });

  const font = useFont(require("../../../assets/fonts/Unageo-Regular.ttf"), 10);
  const activeAmount = safeNumber(state.y.amount.value);

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
            { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
          ]}
        >
          No spending trend data yet
        </Text>
      </View>
    );
  }

  const dirColor =
    direction > 0
      ? theme.colors.danger
      : direction < 0
      ? theme.colors.success
      : theme.colors.textSecondary;
  const dirLabel =
    direction > 0 ? "Trending up" : direction < 0 ? "Trending down" : "Steady";

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
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
            ]}
          >
            Last 14 days · ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
          <Text
            style={[
              styles.direction,
              { color: dirColor, fontFamily: theme.fonts.semibold },
            ]}
          >
            {dirLabel}
          </Text>
        </View>
      </View>

      {isActive && (
        <View style={styles.activeContainer}>
          <Text
            style={[
              styles.activeLabel,
              { color: theme.colors.textSecondary, fontFamily: theme.fonts.primary },
            ]}
          >
            Selected day
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
          {({ points, chartBounds }) => (
            <>
              <Area
                points={points.amount}
                y0={chartBounds.bottom}
                color={theme.colors.chart4}
                opacity={0.14}
                animate={{ type: "timing", duration: 700 }}
              />
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

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    paddingTop: 18,
    paddingBottom: 14,
  },
  header: { paddingHorizontal: 18, marginBottom: 14 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  title: { fontSize: 20 },
  subtitle: { fontSize: 13 },
  direction: { fontSize: 12 },
  activeContainer: { paddingHorizontal: 18, marginBottom: 8 },
  activeLabel: { fontSize: 12 },
  activeValue: { marginTop: 4, fontSize: 24 },
  chartWrapper: { height: 260, paddingRight: 12 },
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
