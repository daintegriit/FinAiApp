import React from "react";

import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import {
  Link,
} from "expo-router";

// =====================================================
// 🔥 FIXED IMPORT
// =====================================================

import {
  useTheme,
} from "../src/theme/ThemeContext";

// =====================================================
// 💎 MODAL SCREEN
// =====================================================

export default function ModalScreen() {

  const { theme } =
    useTheme();

  return (

    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      {/* ========================================= */}
      {/* TITLE */}
      {/* ========================================= */}

      <Text
        style={[
          styles.title,
          {
            color:
              theme.colors.text,

            fontFamily:
              theme.fonts.semibold,
          },
        ]}
      >

        This is a modal

      </Text>

      {/* ========================================= */}
      {/* LINK */}
      {/* ========================================= */}

      <Link
        href="/"
        dismissTo
        style={styles.link}
      >

        <Text
          style={[
            styles.linkText,
            {
              color:
                theme.colors.primary,

              fontFamily:
                theme.fonts.primary,
            },
          ]}
        >

          Go to home screen

        </Text>

      </Link>

    </View>
  );
}

// =====================================================
// 🎨 STYLES
// =====================================================

const styles =
  StyleSheet.create({

    container: {

      flex: 1,

      alignItems: "center",

      justifyContent: "center",

      padding: 20,
    },

    title: {

      fontSize: 24,
    },

    link: {

      marginTop: 15,

      paddingVertical: 15,
    },

    linkText: {

      fontSize: 16,
    },
  });