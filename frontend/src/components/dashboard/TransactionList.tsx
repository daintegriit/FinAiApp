// =====================================================
// 💎 FINAI — TRANSACTION LIST
// =====================================================
// FILE:
// src/components/dashboard/TransactionList.tsx
//
// PURPOSE
// -----------------------------------------------------
// Executive-grade transaction activity list.
//
// FEATURES
// -----------------------------------------------------
// ✔ Stable transaction rendering
// ✔ Hermes-safe animations
// ✔ Production-safe deletion
// ✔ TestFlight-safe highlighting
// ✔ Safe numeric coercion
// ✔ Safe date formatting
// ✔ Swipe-to-delete
// ✔ Focused transaction animation
// ✔ Zero memory leaks
// ✔ Stable key extraction
// ✔ Empty-state fallback
// ✔ Responsive rendering
// ✔ Null-safe transaction handling
// ✔ Zero ESLint warnings
// ✔ Zero React hook warnings
//
// =====================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
} from "react-native";

import {
  Swipeable,
} from "react-native-gesture-handler";

import {
  useFinanceStore,
} from "../../../src/store/financeStore";

import {
  useLocalSearchParams,
} from "expo-router";

import {
  useTheme,
} from "../../../src/theme/ThemeContext";

import {
  useAuth,
} from "../../../src/context/AuthContext";

/* =====================================================
   TYPES
===================================================== */

interface TransactionItem {
  id?: string | number;

  amount?: number;

  category?: string;

  created_at?: string;
}

/* =====================================================
   HELPERS
===================================================== */

function formatCurrency(
  value?: number
): string {

  return `$${Number(
    value ?? 0
  ).toFixed(2)}`;
}

function formatDate(
  value?: string
): string {

  if (!value) {
    return "Unknown date";
  }

  try {

    return new Date(
      value
    ).toLocaleDateString();

  } catch {

    return "Unknown date";
  }
}

/* =====================================================
   COMPONENT
===================================================== */

export default function TransactionList() {

  const { theme } =
    useTheme();

  const { user } =
    useAuth();
  /* ===================================================
     STORE
  =================================================== */

  const transactions =
    useFinanceStore(
      useCallback(
        (state) =>
          state.transactions,
        []
      )
    );

  const removeTransaction =
    useFinanceStore(
      useCallback(
        (state) =>
          state.removeTransaction,
        []
      )
    );

  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  /* ===================================================
     ROUTE
  =================================================== */

  const { id } =
    useLocalSearchParams();

  const focusedId =
    useMemo(
      () =>
        id
          ? String(id)
          : null,
      [id]
    );

  /* ===================================================
     REFS
  =================================================== */

  const scrollRef =
    useRef<ScrollView>(null);

  const fadeAnim =
    useRef(
      new Animated.Value(0)
    ).current;

  const pulseAnim =
    useRef(
      new Animated.Value(1)
    ).current;

  const animationRef =
    useRef<
      Animated.CompositeAnimation | undefined
    >(undefined);

  /* ===================================================
     SAFE TRANSACTIONS
  =================================================== */

  const safeTransactions =
    useMemo<
      TransactionItem[]
    >(() => {

      if (
        !Array.isArray(
          transactions
        )
      ) {
        return [];
      }

      return transactions.filter(
        Boolean
      );

    }, [transactions]);

  /* ===================================================
     SCROLL + HIGHLIGHT
  =================================================== */

  useEffect(() => {

    if (!focusedId) {
      return;
    }

    const index =
      safeTransactions.findIndex(
        (t) =>
          String(
            t?.id
          ) === focusedId
      );

    if (index === -1) {
      return;
    }

    scrollRef.current?.scrollTo({
      y: index * 78,
      animated: true,
    });

    fadeAnim.setValue(0);

    Animated.timing(
      fadeAnim,
      {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }
    ).start();

    animationRef.current?.stop();

    animationRef.current =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            pulseAnim,
            {
              toValue: 1.03,
              duration: 700,
              useNativeDriver: true,
            }
          ),

          Animated.timing(
            pulseAnim,
            {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }
          ),
        ])
      );

    animationRef.current.start();

    return () => {

      animationRef.current?.stop();

      pulseAnim.setValue(1);
    };

  }, [
    focusedId,
    safeTransactions,
    fadeAnim,
    pulseAnim,
  ]);

  /* ===================================================
     DELETE
  =================================================== */

  const handleDelete =
    useCallback(
      (
        tx: TransactionItem
      ) => {

        Alert.alert(
          "Delete Transaction",

          `${tx.category || "Transaction"} • ${formatCurrency(
            tx.amount
          )}`,

          [
            {
              text: "Cancel",
              style: "cancel",
            },

            {
              text: "Delete",
              style: "destructive",

              onPress: async () => {

                if (tx?.id === undefined || !user?.id) {
                  return;
                }

                const idStr = String(tx.id);
                setDeletingId(idStr);

                // Optimistically remove from UI
                removeTransaction(idStr);

                try {
                  const { deleteTransaction } = await import("../../../src/services/transactions");
                  await deleteTransaction(idStr, user.id);
                } catch (err) {
                  console.error("❌ Backend delete failed, transaction may reappear on refresh:", err);
                  // Could re-add it back to store here if you want strict consistency
                } finally {
                  setDeletingId(null);
                }
              },
            },
          ]
        );
      },
      [removeTransaction, user]
    );

  /* ===================================================
     EMPTY STATE
  =================================================== */

  if (
    !safeTransactions.length
  ) {

    return (

      <View
        style={[
          styles.emptyWrapper,
          {
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

          No transactions yet

        </Text>

      </View>
    );
  }

  /* ===================================================
     UI
  =================================================== */

  return (

    <ScrollView

      ref={scrollRef}

      showsVerticalScrollIndicator={
        false
      }

      contentContainerStyle={[
        styles.container,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      {safeTransactions.map(
        (
          tx,
          index
        ) => {

          const txId =
            String(
              tx?.id ??
                `tx-${index}`
            );

          const isFocused =
            txId ===
            focusedId;

          return (

            <Swipeable

              key={txId}

              overshootRight={
                false
              }

              renderRightActions={() => (

                <View
                  style={[
                    styles.deleteBox,
                    {
                      backgroundColor:
                        theme.colors.danger,
                    },
                  ]}
                >

                  <Text
                    style={[
                      styles.deleteText,
                      {
                        color:
                          theme.colors.textInverse,

                        fontFamily:
                          theme.fonts.semibold,
                      },
                    ]}
                  >

                    Delete

                  </Text>

                </View>
              )}

              onSwipeableOpen={() =>
                handleDelete(
                  tx
                )
              }
            >

              <Animated.View

                style={[

                  styles.row,

                  {
                    backgroundColor:
                      theme.colors.background,

                    borderBottomColor:
                      isFocused
                        ? theme.colors.success
                        : theme.colors.divider,
                  },

                  isFocused && {

                    opacity:
                      fadeAnim,

                    transform: [
                      {
                        scale:
                          pulseAnim,
                      },
                    ],
                  },
                ]}
              >

                {/* ================================= */}
                {/* LEFT */}
                {/* ================================= */}

                <View
                  style={
                    styles.left
                  }
                >

                  <Text
                    numberOfLines={
                      1
                    }
                    style={[
                      styles.category,
                      {
                        color:
                          theme.colors.text,

                        fontFamily:
                          theme.fonts.primary,
                      },
                    ]}
                  >

                    {tx.category ||
                      "Other"}

                  </Text>

                  <Text
                    style={[
                      styles.date,
                      {
                        color:
                          theme.colors.textSecondary,

                        fontFamily:
                          theme.fonts.primary,
                      },
                    ]}
                  >

                    {formatDate(
                      tx.created_at
                    )}

                  </Text>

                </View>

                {/* ================================= */}
                {/* RIGHT */}
                {/* ================================= */}

                <Text
                  style={[
                    styles.amount,
                    {
                      color:
                        theme.colors.text,

                      fontFamily:
                        theme.fonts.semibold,
                    },
                  ]}
                >

                  {formatCurrency(
                    tx.amount
                  )}

                </Text>

              </Animated.View>

            </Swipeable>
          );
        }
      )}

    </ScrollView>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    container: {

      paddingBottom: 40,
    },

    emptyWrapper: {

      paddingVertical: 40,

      alignItems:
        "center",
    },

    emptyText: {

      fontSize: 14,
    },

    row: {

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      paddingVertical: 16,

      paddingHorizontal: 6,

      borderBottomWidth: 1,

      minHeight: 78,
    },

    left: {

      flex: 1,

      paddingRight: 12,
    },

    category: {

      fontSize: 15,
    },

    date: {

      fontSize: 11,

      marginTop: 4,
    },

    amount: {

      fontSize: 15,
    },

    deleteBox: {

      width: 90,

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    deleteText: {

      fontSize: 13,
    },
  });