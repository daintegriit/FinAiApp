// =====================================================
// 💎 FINAI — THEME TYPES
// =====================================================

export type ThemeMode =
  | "light"
  | "night"
  | "finTerminal"
  | "highContrast"
  | "bloomberg"
  | "wallStreetOLED"
  | "quantMatrix"
  | "deepNavy"
  | "visionGlass";

export type ThemeAppearance =
  | "light"
  | "dark";

/* =====================================================
   COLORS
===================================================== */

export interface ThemeColors {

  background: string;

  surface: string;

  elevated: string;

  card: string;

  overlay: string;

  text: string;

  textSecondary: string;

  textMuted: string;

  textInverse: string;

  primary: string;

  accent: string;

  accentSoft: string;

  success: string;

  successSoft: string;

  error: string;

  danger: string;

  criticalDanger: string;

  errorSoft: string;

  warning: string;

  warningSoft: string;

  info: string;

  infoSoft: string;

  chart1: string;

  chart2: string;

  chart3: string;

  chart4: string;

  chart5: string;

  chart6: string;

  border: string;

  divider: string;

  input: string;

  placeholder: string;

  shadow: string;

  tabActive: string;

  tabInactive: string;

  tabBackground: string;

  webviewBackground: string;
}

/* =====================================================
   FONTS
===================================================== */

export interface ThemeFonts {

  primary: string;

  medium: string;

  semibold: string;

  bold: string;

  heading: string;

  headingLight: string;

  display: string;

  mono: string;

  accent: string;

  accent2: string;

  cyber?: string;
}

/* =====================================================
   SPACING
===================================================== */

export interface ThemeSpacing {

  xs: number;

  sm: number;

  md: number;

  lg: number;

  xl: number;

  xxl: number;
}

/* =====================================================
   RADIUS
===================================================== */

export interface ThemeRadius {

  xs: number;

  sm: number;

  md: number;

  lg: number;

  xl: number;

  pill: number;
}

/* =====================================================
   THEME
===================================================== */

export interface Theme {

  id: ThemeMode;

  mode: ThemeAppearance;

  colors: ThemeColors;

  fonts: ThemeFonts;

  spacing: ThemeSpacing;

  radius: ThemeRadius;
}

/* =====================================================
   CONTEXT
===================================================== */

export interface ThemeContextType {

  theme: Theme;

  mode: ThemeMode;

  isDark: boolean;

  setThemeMode: (
    mode: ThemeMode
  ) => void;

  toggleTheme: () => void;
}