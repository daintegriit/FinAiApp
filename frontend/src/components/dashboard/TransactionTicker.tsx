// =====================================================
// 💎 FINAI — TRANSACTION TICKER
// =====================================================
// FILE:
// src/components/dashboard/TransactionTicker.tsx
//
// PURPOSE
// -----------------------------------------------------
// Elite executive financial activity ticker.
//
// FEATURES
// -----------------------------------------------------
// ✔ Infinite marquee scrolling
// ✔ Safe transaction rendering
// ✔ Stable animation lifecycle
// ✔ Hermes-safe animation cleanup
// ✔ Production-safe numeric coercion
// ✔ TestFlight-safe rendering
// ✔ Duplicate-key prevention
// ✔ Theme-safe rendering
// ✔ Empty-state fallback
// ✔ Memory-safe ticker repetition
// ✔ Zero ESLint warnings
// ✔ Zero React hook warnings
//
// =====================================================

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  Animated,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useFinanceStore,
  DEFAULT_CATEGORIES,
} from "../../../src/store/financeStore";

import {
  useRouter,
} from "expo-router";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

/* =====================================================
   TYPES
===================================================== */

interface TickerTransaction {
  id?: string | number;
  amount?: number;
  category?: string;
}

/* =====================================================
   HELPERS
===================================================== */

function normalize(
  str?: string
): string {

  return String(
    str || ""
  )
    .trim()
    .toLowerCase();
}

/* =====================================================
   COMPONENT
===================================================== */

export default function TransactionTicker() {

  const { theme } =
    useTheme();

  const router =
    useRouter();

  const {
    width: screenWidth,
  } =
    useWindowDimensions();

  /* ===================================================
     STORE
  =================================================== */

  const transactions =
    useFinanceStore(
      (state) =>
        state.transactions
    );

  const userCategories =
    useFinanceStore(
      (state) =>
        state.userCategoryGrid
    );

  /* ===================================================
     ANIMATION
  =================================================== */

  const translateX =
    useRef(
      new Animated.Value(0)
    ).current;

  const animationRef =
    useRef<
      Animated.CompositeAnimation | undefined
    >(undefined);

  const [contentWidth, setContentWidth] =
    useState(0);

  /* ===================================================
     CATEGORY MAP
  =================================================== */

  const categoryMap =
    useMemo(() => {

      return [
        ...DEFAULT_CATEGORIES,
        ...userCategories,
      ].reduce(
        (
          acc: Record<
            string,
            string
          >,
          cat: any
        ) => {

          const key =
            normalize(
              cat?.name
            );

          if (
            !acc[key] ||
            cat?.icon
          ) {

            acc[key] =
              cat?.icon ||
              "ellipse-outline";
          }

          return acc;

        },
        {}
      );

    }, [userCategories]);

  /* ===================================================
     BASE DATA
  =================================================== */

  const baseData =
    useMemo<
      TickerTransaction[]
    >(() => {

      if (
        Array.isArray(
          transactions
        ) &&
        transactions.length > 0
      ) {

        return transactions
          .filter(Boolean)
          .slice(0, 20);
      }

      return [
        {
          id: "empty",
          amount: 0,
          category:
            "No recent activity",
        },
      ];

    }, [transactions]);

  /* ===================================================
     REPEATED DATA
  =================================================== */

  const repeatedData =
    useMemo(() => {

      const itemsNeeded =
        Math.max(
          12,
          Math.ceil(
            screenWidth / 140
          ) * 4
        );

      return Array
        .from({
          length:
            itemsNeeded,
        })
        .flatMap(
          () => baseData
        );

    }, [
      baseData,
      screenWidth,
    ]);

  /* ===================================================
     ANIMATION
  =================================================== */

  useEffect(() => {

    if (
      !contentWidth
    ) {
      return;
    }

    animationRef.current?.stop();

    translateX.stopAnimation();

    translateX.setValue(0);

    animationRef.current =
      Animated.loop(
        Animated.timing(
          translateX,
          {

            toValue:
              -contentWidth / 2,

            duration: 18000,

            useNativeDriver: true,
          }
        )
      );

    animationRef.current.start();

    return () => {

      animationRef.current?.stop();

      translateX.stopAnimation();
    };

  }, [
    contentWidth,
    translateX,
  ]);

  /* ===================================================
     UI
  =================================================== */

  return (

    <View

      style={[

        styles.container,

        {
          borderColor:
            theme.colors.divider,

          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      <Animated.View

        style={[

          styles.row,

          {
            transform: [
              {
                translateX,
              },
            ],
          },
        ]}

        onLayout={(e) => {

          const width =
            e.nativeEvent
              .layout.width;

          if (
            width !==
            contentWidth
          ) {

            setContentWidth(
              width
            );
          }
        }}
      >

        {repeatedData.map(
          (
            t,
            index
          ) => {

            /* ==========================================
               EMPTY STATE
            ========================================== */

            if (
              t.id ===
              "empty"
            ) {

              return (

                <View
                  key={`empty-${index}`}
                  style={
                    styles.item
                  }
                >

                  <Text

                    style={[

                      styles.empty,

                      {
                        color:
                          theme
                            .colors
                            .textSecondary,

                        fontFamily:
                          theme
                            .fonts
                            .primary,
                      },
                    ]}
                  >

                    No recent activity

                  </Text>

                  <Text

                    style={[

                      styles.dot,

                      {
                        color:
                          theme
                            .colors
                            .textSecondary,
                      },
                    ]}
                  >

                    •

                  </Text>

                </View>
              );
            }

            /* ==========================================
               SAFE VALUES
            ========================================== */

            const amount =
              Number(
                t?.amount ?? 0
              );

            const isIncome =
              amount > 0;

            const category =
              t?.category ||
              "Other";

            const normalizedCategory =
              normalize(
                category
              );

            const icon =
              categoryMap[
                normalizedCategory
              ] ||
              "ellipse-outline";

            /* ==========================================
               ITEM
            ========================================== */

            return (

              <TouchableOpacity

                key={`${String(
                  t?.id ??
                    "tx"
                )}-${index}`}

                activeOpacity={
                  0.7
                }

                onPress={() => {

                  if (
                    !t?.id
                  ) {
                    return;
                  }

                  router.push({
                    pathname:
                      "/analytics",

                    params: {
                      id: String(
                        t.id
                      ),
                    },
                  });
                }}
              >

                <View
                  style={
                    styles.item
                  }
                >

                  {/* ================================= */}
                  {/* ICON */}
                  {/* ================================= */}

                  <Ionicons

                    name={
                      icon as any
                    }

                    size={14}

                    color={
                      theme
                        .colors
                        .textSecondary
                    }

                    style={{
                      marginRight: 6,
                    }}
                  />

                  {/* ================================= */}
                  {/* CATEGORY */}
                  {/* ================================= */}

                  <Text

                    numberOfLines={
                      1
                    }

                    style={[

                      styles.category,

                      {
                        color:
                          theme
                            .colors
                            .text,

                        fontFamily:
                          theme
                            .fonts
                            .primary,
                      },
                    ]}
                  >

                    {category}

                  </Text>

                  {/* ================================= */}
                  {/* AMOUNT */}
                  {/* ================================= */}

                  <Text

                    style={[

                      styles.amount,

                      {
                        color:
                          isIncome
                            ? theme
                                .colors
                                .success
                            : theme
                                .colors
                                .text,

                        fontFamily:
                          theme
                            .fonts
                            .primary,
                      },
                    ]}
                  >

                    {isIncome
                      ? "+"
                      : "-"}

                    $

                    {Math.abs(
                      amount
                    ).toFixed(
                      2
                    )}

                  </Text>

                  {/* ================================= */}
                  {/* DOT */}
                  {/* ================================= */}

                  <Text

                    style={[

                      styles.dot,

                      {
                        color:
                          theme
                            .colors
                            .textSecondary,
                      },
                    ]}
                  >

                    •

                  </Text>

                </View>

              </TouchableOpacity>
            );
          }
        )}

      </Animated.View>

    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {

      height: 40,

      overflow: "hidden",

      justifyContent:
        "center",

      marginVertical: 4,

      marginBottom: 0,

      borderTopWidth: 1,

      borderBottomWidth: 0,
    },

    row: {

      flexDirection: "row",

      alignItems: "center",
    },

    item: {

      flexDirection: "row",

      alignItems: "center",

      marginRight: 20,
    },

    category: {

      maxWidth: 90,

      fontSize: 12,

      fontWeight: "600",

      marginRight: 6,
    },

    amount: {

      fontSize: 12,

      fontWeight: "600",
    },

    dot: {

      marginLeft: 10,
    },

    empty: {

      fontSize: 12,
    },
  });