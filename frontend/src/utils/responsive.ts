// src/utils/responsive.ts

import {
  Dimensions,
  PixelRatio,
  Platform,
} from "react-native";

// =====================================================
// 📱 DEVICE DIMENSIONS
// =====================================================

const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
} = Dimensions.get("window");

// =====================================================
// 🔥 BASE DESIGN SYSTEM
// (iPhone 16 / modern baseline)
// =====================================================

const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// =====================================================
// 🔥 DEVICE FLAGS
// =====================================================

export const isIOS =
  Platform.OS === "ios";

export const isAndroid =
  Platform.OS === "android";

export const isSmallDevice =
  SCREEN_WIDTH < 375;

export const isTablet =
  SCREEN_WIDTH >= 768;

export const isLargePhone =
  SCREEN_HEIGHT > 850;

// =====================================================
// 🔥 SCALE HELPERS
// =====================================================

export function scale(
  size: number
) {

  return (
    SCREEN_WIDTH /
    BASE_WIDTH
  ) * size;
}

export function verticalScale(
  size: number
) {

  return (
    SCREEN_HEIGHT /
    BASE_HEIGHT
  ) * size;
}

export function moderateScale(
  size: number,
  factor = 0.5
) {

  return (
    size +
    (
      scale(size) - size
    ) * factor
  );
}

// =====================================================
// 🔥 FONT NORMALIZER
// =====================================================

export function normalizeFont(
  size: number
) {

  const newSize =
    moderateScale(size);

  return Math.round(
    PixelRatio.roundToNearestPixel(
      newSize
    )
  );
}

// =====================================================
// 🔥 SAFE RESPONSIVE SPACING
// =====================================================

export const spacing = {

  xs: moderateScale(4),

  sm: moderateScale(8),

  md: moderateScale(16),

  lg: moderateScale(24),

  xl: moderateScale(32),

  xxl: moderateScale(40),
};

// =====================================================
// 🔥 RESPONSIVE FONT TOKENS
// =====================================================

export const typography = {

  caption:
    normalizeFont(11),

  bodySmall:
    normalizeFont(13),

  body:
    normalizeFont(15),

  bodyLarge:
    normalizeFont(18),

  subtitle:
    normalizeFont(22),

  title:
    normalizeFont(32),

  hero:
    normalizeFont(42),
};

// =====================================================
// 🔥 RESPONSIVE CARD SIZES
// =====================================================

export const cards = {

  radius:
    moderateScale(18),

  padding:
    moderateScale(18),

  gap:
    moderateScale(14),
};

// =====================================================
// 🔥 BUTTON SYSTEM
// =====================================================

export const buttons = {

  height:
    verticalScale(60),

  radius:
    moderateScale(18),

  icon:
    moderateScale(22),
};

// =====================================================
// 🔥 INPUT SYSTEM
// =====================================================

export const inputs = {

  height:
    verticalScale(58),

  radius:
    moderateScale(16),

  padding:
    moderateScale(16),
};

// =====================================================
// 🔥 GRID HELPERS
// =====================================================

export function grid(
  columns: number,
  gap = 12
) {

  return (

    SCREEN_WIDTH -

    40 -

    gap * (columns - 1)

  ) / columns;
}

// =====================================================
// 🔥 DEVICE EXPORTS
// =====================================================

export {

  SCREEN_WIDTH,

  SCREEN_HEIGHT,
};