// =====================================================
// 💎 FINAI — CATEGORY DONUT
// =====================================================

import React, {
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import Svg, {
  G,
  Circle,
  Defs,
  Path,
  TextPath,
  TSpan,
  Text as SvgText,
} from "react-native-svg";

import {
  useFinanceStore,
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

interface DonutItem {
  name: string;
  realValue: number;
  percentage: number;
  color: string;
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

/* -----------------------------------------------------
   ARC GEOMETRY (for curved labels)
----------------------------------------------------- */

function polar(
  cx: number,
  cy: number,
  r: number,
  deg: number
) {

  const rad =
    (deg * Math.PI) / 180;

  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  sweep: 0 | 1
): string {

  const s =
    polar(cx, cy, r, startDeg);

  const e =
    polar(cx, cy, r, endDeg);

  const large =
    Math.abs(endDeg - startDeg) > 180
      ? 1
      : 0;

  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
}

/* =====================================================
   COMPONENT
===================================================== */

export default function CategoryDonut({

  compact = false,

}: Props) {

  const { theme } =
    useTheme();


  const userCategories =
    useFinanceStore(
      (s) => s.userCategoryGrid
    );

  const income =
    useFinanceStore(
      (s) => s.income
    );

  const safeCategories =
    useMemo<CategoryLike[]>(() =>
      Array.isArray(userCategories)
        ? userCategories
        : [],
    [userCategories]);

  const safeIncome =
    safeNumber(income);

  const [activeSegment, setActiveSegment] =
    useState<string | null>(null);

  /* Unique prefix so two donuts on one screen
     never collide on SVG element ids. */
  const uid =
    useMemo(
      () =>
        `donut${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      []
    );

  const data =
    useMemo<DonutItem[]>(() => {

      const categoryItems =
        safeCategories
          .map((cat) => {

            const spent =
              safeNumber(
                (cat as any).spent
              );

            const budget =
              safeNumber(cat?.budget);

            const usagePercentage =
              budget > 0
                ? (spent / budget) * 100
                : 0;

            return {
              name:
                cat?.name || "Other",
              realValue:
                spent,
              budget,
              usagePercentage,
              percentage:
                Math.min(
                  usagePercentage,
                  100
                ),
              color:
                getCategoryColor(
                  spent,
                  budget,
                  theme
                ),
            };
          })
          .filter(
            (item) =>
              item.budget > 0
          );

      const totalSpent =
        categoryItems.reduce(
          (sum, item) =>
            sum + item.realValue,
          0
        );

      const unspent =
        Math.max(
          0,
          safeIncome - totalSpent
        );

      if (
        safeIncome > 0 &&
        unspent > 0
      ) {
        categoryItems.push({
          name: "Left",
          realValue: safeIncome,  // ← full income as the value
          budget: safeIncome,
          usagePercentage: 100,
          percentage: 100,        // ← full arc, always
          color: theme.colors.divider,
        });
      }

      return categoryItems;

    }, [
      safeCategories,
      safeIncome,
      theme,
    ]);

  const totalSpending =
    useMemo(() =>
      data
        .filter(
          (item) =>
            item.name !== "Left"
        )
        .reduce(
          (sum, item) =>
            sum + item.realValue,
          0
        ),
    [data]);

  const remaining =
    safeIncome -
    totalSpending;

  const remainingPercent =
    safeIncome > 0
      ? Math.max(
          0,
          Math.round(
            (remaining / safeIncome) * 100
          )
        )
      : 0;

  if (!data.length) {

    return (
      <View
        style={[
          styles.emptyContainer,
          {
            borderColor:
              theme.colors.divider,
            backgroundColor:
              theme.colors.background,
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
          No category data available
        </Text>
      </View>
    );
  }

  const size =
    compact ? 190 : 300;

  const strokeWidth =
    compact ? 18 : 24;

  /* Wider background stroke that carves the gaps. */
  const separatorWidth =
    strokeWidth + 5;

  const radius =
    compact ? 72 : 112;

  const center =
    size / 2;

  const circumference =
    2 * Math.PI * radius;

  const labelFontSize =
    compact ? 9 : 11;

  /* Baseline for the curved labels — sits just
     outside the outer edge of the ring. */
  const labelRadius =
    radius +
    strokeWidth / 2 +
    (compact ? 6 : 9);

  const segments =
    data.map(
      (
        item,
        index
      ) => {

        const sectionDegrees =
          360 / data.length;

        const percentage =
          item.percentage / 100;

        const sectionLength =
          circumference / data.length;

        const gapSize = 4;

        const usableLength =
          sectionLength - gapSize;

        const trackLength =
          usableLength;

        const trackEmptyLength =
          circumference - trackLength;

        /* Round caps add strokeWidth/2 of paint at each
           end, so a raw dash renders strokeWidth longer
           than it measures. */
        const capLength = strokeWidth;

        /* The NEXT slice's separator is drawn after this
           slice's track and trims its tail, so what you
           actually SEE is shorter than what gets painted.
           Measure the fill against the visible extent. */
        const visibleTrack =
          sectionLength -
          (separatorWidth - strokeWidth) / 2;

        const dashLength =
          percentage <= 0
            ? 0
            : Math.max(
                0.01,
                visibleTrack * percentage -
                  capLength
              );

        const emptyLength =
          circumference - dashLength;

        const rotation =
          sectionDegrees * index;

        /* ---- CURVED LABEL PATH ---- */

        const midAngle =
          rotation +
          sectionDegrees / 2 -
          90;

        /* Lower half of the circle: draw the arc
           backwards so the text isn't upside down. */
        const isBottom =
          Math.sin(
            (midAngle * Math.PI) / 180
          ) > 0;

        const halfSpan =
          (sectionDegrees - 8) / 2;

        const labelPath =
          isBottom
            ? arcPath(
                center,
                center,
                labelRadius,
                midAngle + halfSpan,
                midAngle - halfSpan,
                0
              )
            : arcPath(
                center,
                center,
                labelRadius,
                midAngle - halfSpan,
                midAngle + halfSpan,
                1
              );

        /* On the reversed bottom arc glyphs hang
           toward the center, so push them back out. */
        const labelDy =
          isBottom
            ? labelFontSize * 0.9
            : -labelFontSize * 0.1;

        /* Keep the name inside its own arc so it
           never bleeds into the neighboring gap. */
        const maxChars =
          Math.max(
            4,
            Math.floor(sectionDegrees / 6.5)
          );

        const labelText =
          item.name.length > maxChars
            ? item.name.slice(0, maxChars - 1) +
              "…"
            : item.name;

        return {
          key:
            `${item.name}-${index}`,

          pathId:
            `${uid}-label-${index}`,

          color:
            item.color,

          trackDasharray:
            `${trackLength} ${trackEmptyLength}`,

          fillDasharray:
            `${dashLength} ${emptyLength}`,

          rotation,

          labelPath,
          labelDy,
          labelText,

          item,
        };
      }
    );

  const remainingColor =
    remaining < 0
      ? theme.colors.danger
      : remaining < safeIncome * 0.2
      ? theme.colors.warning
      : theme.colors.success;

  return (
    <View style={styles.wrapper}>

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

          {/* INVISIBLE LABEL ARCS */}
          <Defs>
            {segments.map(
              (segment) => (
                <Path
                  key={`${segment.key}-def`}
                  id={segment.pathId}
                  d={segment.labelPath}
                  fill="none"
                />
              )
            )}
          </Defs>

          {segments.map(
            (segment) => (

              <G
                key={segment.key}
                rotation={
                  segment.rotation - 90
                }
                origin={`${center}, ${center}`}
              >

                {/* BACKGROUND SEPARATOR — creates gaps */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={theme.colors.background}
                  strokeWidth={separatorWidth}
                  fill="transparent"
                  strokeDasharray={segment.trackDasharray}
                  strokeLinecap="round"
                />

                {/* GREY TRACK */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={theme.colors.divider}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={segment.trackDasharray}
                  strokeLinecap="round"
                />

                {/* COLORED SPEND FILL — sits on top of grey */}
                {segment.item.name !== "Left" &&
                  Number(
                    segment.fillDasharray
                      .split(" ")[0]
                  ) > 0 && (
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={segment.fillDasharray}
                    strokeLinecap="round"
                  />
                )}

              </G>
            )
          )}

          {/* CURVED CATEGORY LABELS */}
          {segments.map(
            (segment) => (

              <SvgText
                key={`${segment.key}-label`}
                fill={
                  theme.colors.text
                }
                fontSize={labelFontSize}
                fontWeight="700"
                textAnchor="middle"
              >
                <TextPath
                  href={`#${segment.pathId}`}
                  startOffset="50%"
                >
                  <TSpan dy={segment.labelDy}>
                    {segment.labelText}
                  </TSpan>
                </TextPath>
              </SvgText>
            )
          )}

          {segments.map((segment) => {

            const midAngle =
              (segment.rotation +
                360 / data.length / 2 -
                90) *
              (Math.PI / 180);

            const tapX =
              center +
              radius *
                Math.cos(midAngle);

            const tapY =
              center +
              radius *
                Math.sin(midAngle);

            return (
              <Circle
                key={`${segment.key}-tap`}
                cx={tapX}
                cy={tapY}
                r={strokeWidth * 1.5}
                fill="transparent"
                onPress={() =>
                  setActiveSegment(
                    activeSegment ===
                      segment.item.name
                      ? null
                      : segment.item.name
                  )
                }
              />
            );
          })}

        </Svg>

        <View
          pointerEvents="none"
          style={styles.centerContent}
        >

          <Text
            style={[
              styles.remainingValue,
              {
                color:
                  remainingColor,
                fontSize:
                  compact ? 28 : 50,
                lineHeight:
                  compact ? 32 : 56,
                fontFamily:
                  theme.fonts.accent2,
              },
            ]}
          >
            {remaining < 0
              ? `-$${Math.abs(
                  Math.round(remaining)
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
                  theme.colors.textSecondary,
                fontSize:
                  compact ? 13 : 18,
                fontFamily:
                  theme.fonts.accent,
              },
            ]}
          >
            {remainingPercent}% LEFT
          </Text>

        </View>

      </View>

      {activeSegment && (() => {

          const item = data.find(
            (d) => d.name === activeSegment
          );

          if (!item) return null;

          return (
            <View
              style={[
                styles.tooltip,
                {
                  backgroundColor:
                    theme.colors.card,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tooltipName,
                  {
                    color:
                      theme.colors.text,
                    fontFamily:
                      theme.fonts.semibold,
                  },
                ]}
              >
                {item.name}
              </Text>

              <Text
                style={[
                  styles.tooltipSpent,
                  {
                    color: item.color,
                    fontFamily:
                      theme.fonts.accent2,
                  },
                ]}
              >
                ${Math.round(
                  item.realValue
                ).toLocaleString()}
              </Text>

              {item.name !== "Left" && (
                <Text
                  style={[
                    styles.tooltipBudget,
                    {
                      color:
                        theme.colors
                          .textSecondary,
                      fontFamily:
                        theme.fonts.primary,
                    },
                  ]}
                >
                  of ${Math.round(
                    item.budget
                  ).toLocaleString()}{" "}
                  budget ·{" "}
                  {Math.round(
                    item.usagePercentage
                  )}%
                </Text>
              )}
            </View>
          );
        })()}

      </View>

  );
}

/* =====================================================
   COLOR ENGINE
===================================================== */

function getCategoryColor(
  spent: number,
  budget: number,
  theme: ReturnType<
    typeof useTheme
  >["theme"]
): string {

  if (budget <= 0) {

    return theme.colors.divider;
  }

  const percentage =
    (spent / budget) * 100;

  /* ==========================================
     EXACT SAME LOGIC
     AS CATEGORY BREAKDOWN
  ========================================== */

  if (percentage > 90) {

    return theme.colors.danger;
  }

  if (percentage > 70) {

    return theme.colors.warning;
  }

  return theme.colors.success;
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    wrapper: {
      alignItems: "center",
    },

    container: {
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      position: "relative",
    },

    emptyContainer: {
      width: "100%",
      paddingVertical: 40,
      borderWidth: 1,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyText: {
      fontSize: 14,
    },

    centerContent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
    },

    remainingValue: {
      textAlign: "center",
      letterSpacing: -1.5,
    },

    remainingLabel: {
      marginTop: -4,
      textAlign: "center",
      letterSpacing: 1.2,
    },

    tooltip: {
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: "center",
      minWidth: 160,
    },

    tooltipName: {
      fontSize: 13,
      marginBottom: 4,
      letterSpacing: 0.5,
    },

    tooltipSpent: {
      fontSize: 26,
      letterSpacing: -1,
    },

    tooltipBudget: {
      fontSize: 12,
      marginTop: 2,
    },
  });