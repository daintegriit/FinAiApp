// src/components/layout/SectionCard.tsx

import React from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

import { Feather }
from "@expo/vector-icons";

import { useTheme }
from "../../../src/theme/ThemeContext";

import {
  spacing,
} from "../../../src/constants/spacing";

import {
  typography,
} from "../../../src/constants/typography";

type Props = {

  title?: string;

  subtitle?: string;

  children: React.ReactNode;

  icon?: keyof typeof Feather.glyphMap;

  rightComponent?: React.ReactNode;

  onPress?: () => void;

  style?: ViewStyle;

  elevated?: boolean;

  padded?: boolean;

  bordered?: boolean;
};

export default function SectionCard({

  title,

  subtitle,

  children,

  icon,

  rightComponent,

  onPress,

  style,

  elevated = false,

  padded = true,

  bordered = true,

}: Props) {

  const { theme } =
    useTheme();

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
            padded
              ? spacing.cardPadding
              : 0,

          shadowColor:
            elevated
              ? theme.colors.shadow
              : "transparent",

          elevation:
            elevated
              ? 5
              : 0,
        },

        style,
      ]}
    >

      {/* ================================= */}
      {/* 🔥 HEADER */}
      {/* ================================= */}

      {(title || subtitle) && (

        <View
          style={
            styles.header
          }
        >

          {/* ============================= */}
          {/* 🔥 LEFT */}
          {/* ============================= */}

          <View
            style={
              styles.left
            }
          >

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

            <View
              style={{
                flex: 1,
              }}
            >

              {!!title && (

                <Text
                  style={[

                    styles.title,

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

                  {title}

                </Text>
              )}

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

          {/* ============================= */}
          {/* 🔥 RIGHT */}
          {/* ============================= */}

          {rightComponent}

        </View>
      )}

      {/* ================================= */}
      {/* 🔥 CONTENT */}
      {/* ================================= */}

      <View
        style={
          styles.content
        }
      >

        {children}

      </View>

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

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity: 0.08,

      shadowRadius: 12,
    },

    // =========================================
    // 🔥 HEADER
    // =========================================

    header: {

      flexDirection: "row",

      alignItems: "flex-start",

      justifyContent:
        "space-between",

      marginBottom:
        spacing.md,
    },

    left: {

      flexDirection: "row",

      alignItems: "flex-start",

      flex: 1,
    },

    // =========================================
    // 🔥 ICON
    // =========================================

    iconWrapper: {

      width: 38,

      height: 38,

      borderRadius: 12,

      alignItems: "center",

      justifyContent:
        "center",

      marginRight:
        spacing.sm,
    },

    // =========================================
    // 🔥 TEXT
    // =========================================

    title: {

      ...typography.h3,
    },

    subtitle: {

      ...typography.bodySmall,

      marginTop: 2,
    },

    // =========================================
    // 🔥 CONTENT
    // =========================================

    content: {

      width: "100%",
    },
  });