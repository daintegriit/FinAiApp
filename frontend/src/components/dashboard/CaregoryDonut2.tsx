import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Svg, { G, Circle } from "react-native-svg";

import {
  useFinanceStore,
  DEFAULT_CATEGORIES,
} from "../../../src/store/financeStore";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

/* =====================================================
   TYPES
===================================================== */

type Mode =
  | "budget"
  | "spending";

type Props = {
  compact?: boolean;
  mode?: Mode;
};

type CategoryLike = {
  name?: string;
  budget?: number;
};

type TransactionLike = {
  category?: string;
  amount?: number;
};

interface DonutItem {
  name: string;
  value: number;
  realValue: number;
  percentage: number;
  color: string;
  hasSpending: boolean;
  budget: number;
  usagePercentage: number;
}

/* =====================================================
   HELPERS
===================================================== */

function normalize(
  value?: string
): string {

  return String(
    value || "other"
  )
    .trim()
    .toLowerCase();
}

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

export default function CategoryDonut({

  compact = false,

  mode = "budget",

}: Props) {

  const { theme } =
    useTheme();

  const [
    selectedSegment,
    setSelectedSegment,
  ] = useState<DonutItem | null>(
    null
  );

  /* ===================================================
     STORE ACCESS
  =================================================== */

  const transactions =
    useFinanceStore(
      (s) => s.transactions
    );

  const userCategories =
    useFinanceStore(
      (s) => s.userCategoryGrid
    );

  const income =
    useFinanceStore(
      (s) => s.income
    );

  /* ===================================================
     SAFE MEMOS
  =================================================== */

  const safeTransactions =
    useMemo<TransactionLike[]>(

      () =>

        Array.isArray(
          transactions
        )
          ? transactions
          : [],

      [transactions]
    );

  const safeCategories =
    useMemo<CategoryLike[]>(

      () =>

        Array.isArray(
          userCategories
        )
          ? userCategories
          : [],

      [userCategories]
    );

  const safeIncome =
    safeNumber(income);

  /* ===================================================
     SPENDING MAP
  =================================================== */

  const spendingMap =
    useMemo(() => {

      return safeTransactions.reduce(

        (
          acc: Record<
            string,
            number
          >,

          tx:
            TransactionLike
        ) => {

          const key =
            normalize(
              tx?.category
            );

          const amount =
            Math.abs(
              safeNumber(
                tx?.amount
              )
            );

          acc[key] =
            (acc[key] || 0) +
            amount;

          return acc;

        },

        {}
      );

    }, [safeTransactions]);

  /* ===================================================
     CATEGORY SYSTEM
  =================================================== */

  const allCategories =
    useMemo(() => {

      const merged = [

        ...DEFAULT_CATEGORIES,

        ...safeCategories,

      ];

      const map =
        new Map();

      merged.forEach(
        (cat: any) => {

          const normalized =
            normalize(
              cat.name
            );

          const spent =
            safeNumber(
              spendingMap[
                normalized
              ]
            );

          map.set(
            normalized,
            {

              ...cat,

              budget:
                safeNumber(
                  cat?.budget
                ),

              spent,

            }
          );
        }
      );

      return Array.from(
        map.values()
      );

    }, [
      safeCategories,
      spendingMap,
    ]);

  /* ===================================================
     DATA
  =================================================== */

  const data =
    useMemo<
      DonutItem[]
    >(() => {

      const isBudgetMode =
        mode ===
        "budget";

      const raw =
        allCategories.map(

          (
            cat,
            index
          ) => {

            const key =
              normalize(
                cat?.name
              );

            const value =
              safeNumber(
                spendingMap[
                  key
                ]
              );

            const budget =
              safeNumber(
                cat?.budget
              );

            const hasSpending =
              value > 0;

            const usagePercentage =

              budget > 0

                ? (
                    value /
                    budget
                  ) * 100

                : 0;

            const pieWeightValue =

              isBudgetMode
                ? budget
                : value;

            return {

              name:
                cat?.name ||
                "Other",

              value:
                pieWeightValue > 0
                  ? pieWeightValue
                  : 0,

              realValue:
                value,

              budget,

              usagePercentage,

              percentage: 0,

              color:
                getCategoryColor(
                  cat,
                  value,
                  theme,
                  mode,
                  index
                ),

              hasSpending,
            };
          }
        );

      const totalWeight =
        raw.reduce(

          (
            sum,
            item
          ) =>

            sum +
            safeNumber(
              item.value
            ),

          0
        );

      return raw
        .map((item) => ({

          ...item,

          percentage:

            totalWeight > 0

              ? (
                  safeNumber(
                    item.value
                  ) /
                  totalWeight
                ) * 100

              : 0,

        }))
        .filter((item) =>

          isBudgetMode
            ? item.budget > 0
            : item.realValue > 0
        );

    }, [
      allCategories,
      spendingMap,
      theme,
      mode,
    ]);

  /* ===================================================
     TOTALS
  =================================================== */

  const totalSpending =
    useMemo(() => {

      return data.reduce(

        (
          sum,
          item
        ) =>

          sum +
          item.realValue,

        0
      );

    }, [data]);

  const remaining =
    safeIncome -
    totalSpending;

  const remainingPercent =

    safeIncome > 0

      ? Math.max(
          0,
          Math.round(
            (
              remaining /
              safeIncome
            ) * 100
          )
        )

      : 0;

  /* ===================================================
     EMPTY STATE
  =================================================== */

  if (!data.length) {

    return (

      <View
        style={[
          styles.emptyContainer,
          {
            borderColor:
              theme.colors
                .divider,

            backgroundColor:
              theme.colors
                .background,
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
                theme.fonts
                  .primary,
            },
          ]}
        >

          No category data available

        </Text>

      </View>
    );
  }

  /* ===================================================
     DONUT DIMENSIONS
  =================================================== */

  const size =
    compact
      ? 220
      : 320;

  const strokeWidth =
    compact
      ? 20
      : 28;

  const radius =
    (size - strokeWidth) /
    2;

  const center =
    size / 2;

  const circumference =
    2 *
    Math.PI *
    radius;

  /* ===================================================
     SEGMENTS
  =================================================== */

  let cumulativePercentage = 0;

  const segments =
    data.map(
      (
        item,
        index
      ) => {

        const percentage =
          item.percentage / 100;

        const gapSize =
          data.length > 1
            ? 1.5
            : 0;

        const dashLength =
          Math.max(
            0,
            circumference *
              percentage -
              gapSize
          );

        const gapLength =
          circumference -
          dashLength;

        const rotation =
          cumulativePercentage *
            360 -
          90;

        cumulativePercentage +=
          percentage;

        return {

          key:
            `${item.name}-${index}`,

          color:
            item.color,

          strokeDasharray:
            `${dashLength} ${gapLength}`,

          rotation,

          item,
        };
      }
    );

  /* ===================================================
     REMAINING COLOR
  =================================================== */

  const remainingColor =

    remaining < 0

      ? theme.colors
          .danger

      : remaining <
        safeIncome * 0.2

      ? theme.colors
          .warning

      : theme.colors
          .success;

  /* ===================================================
     UI
  =================================================== */

  return (

    <View
      style={
        styles.wrapper
      }
    >

      {/* ============================================= */}
      {/* TOOLTIP */}
      {/* ============================================= */}

      {selectedSegment && (

        <Pressable
          style={[
            styles.segmentTooltip,
            {
              backgroundColor:
                theme.colors.card,

              borderColor:
                theme.colors.border,
            },
          ]}
          onPress={() =>
            setSelectedSegment(null)
          }
        >

          <View
            style={[
              styles.segmentTooltipDot,
              {
                backgroundColor:
                  selectedSegment.color,
              },
            ]}
          />

          <Text
            style={[
              styles.segmentTooltipTitle,
              {
                color:
                  theme.colors.text,

                fontFamily:
                  theme.fonts.semibold,
              },
            ]}
          >
            {selectedSegment.name}
          </Text>

          <Text
            style={[
              styles.segmentTooltipText,
              {
                color:
                  theme.colors.textSecondary,
              },
            ]}
          >
            $
            {Math.round(
              selectedSegment.realValue
            )}{" "}
            spent
          </Text>

          <Text
            style={[
              styles.segmentTooltipText,
              {
                color:
                  theme.colors.textSecondary,
              },
            ]}
          >
            $
            {Math.round(
              selectedSegment.budget
            )}{" "}
            budget
          </Text>

          <Text
            style={[
              styles.segmentTooltipText,
              {
                color:
                  selectedSegment.color,

                fontFamily:
                  theme.fonts.semibold,
              },
            ]}
          >
            {Math.round(
              selectedSegment.usagePercentage
            )}
            % used
          </Text>

        </Pressable>
      )}

      {/* ============================================= */}
      {/* DONUT */}
      {/* ============================================= */}

      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
          },
        ]}
      >

        <Svg
          width={size}
          height={size}
        >

          {/* TRACK */}

          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={
              theme.colors
                .divider
            }
            strokeWidth={
              strokeWidth
            }
            fill="transparent"
          />

          {/* SEGMENTS */}

          {segments.map(
            (segment) => (

              <G
                key={
                  segment.key
                }
                rotation={
                  segment.rotation
                }
                origin={`${center}, ${center}`}
              >

                {/* HITBOX */}

                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke="transparent"
                  strokeWidth={
                    strokeWidth + 18
                  }
                  fill="transparent"
                  strokeDasharray={
                    segment.strokeDasharray
                  }
                  strokeLinecap="round"
                  onPressIn={() =>
                    setSelectedSegment(
                      segment.item
                    )
                  }
                />

                {/* MAIN ARC */}

                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={
                    segment.color
                  }
                  strokeWidth={
                    strokeWidth
                  }
                  fill="transparent"
                  strokeDasharray={
                    segment.strokeDasharray
                  }
                  strokeLinecap="round"
                />

              </G>
            )
          )}

        </Svg>

        {/* ========================================= */}
        {/* CENTER */}
        {/* ========================================= */}

        <View
          pointerEvents="none"
          style={
            styles.centerContent
          }
        >

          <Text
            style={[
              styles.remainingValue,
              {
                color:
                  remainingColor,

                fontSize:
                  compact
                    ? 34
                    : 48,

                fontFamily:
                  theme.fonts
                    .accent2,
              },
            ]}
          >

            {remaining < 0

              ? `-$${Math.abs(
                  Math.round(
                    remaining
                  )
                ).toLocaleString()}`

              : `$${Math.round(
                  remaining
                ).toLocaleString()}`}

          </Text>

          <Text
            style={[
              styles.remainingLabel,
              {
                color:
                  theme.colors
                    .textSecondary,

                fontSize:
                  compact
                    ? 12
                    : 15,

                fontFamily:
                  theme.fonts
                    .primary,
              },
            ]}
          >

            {remaining < 0

              ? "OVER BUDGET"

              : `${remainingPercent}% LEFT`}

          </Text>

        </View>

      </View>

      {/* ============================================= */}
      {/* LEGEND */}
      {/* ============================================= */}

      <View
        style={
          styles.legendContainer
        }
      >

        {data
          .sort(
            (a, b) =>
              b.budget -
              a.budget
          )
          .slice(0, 4)
          .map((item) => (

            <Pressable
              key={item.name}
              style={
                styles.legendRow
              }
              onPress={() =>
                setSelectedSegment(
                  item
                )
              }
            >

              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor:
                      item.color,
                  },
                ]}
              />

              <Text
                style={[
                  styles.legendText,
                  {
                    color:
                      theme.colors
                        .text,

                    fontFamily:
                      theme.fonts
                        .primary,
                  },
                ]}
              >

                {item.name}
                {" "}
                (
                {Math.round(
                  item.usagePercentage
                )}
                %)

              </Text>

            </Pressable>
          ))}

      </View>

    </View>
  );
}

/* =====================================================
   COLOR ENGINE
===================================================== */

function getCategoryColor(

  cat: any,

  value: number,

  theme: any,

  mode: Mode,

  index: number

): string {

  const budget =
    safeNumber(
      cat?.budget
    );

  /* ================================================
     SPENDING MODE
  ================================================= */

  if (
    mode ===
    "spending"
  ) {

    const palette = [

      theme.colors.chart1 ||
        "#36A2EB",

      theme.colors.chart2 ||
        "#FF6384",

      theme.colors.chart3 ||
        "#FFCE56",

      theme.colors.chart4 ||
        "#4BC0C0",

      theme.colors.chart5 ||
        "#9966FF",

    ];

    return palette[
      index %
        palette.length
    ];
  }

  /* ================================================
     BUDGET MODE
  ================================================= */

  if (budget <= 0) {

    return theme.colors
      .divider;
  }

  const ratio =
    value / budget;

  if (ratio >= 1) {

    return theme.colors
      .danger;
  }

  if (ratio >= 0.7) {

    return theme.colors
      .warning;
  }

  return theme.colors
    .success;
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    wrapper: {

      alignItems:
        "center",

      width: "100%",
    },

    container: {

      alignItems:
        "center",

      justifyContent:
        "center",

      position:
        "relative",
    },

    emptyContainer: {

      width: "100%",

      paddingVertical: 40,

      borderWidth: 1,

      borderRadius: 24,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyText: {

      fontSize: 14,
    },

    centerContent: {

      position:
        "absolute",

      top: 0,

      left: 0,

      right: 0,

      bottom: 0,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    remainingValue: {

      textAlign:
        "center",

      letterSpacing:
        -1,

      includeFontPadding:
        false,
    },

    remainingLabel: {

      marginTop: 2,

      textAlign:
        "center",

      letterSpacing:
        0.8,

      textTransform:
        "uppercase",

      includeFontPadding:
        false,
    },

    legendContainer: {

      marginTop: 20,

      flexDirection:
        "row",

      flexWrap: "wrap",

      justifyContent:
        "center",

      gap: 14,

      paddingHorizontal: 16,
    },

    legendRow: {

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    legendDot: {

      width: 10,

      height: 10,

      borderRadius: 5,

      marginRight: 6,
    },

    legendText: {

      fontSize: 12,
    },

    segmentTooltip: {

      marginBottom: 16,

      borderWidth: 1,

      borderRadius: 16,

      paddingVertical: 10,

      paddingHorizontal: 14,

      minWidth: 180,

      alignItems:
        "center",

      shadowColor:
        "#000",

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.05,

      shadowRadius: 8,

      elevation: 2,
    },

    segmentTooltipDot: {

      width: 12,

      height: 12,

      borderRadius: 6,

      marginBottom: 4,
    },

    segmentTooltipTitle: {

      fontSize: 14,

      marginBottom: 2,
    },

    segmentTooltipText: {

      fontSize: 11,

      marginTop: 1,
    },
  });