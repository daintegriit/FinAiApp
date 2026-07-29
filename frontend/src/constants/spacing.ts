// src/constants/spacing.ts

import {
  moderateScale,
  verticalScale,
} from "../../src/utils/responsive";

// =====================================================
// 🔥 GLOBAL SPACING SYSTEM
// =====================================================

export const spacing = {

  // =========================================
  // 🔹 MICRO
  // =========================================

  xxxs:
    moderateScale(2),

  xxs:
    moderateScale(4),

  xs:
    moderateScale(8),

  sm:
    moderateScale(12),

  md:
    moderateScale(16),

  lg:
    moderateScale(20),

  xl:
    moderateScale(24),

  xxl:
    moderateScale(32),

  xxxl:
    moderateScale(40),

  huge:
    moderateScale(56),

  massive:
    moderateScale(72),

  // =========================================
  // 🔹 SCREEN PADDING
  // =========================================

  screenHorizontal:
    moderateScale(20),

  screenTop:
    verticalScale(12),

  screenBottom:
    verticalScale(32),

  // =========================================
  // 🔹 CARD SYSTEM
  // =========================================

  cardPadding:
    moderateScale(18),

  cardGap:
    moderateScale(14),

  cardRadius:
    moderateScale(18),

  // =========================================
  // 🔹 BUTTON SYSTEM
  // =========================================

  buttonHeight:
    verticalScale(60),

  buttonRadius:
    moderateScale(18),

  buttonPadding:
    moderateScale(18),

  // =========================================
  // 🔹 INPUTS
  // =========================================

  inputHeight:
    verticalScale(58),

  inputRadius:
    moderateScale(16),

  inputPadding:
    moderateScale(16),

  // =========================================
  // 🔹 HEADER SYSTEM
  // =========================================

  headerGap:
    moderateScale(14),

  headerBottom:
    verticalScale(24),

  // =========================================
  // 🔹 GRID SYSTEM
  // =========================================

  gridGap:
    moderateScale(12),

  sectionGap:
    verticalScale(28),
};

// =====================================================
// 🔥 HELPER EXPORTS
// =====================================================

export const layout = {

  screen: {

    paddingHorizontal:
      spacing.screenHorizontal,

    paddingTop:
      spacing.screenTop,

    paddingBottom:
      spacing.screenBottom,
  },

  card: {

    padding:
      spacing.cardPadding,

    borderRadius:
      spacing.cardRadius,
  },

  button: {

    height:
      spacing.buttonHeight,

    borderRadius:
      spacing.buttonRadius,
  },

  input: {

    height:
      spacing.inputHeight,

    borderRadius:
      spacing.inputRadius,
  },
};