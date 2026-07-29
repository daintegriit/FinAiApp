// src/components/layout/AppHeader.tsx

import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import {
  Feather,
} from "@expo/vector-icons";

import {
  useRouter,
} from "expo-router";

import { useTheme }
from "../../../src/theme/ThemeContext";

type Props = {

  title: string;

  subtitle?: string;

  showBack?: boolean;

  rightComponent?: React.ReactNode;

  brand?: boolean;
};

export default function AppHeader({

  title,

  subtitle,

  showBack = true,

  rightComponent,

  brand = true,

}: Props) {

  const router =
    useRouter();

  const { theme } =
    useTheme();

  return (

    <View
      style={[

        styles.container,

        {
          borderBottomColor:
            theme.colors.divider,
        },
      ]}
    >

      {/* ================================= */}
      {/* 🔙 LEFT */}
      {/* ================================= */}

      <View style={styles.leftRow}>

        {showBack && (

          <TouchableOpacity

            activeOpacity={0.7}

            onPress={() =>
              router.back()
            }

            style={[

              styles.backButton,

              {
                backgroundColor:
                  theme.colors.card,

                borderColor:
                  theme.colors.border,
              },
            ]}
          >

            <Feather
              name="chevron-left"
              size={22}
              color={
                theme.colors.text
              }
            />

          </TouchableOpacity>
        )}

        {/* ============================= */}
        {/* 🔥 TITLES */}
        {/* ============================= */}

        <View
          style={
            styles.textWrapper
          }
        >

          {brand && (

            <Text
              style={[

                styles.brand,

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

              FinBudgetAI

            </Text>
          )}

          <Text
            style={[

              styles.title,

              {
                color:
                  theme.colors
                    .text,

                fontFamily:
                  theme.fonts
                    .display,
              },
            ]}
          >

            {title}

          </Text>

          {!!subtitle && (

            <Text
              style={[

                styles.subtitle,

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

              {subtitle}

            </Text>
          )}

        </View>

      </View>

      {/* ================================= */}
      {/* 🔥 RIGHT */}
      {/* ================================= */}

      {rightComponent}

    </View>
  );
}

// =====================================================
// 🎨 STYLES
// =====================================================

const styles =
  StyleSheet.create({

    container: {

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      paddingBottom: 18,

      marginBottom: 24,

      borderBottomWidth: 1,
    },

    leftRow: {

      flexDirection: "row",

      alignItems: "center",

      flex: 1,
    },

    backButton: {

      width: 46,

      height: 46,

      borderRadius: 14,

      borderWidth: 1,

      justifyContent:
        "center",

      alignItems: "center",
    },

    textWrapper: {

      marginLeft: 14,

      flex: 1,
    },

    brand: {

      fontSize: 22,

      letterSpacing: -0.4,
    },

    title: {

      fontSize: 32,

      marginTop: 2,
    },

    subtitle: {

      fontSize: 13,

      marginTop: 4,
    },
  });