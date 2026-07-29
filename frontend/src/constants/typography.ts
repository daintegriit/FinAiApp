// src/constants/typography.ts

import {
  normalizeFont,
} from "../../src/utils/responsive";

// =====================================================
// 🔥 TYPOGRAPHY SCALE
// =====================================================

export const typography = {

  // ===================================================
  // 🔹 DISPLAY / HERO
  // ===================================================

  hero: {

    fontSize:
      normalizeFont(42),

    lineHeight:
      normalizeFont(48),

    letterSpacing: -1,

    fontWeight:
      "700" as const,
  },

  display: {

    fontSize:
      normalizeFont(34),

    lineHeight:
      normalizeFont(40),

    letterSpacing: -0.8,

    fontWeight:
      "700" as const,
  },

  title: {

    fontSize:
      normalizeFont(28),

    lineHeight:
      normalizeFont(34),

    letterSpacing: -0.5,

    fontWeight:
      "700" as const,
  },

  // ===================================================
  // 🔹 HEADINGS
  // ===================================================

  h1: {

    fontSize:
      normalizeFont(24),

    lineHeight:
      normalizeFont(30),

    fontWeight:
      "700" as const,
  },

  h2: {

    fontSize:
      normalizeFont(22),

    lineHeight:
      normalizeFont(28),

    fontWeight:
      "700" as const,
  },

  h3: {

    fontSize:
      normalizeFont(20),

    lineHeight:
      normalizeFont(26),

    fontWeight:
      "600" as const,
  },

  h4: {

    fontSize:
      normalizeFont(18),

    lineHeight:
      normalizeFont(24),

    fontWeight:
      "600" as const,
  },

  // ===================================================
  // 🔹 BODY
  // ===================================================

  bodyXL: {

    fontSize:
      normalizeFont(18),

    lineHeight:
      normalizeFont(28),

    fontWeight:
      "400" as const,
  },

  bodyLarge: {

    fontSize:
      normalizeFont(16),

    lineHeight:
      normalizeFont(24),

    fontWeight:
      "400" as const,
  },

  body: {

    fontSize:
      normalizeFont(15),

    lineHeight:
      normalizeFont(22),

    fontWeight:
      "400" as const,
  },

  bodySmall: {

    fontSize:
      normalizeFont(13),

    lineHeight:
      normalizeFont(18),

    fontWeight:
      "400" as const,
  },

  caption: {

    fontSize:
      normalizeFont(11),

    lineHeight:
      normalizeFont(16),

    fontWeight:
      "400" as const,
  },

  // ===================================================
  // 🔹 BUTTONS
  // ===================================================

  buttonLarge: {

    fontSize:
      normalizeFont(22),

    lineHeight:
      normalizeFont(26),

    fontWeight:
      "700" as const,
  },

  button: {

    fontSize:
      normalizeFont(18),

    lineHeight:
      normalizeFont(22),

    fontWeight:
      "600" as const,
  },

  buttonSmall: {

    fontSize:
      normalizeFont(14),

    lineHeight:
      normalizeFont(18),

    fontWeight:
      "600" as const,
  },

  // ===================================================
  // 🔹 METRICS
  // ===================================================

  metricXL: {

    fontSize:
      normalizeFont(42),

    lineHeight:
      normalizeFont(46),

    letterSpacing: -1.2,

    fontWeight:
      "700" as const,
  },

  metricLarge: {

    fontSize:
      normalizeFont(32),

    lineHeight:
      normalizeFont(38),

    letterSpacing: -0.8,

    fontWeight:
      "700" as const,
  },

  metric: {

    fontSize:
      normalizeFont(24),

    lineHeight:
      normalizeFont(30),

    fontWeight:
      "700" as const,
  },
};

// =====================================================
// 🔥 FONT FAMILY HELPERS
// =====================================================

export const fontFamilies = {

  primary:
    "Unageo-Regular",

  medium:
    "Unageo-Medium",

  semibold:
    "Unageo-SemiBold",

  bold:
    "Unageo-Bold",

  display:
    "Klops",

  heading:
    "Select",

  mono:
    "RACESPACEREGULAR",

  accent:
    "Karma",

  accent2:
    "KarmaSu",

  cyber:
    "MAXIMUMSECURITY",
};

// =====================================================
// 🔥 READY-TO-USE HELPERS
// =====================================================

export const textStyles = {

  screenTitle: {

    ...typography.display,

    fontFamily:
      fontFamilies.display,
  },

  screenSubtitle: {

    ...typography.body,

    fontFamily:
      fontFamilies.primary,
  },

  metric: {

    ...typography.metricLarge,

    fontFamily:
      fontFamilies.accent2,
  },

  button: {

    ...typography.button,

    fontFamily:
      fontFamilies.display,
  },

  body: {

    ...typography.body,

    fontFamily:
      fontFamilies.primary,
  },

  caption: {

    ...typography.caption,

    fontFamily:
      fontFamilies.primary,
  },
};