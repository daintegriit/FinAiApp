// =====================================================
// 💎 FINAI — CATEGORY BREAKDOWN
// =====================================================

import React, {
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  Animated,
} from "react-native";

import {
  useLocalSearchParams,
} from "expo-router";

import {
  useFinanceStore,
} from "../../../src/store/financeStore";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

/* =====================================================
   TYPES
===================================================== */

type CategoryItem = {
  id?: string;
  name?: string;
  spent?: number;
  budget?: number;
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

function formatCurrency(
  value: number
): string {

  return Math.round(value)
    .toLocaleString();
}

/* =====================================================
   COMPONENT
===================================================== */

export default function CategoryBreakdown() {

  const { theme } =
    useTheme();

  const rawCategories =
    useFinanceStore(
      (state) =>
        state.userCategoryGrid
    );

  const { id } =
    useLocalSearchParams<{
      id?: string;
    }>();

  /* ===================================================
     SAFE DATA
  =================================================== */

  const categories =
    useMemo<CategoryItem[]>(

      () =>

        Array.isArray(
          rawCategories
        )

          ? rawCategories

          : [],

      [rawCategories]
    );

  /* ===================================================
     ANIMATION
  =================================================== */

  const fadeAnim =
    useRef(
      new Animated.Value(0)
    ).current;

  const pulseAnim =
    useRef(
      new Animated.Value(1)
    ).current;

  /* ===================================================
     FADE IN
  =================================================== */

  useEffect(() => {

    Animated.timing(
      fadeAnim,
      {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }
    ).start();

  }, [fadeAnim]);

  /* ===================================================
     PULSE
  =================================================== */

  useEffect(() => {

    if (!id) {
      return;
    }

    const loop =
      Animated.loop(

        Animated.sequence([

          Animated.timing(
            pulseAnim,
            {
              toValue: 1.03,
              duration: 650,
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            pulseAnim,
            {
              toValue: 1,
              duration: 650,
              useNativeDriver: true,
            }
          ),
        ])
      );

    loop.start();

    return () => {
      loop.stop();
    };

  }, [id, pulseAnim]);

  /* ===================================================
     EMPTY STATE
  =================================================== */

  if (
    categories.length === 0
  ) {

    return (

      <View
        style={[
          styles.emptyWrapper,
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
                theme.colors
                  .textSecondary,

              fontFamily:
                theme.fonts
                  .primary,
            },
          ]}
        >

          No categories yet

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
            theme.colors
              .background,
        },
      ]}
    >

      {categories.map(
        (
          cat,
          index
        ) => {

          const value =
            safeNumber(
              cat?.spent
            );

          const budget =
            safeNumber(
              cat?.budget
            );

          const percentage =

            budget > 0

              ? (
                  value /
                  budget
                ) * 100

              : 0;

          const width =
            Math.min(
              Math.max(
                percentage,
                2
              ),
              100
            );

          const color =

            percentage > 90

              ? theme.colors
                  .danger

              : percentage >
                70

              ? theme.colors
                  .warning

              : theme.colors
                  .success;

          const remaining =
            budget - value;

          const isOver =
            remaining < 0;

          const isSelected =

            id &&
            String(id) ===
              String(
                cat?.id ||
                cat?.name
              );

          return (

            <Animated.View
              key={
                `${cat?.name}-${index}`
              }
              style={[
                styles.barRow,
                {
                  opacity:
                    fadeAnim,

                  transform: [
                    {
                      scale:
                        isSelected
                          ? pulseAnim
                          : 1,
                    },
                  ],

                  backgroundColor:
                    theme.colors
                      .background,
                },
              ]}
            >

              {/* ============================== */}
              {/* LABEL */}
              {/* ============================== */}

              <Text
                numberOfLines={1}
                style={[
                  styles.barLabel,
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

                {cat?.name ||
                  "Other"}

              </Text>

              {/* ============================== */}
              {/* TRACK */}
              {/* ============================== */}

              <View
                style={[
                  styles.barTrack,
                  {
                    backgroundColor:
                      theme.colors
                        .surface,

                    borderColor:
                      theme.colors
                        .border,
                  },
                ]}
              >

                <View
                  style={[
                    styles.barFillDynamic,
                    {
                      width:
                        `${width}%`,

                      backgroundColor:
                        color,
                    },
                  ]}
                />

              </View>

              {/* ============================== */}
              {/* VALUES */}
              {/* ============================== */}

              <View
                style={
                  styles.valueContainer
                }
              >

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.barValue,
                    {
                      color:
                        theme.colors
                          .text,

                      fontFamily:
                        theme.fonts
                          .semibold,
                    },
                  ]}
                >

                  $
                  {formatCurrency(
                    value
                  )}

                </Text>

                {budget > 0 && (

                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[
                      styles.remainingText,
                      {
                        color:

                          isOver

                            ? theme
                                .colors
                                .danger

                            : theme
                                .colors
                                .success,

                        fontFamily:
                          theme.fonts
                            .primary,
                      },
                    ]}
                  >

                    {isOver

                      ? `-$${formatCurrency(
                          Math.abs(
                            remaining
                          )
                        )} over`

                      : `$${formatCurrency(
                          remaining
                        )} left`}

                  </Text>
                )}

              </View>

            </Animated.View>
          );
        }
      )}

    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {
      paddingHorizontal: 0,
    },

    emptyWrapper: {

      paddingVertical: 24,

      borderRadius: 18,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyText: {
      fontSize: 13,
    },

    barRow: {

      flexDirection: "row",

      alignItems: "center",

      marginBottom: 20,
    },

    barLabel: {

      width: 92,

      fontSize: 15,
    },

    barTrack: {

      flex: 1,

      height: 22,

      marginHorizontal: 12,

      overflow: "hidden",

      borderWidth: 1,

      borderRadius: 999,
    },

    barFillDynamic: {

      height: "100%",

      borderRadius: 999,
    },

    valueContainer: {

      alignItems:
        "flex-end",

      width: 94,
    },

    barValue: {

      fontSize: 12,
    },

    remainingText: {

      fontSize: 11,

      marginTop: 2,
    },
  });