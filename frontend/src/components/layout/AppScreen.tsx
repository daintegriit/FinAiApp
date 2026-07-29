// src/components/layout/AppScreen.tsx

import React from "react";

import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  ViewStyle,
  ScrollViewProps,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useTheme }
from "../../../src/theme/ThemeContext";

type Props = {

  children: React.ReactNode;

  scrollable?: boolean;

  keyboard?: boolean;

  padded?: boolean;

  centered?: boolean;

  safeTop?: boolean;

  safeBottom?: boolean;

  backgroundColor?: string;

  contentContainerStyle?: ViewStyle;

  style?: ViewStyle;

  scrollProps?: ScrollViewProps;
};

export default function AppScreen({

  children,

  scrollable = true,

  keyboard = true,

  padded = true,

  centered = false,

  safeTop = true,

  safeBottom = true,

  backgroundColor,

  contentContainerStyle,

  style,

  scrollProps,

}: Props) {

  const { theme } =
    useTheme();

  const insets =
    useSafeAreaInsets();

  // =====================================================
  // 🔥 SAFE AREA EDGES
  // =====================================================

  const edges: (
    | "top"
    | "bottom"
    | "left"
    | "right"
  )[] = [];

  if (safeTop)
    edges.push("top");

  if (safeBottom)
    edges.push("bottom");

  // =====================================================
  // 🔥 SHARED CONTENT STYLE
  // =====================================================

  const sharedContentStyle: ViewStyle = {

    flexGrow: 1,

    paddingHorizontal:
      padded ? 20 : 0,

    paddingTop:
      padded ? 10 : 0,

    paddingBottom:
      Math.max(
        insets.bottom + 28,
        40
      ),

    justifyContent:
      centered
        ? "center"
        : "flex-start",
  };

  // =====================================================
  // 🔥 CONTENT
  // =====================================================

  const content = scrollable ? (

    <ScrollView

      showsVerticalScrollIndicator={
        false
      }

      keyboardShouldPersistTaps="handled"

      contentContainerStyle={[
        sharedContentStyle,
        contentContainerStyle,
      ]}

      {...scrollProps}
    >

      {children}

    </ScrollView>

  ) : (

    <View
      style={[
        sharedContentStyle,
        {
          flex: 1,
        },
        contentContainerStyle,
      ]}
    >

      {children}

    </View>
  );

  // =====================================================
  // 🔥 UI
  // =====================================================

  return (

    <SafeAreaView
      edges={edges}
      style={[

        styles.safeArea,

        {
          backgroundColor:

            backgroundColor ||

            theme.colors.background,
        },

        style,
      ]}
    >

      <StatusBar
        translucent={false}
        backgroundColor={
          backgroundColor ||
          theme.colors.background
        }
        barStyle={
          theme.mode === "dark"
            ? "light-content"
            : "dark-content"
        }
      />

      {keyboard ? (

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >

          {content}

        </KeyboardAvoidingView>

      ) : (

        content

      )}

    </SafeAreaView>
  );
}

// =====================================================
// 🎨 STYLES
// =====================================================

const styles =
  StyleSheet.create({

    safeArea: {

      flex: 1,
    },

    flex: {

      flex: 1,
    },
  });