// src/components/layout/MetricCard.tsx

import React from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

import {
  Feather,
} from "@expo/vector-icons";

import { useTheme }
from "@/theme/ThemeContext";

import {
  spacing,
} from "@/constants/spacing";

import {
  typography,
} from "../../../src/constants/typography";

type Props = {

  title: string;

  value: string | number;

  subtitle?: string;

  icon?: keyof typeof Feather.glyphMap;

  trend?: string;

  trendType?:
    | "positive"
    | "negative"
    | "neutral";

  onPress?: () => void;

  style?: ViewStyle;

  compact?: boolean;
};

export default function MetricCard({

  title,

  value,

  subtitle,

  icon,

  trend,

  trendType = "neutral",

  onPress,

  style,

  compact = false,

}: Props) {

  const { theme } =
    useTheme();

  // =====================================================
  // 🔥 TREND COLORS
  // =====================================================

  const trendColor =

    trendType === "positive"

      ? theme.colors.success

      : trendType === "negative"

      ? theme.colors.danger

      : theme.colors.textSecondary;

  const CardComponent =
    onPress
      ? TouchableOpacity
      : View;

  return (

    <CardComponent

      activeOpacity={0.88}

      onPress={onPress}

      style={[

        styles.container,

        {
          backgroundColor:
            theme.colors.card,

          borderColor:
            theme.colors.border,

          padding:
            compact
              ? spacing.md
              : spacing.cardPadding,
        },

        style,
      ]}
    >

      {/* ================================= */}
      {/* 🔥 TOP ROW */}
      {/* ================================= */}

      <View
        style={
          styles.topRow
        }
      >

        {/* ============================= */}
        {/* 🔥 TITLE */}
        {/* ============================= */}

        <Text
          style={[

            styles.title,

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

          {title}

        </Text>

        {/* ============================= */}
        {/* 🔥 ICON */}
        {/* ============================= */}

        {icon && (

          <View
            style={[

              styles.iconWrapper,

              {
                backgroundColor:
                  theme.colors
                    .accentSoft,
              },
            ]}
          >

            <Feather
              name={icon}
              size={18}
              color={
                theme.colors
                  .accent
              }
            />

          </View>
        )}

      </View>

      {/* ================================= */}
      {/* 🔥 VALUE */}
      {/* ================================= */}

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[

          styles.value,

          {
            color:
              theme.colors
                .text,

            fontFamily:
              theme.fonts
                .accent2,
          },
        ]}
      >

        {value}

      </Text>

      {/* ================================= */}
      {/* 🔥 BOTTOM */}
      {/* ================================= */}

      {(subtitle || trend) && (

        <View
          style={
            styles.bottomRow
          }
        >

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

          {!!trend && (

            <View
              style={
                styles.trendRow
              }
            >

              <Feather
                name={
                  trendType ===
                  "positive"

                    ? "trending-up"

                    : trendType ===
                      "negative"

                    ? "trending-down"

                    : "minus"
                }

                size={14}

                color={trendColor}
              />

              <Text
                style={[

                  styles.trend,

                  {
                    color:
                      trendColor,

                    fontFamily:
                      theme.fonts
                        .semibold,
                  },
                ]}
              >

                {trend}

              </Text>

            </View>
          )}

        </View>
      )}

    </CardComponent>
  );
}

// =====================================================
// 🎨 STYLES
// =====================================================

const styles =
  StyleSheet.create({

    // =========================================
    // 🔥 ROOT
    // =========================================

    container: {

      borderRadius:
        spacing.cardRadius,

      borderWidth: 1,

      marginBottom:
        spacing.lg,
    },

    // =========================================
    // 🔥 TOP
    // =========================================

    topRow: {

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",
    },

    // =========================================
    // 🔥 TITLE
    // =========================================

    title: {

      ...typography.bodySmall,

      flex: 1,

      marginRight:
        spacing.sm,
    },

    // =========================================
    // 🔥 VALUE
    // =========================================

    value: {

      ...typography.metricLarge,

      marginTop:
        spacing.sm,
    },

    // =========================================
    // 🔥 SUBTITLE
    // =========================================

    subtitle: {

      ...typography.caption,

      flex: 1,
    },

    // =========================================
    // 🔥 BOTTOM
    // =========================================

    bottomRow: {

      flexDirection: "row",

      alignItems: "center",

      justifyContent:
        "space-between",

      marginTop:
        spacing.sm,
    },

    // =========================================
    // 🔥 TREND
    // =========================================

    trendRow: {

      flexDirection: "row",

      alignItems: "center",
    },

    trend: {

      ...typography.caption,

      marginLeft: 4,
    },

    // =========================================
    // 🔥 ICON
    // =========================================

    iconWrapper: {

      width: 34,

      height: 34,

      borderRadius: 12,

      alignItems: "center",

      justifyContent:
        "center",
    },
  });