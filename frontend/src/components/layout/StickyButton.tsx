// src/components/layout/StickyButton.tsx

import React from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useTheme }
from "../../../src/theme/ThemeContext";

type Props = {

  title: string;

  onPress: () => void;

  disabled?: boolean;

  loading?: boolean;

  icon?: React.ReactNode;

  backgroundColor?: string;

  textColor?: string;
};

export default function StickyButton({

  title,

  onPress,

  disabled = false,

  loading = false,

  icon,

  backgroundColor,

  textColor,

}: Props) {

  const { theme } =
    useTheme();

  const insets =
    useSafeAreaInsets();

  const isDisabled =
    disabled || loading;

  return (

    <View
      style={[

        styles.wrapper,

        {
          paddingBottom:
            Math.max(
              insets.bottom,
              14
            ),

          backgroundColor:
            theme.colors.background,

          borderTopColor:
            theme.colors.divider,
        },
      ]}
    >

      <TouchableOpacity

        activeOpacity={0.85}

        disabled={isDisabled}

        onPress={onPress}

        style={[

          styles.button,

          {
            backgroundColor:

              isDisabled

                ? theme.colors.textMuted

                : backgroundColor ||

                  theme.colors.text,

            opacity:
              isDisabled
                ? 0.55
                : 1,
          },
        ]}
      >

        {/* ======================== */}
        {/* 🔥 LOADING */}
        {/* ======================== */}

        {loading ? (

          <ActivityIndicator
            color={
              textColor ||
              theme.colors.background
            }
          />

        ) : (

          <View
            style={styles.row}
          >

            {icon}

            <Text
              style={[

                styles.text,

                {
                  color:

                    textColor ||

                    theme.colors
                      .background,

                  fontFamily:
                    theme.fonts
                      .display,
                },
              ]}
            >

              {title}

            </Text>

          </View>

        )}

      </TouchableOpacity>

    </View>
  );
}

// =====================================================
// 🎨 STYLES
// =====================================================

const styles =
  StyleSheet.create({

    wrapper: {

      position: "absolute",

      left: 0,

      right: 0,

      bottom: 0,

      paddingHorizontal: 20,

      paddingTop: 12,

      borderTopWidth: 1,

      zIndex: 999,
    },

    button: {

      minHeight: 64,

      borderRadius: 18,

      alignItems: "center",

      justifyContent: "center",

      paddingHorizontal: 20,
    },

    row: {

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "center",
    },

    text: {

      fontSize: 22,

      fontWeight: "700",

      includeFontPadding: false,
    },
  });