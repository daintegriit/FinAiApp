import type {
  PropsWithChildren,
  ReactElement,
} from "react";

import {
  StyleSheet,
} from "react-native";

import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from "react-native-reanimated";

import {
  useTheme,
} from "../../src/theme/ThemeContext";

// =====================================================
// 🔥 HEADER SIZE
// =====================================================

const HEADER_HEIGHT = 250;

// =====================================================
// 🔥 TYPES
// =====================================================

type Props =
  PropsWithChildren<{

    headerImage:
      ReactElement;

    headerBackgroundColor?: {

      dark?: string;

      light?: string;
    };
  }>;

// =====================================================
// 🔥 COMPONENT
// =====================================================

export default function ParallaxScrollView({

  children,

  headerImage,

}: Props) {

  const { theme } =
    useTheme();

  // ===================================================
  // 🔥 REFS
  // ===================================================

  const scrollRef =
    useAnimatedRef<Animated.ScrollView>();

  const scrollOffset =
    useScrollOffset(
      scrollRef
    );

  // ===================================================
  // 🔥 HEADER ANIMATION
  // ===================================================

  const headerAnimatedStyle =
    useAnimatedStyle(() => {

      return {

        transform: [

          {
            translateY:
              interpolate(
                scrollOffset.value,

                [
                  -HEADER_HEIGHT,
                  0,
                  HEADER_HEIGHT,
                ],

                [
                  -HEADER_HEIGHT / 2,
                  0,
                  HEADER_HEIGHT * 0.75,
                ]
              ),
          },

          {
            scale:
              interpolate(
                scrollOffset.value,

                [
                  -HEADER_HEIGHT,
                  0,
                  HEADER_HEIGHT,
                ],

                [2, 1, 1]
              ),
          },
        ],
      };
    });

  // ===================================================
  // 🧠 RENDER
  // ===================================================

  return (

    <Animated.ScrollView

      ref={scrollRef}

      scrollEventThrottle={16}

      style={[

        styles.container,

        {
          backgroundColor:
            theme.colors.background,
        },
      ]}
    >

      {/* ============================================ */}
      {/* 🔥 PARALLAX HEADER */}
      {/* ============================================ */}

      <Animated.View

        style={[

          styles.header,

          {
            backgroundColor:
              theme.colors.surface,
          },

          headerAnimatedStyle,
        ]}
      >

        {headerImage}

      </Animated.View>

      {/* ============================================ */}
      {/* 🔥 CONTENT */}
      {/* ============================================ */}

      <Animated.View

        style={[

          styles.content,

          {
            backgroundColor:
              theme.colors.background,
          },
        ]}
      >

        {children}

      </Animated.View>

    </Animated.ScrollView>
  );
}

// =====================================================
// 🎨 STYLES
// =====================================================

const styles =
  StyleSheet.create({

    container: {

      flex: 1,
    },

    header: {

      height:
        HEADER_HEIGHT,

      overflow:
        "hidden",
    },

    content: {

      flex: 1,

      padding: 32,

      gap: 16,

      overflow:
        "hidden",
    },
  });