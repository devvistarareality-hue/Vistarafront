/**
 * Vistara Realty — Design System
 * ------------------------------------------------------------------
 * Single source of truth for colors, spacing, radius, typography and
 * shadows across the whole app. Import from here, never hardcode.
 *
 *   import { COLORS, SPACING, RADIUS, TYPE, SHADOWS } from '../../constants/theme';
 *
 * Brand soul kept (navy + gold), refreshed into full, cohesive scales.
 * Legacy aliases at the bottom of COLORS keep older imports working
 * while screens are migrated.
 * ------------------------------------------------------------------
 */

/* ============================================================== *
 *  1. PALETTE  —  raw color scales (don't use directly in UI)    *
 * ============================================================== */
export const PALETTE = {
  // Brand — Navy (primary)
  navy900: '#0F1838',
  navy800: '#182350', // legacy "navy"
  navy700: '#243264',
  navy600: '#33457F',
  navy500: '#475A96',
  navy300: '#8C9AC0',
  navy100: '#DDE3F0',
  navy50:  '#EEF1F7',

  // Brand — Gold (secondary)
  gold700: '#9A7644',
  gold600: '#B9915E', // legacy "gold"
  gold400: '#D4B483',
  gold100: '#F5ECDD',
  gold50:  '#FBF6EE',

  // Interactive — Blue
  blue600: '#2E47E0',
  blue500: '#3D5AFE', // legacy "link"
  blue100: '#E8EEFF',
  blue50:  '#F2F5FF',
  powderBlue: '#AFD2FA',

  // Neutrals / Gray
  gray900: '#1A1A2E', // text primary
  gray700: '#3A4256',
  gray500: '#8492A6', // text secondary
  gray400: '#B0BAC9',
  gray300: '#DDE3F0',
  gray200: '#E0E6F0',
  gray100: '#EEF1F7',
  gray50:  '#F5F6FA', // screen bg
  white:   '#FFFFFF',
  black:   '#000000',

  // Status — Success (green)
  green600: '#2E7D32',
  green500: '#43A047',
  green100: '#E8F5E9',

  // Status — Error (red)
  red600: '#DC2626',
  red500: '#EF4444',
  red100: '#FEE2E2',

  // Status — Warning (amber/orange)
  amber600: '#E65100',
  amber500: '#F9A825',
  amber100: '#FFF3E0',

  // Status — Info (cyan/blue, reuses blue scale)
  info600: '#0097A7',
  info100: '#E0F7FA',

  // Accent — Purple (used by some modules)
  purple600: '#7B1FA2',
  purple100: '#F3E5F5',
};

/* ============================================================== *
 *  2. SEMANTIC COLORS  —  use these in components                *
 * ============================================================== */
export const COLORS = {
  // Surfaces / backgrounds
  screenBg:  PALETTE.gray50,
  surface:   PALETTE.white,   // cards, sheets
  surfaceAlt: PALETTE.gray100, // subtle raised areas, inputs
  cardBg:    PALETTE.white,
  overlay:   'rgba(15,24,56,0.45)', // modal scrim (navy900 based)

  // Text
  textPrimary:   PALETTE.gray900,
  textSecondary: PALETTE.gray500,
  textTertiary:  PALETTE.gray400,
  textInverse:   PALETTE.white,
  textOnBrand:   PALETTE.white,

  // Borders / dividers
  border:      PALETTE.gray200,
  borderLight: PALETTE.gray100,
  divider:     PALETTE.gray300,

  // Brand
  navy:        PALETTE.navy800,
  navyDark:    PALETTE.navy900,
  navyMedium:  PALETTE.navy500,
  navyLight:   PALETTE.navy100,
  gold:        PALETTE.gold600,
  goldDark:    PALETTE.gold700,
  goldLight:   PALETTE.gold400,
  goldBg:      PALETTE.gold100,
  powderBlue:  PALETTE.powderBlue,
  black:       PALETTE.black,
  shadow:      '#B8C4D6', // soft shadow tint used app-wide

  // Interactive
  link:        PALETTE.blue500,
  linkPressed: PALETTE.blue600,
  linkBg:      PALETTE.blue100,

  // Accent — purple
  purple:    PALETTE.purple600,
  purpleBg:  PALETTE.purple100,

  // Semantic status (color + matching tint background)
  success:    PALETTE.green600,
  successAlt:  PALETTE.green500,
  successBg:  PALETTE.green100,
  error:      PALETTE.red500,
  errorStrong: PALETTE.red600,
  errorBg:    PALETTE.red100,
  warning:    PALETTE.amber600,
  warningAlt:  PALETTE.amber500,
  warningBg:  PALETTE.amber100,
  info:       PALETTE.info600,
  infoBg:     PALETTE.info100,

  // ---- Legacy aliases (keep so existing imports still work) ----
  primary:    PALETTE.navy800,
  accent:     PALETTE.gold600,
  secondary:  PALETTE.blue500,
  white:      PALETTE.white,
  background: PALETTE.gray50,
  text:       PALETTE.gray900,
  lightGray:  PALETTE.gray200,
};

/* ============================================================== *
 *  3. SPACING  —  4pt scale                                      *
 * ============================================================== */
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
};

/* ============================================================== *
 *  4. RADIUS                                                     *
 * ============================================================== */
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  pill: 999,
  full: 9999,
};

/* ============================================================== *
 *  5. TYPOGRAPHY                                                 *
 * ============================================================== */
export const FONT_SIZE = {
  xs: 11,
  sm: 12,
  md: 14,  // body default
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
};

export const FONT_WEIGHT = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
};

export const LINE_HEIGHT = {
  tight:   18,
  normal:  22,
  relaxed: 26,
};

// Ready-made text presets — spread into a Text style.
export const TYPE = {
  h1:      { fontSize: FONT_SIZE['3xl'], fontWeight: FONT_WEIGHT.heavy,   color: COLORS.textPrimary },
  h2:      { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.heavy,   color: COLORS.textPrimary },
  title:   { fontSize: FONT_SIZE.xl,     fontWeight: FONT_WEIGHT.bold,    color: COLORS.textPrimary },
  subtitle:{ fontSize: FONT_SIZE.lg,     fontWeight: FONT_WEIGHT.semibold,color: COLORS.textPrimary },
  body:    { fontSize: FONT_SIZE.md,     fontWeight: FONT_WEIGHT.regular, color: COLORS.textPrimary, lineHeight: LINE_HEIGHT.normal },
  bodyMuted:{fontSize: FONT_SIZE.md,     fontWeight: FONT_WEIGHT.regular, color: COLORS.textSecondary, lineHeight: LINE_HEIGHT.normal },
  caption: { fontSize: FONT_SIZE.sm,     fontWeight: FONT_WEIGHT.regular, color: COLORS.textSecondary },
  label:   { fontSize: FONT_SIZE.sm,     fontWeight: FONT_WEIGHT.semibold,color: COLORS.textSecondary },
  button:  { fontSize: FONT_SIZE.lg,     fontWeight: FONT_WEIGHT.bold,    color: COLORS.textInverse },
};

/* ============================================================== *
 *  6. SHADOWS / elevation                                        *
 * ============================================================== */
export const SHADOWS = {
  sm: {
    shadowColor: PALETTE.gray400,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#B8C4D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: PALETTE.navy900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
};

// Legacy alias — old screens import CARD_SHADOW directly.
export const CARD_SHADOW = SHADOWS.md;

/* ============================================================== *
 *  7. MODULE ACCENTS  —  per-module tint + icon color           *
 * ============================================================== */
export const MODULE_ACCENT = {
  HR:          { bg: PALETTE.blue100,  icon: PALETTE.blue500 },
  Sales:       { bg: PALETTE.gold100,  icon: PALETTE.amber500 },
  Execution:   { bg: PALETTE.green100, icon: PALETTE.green600 },
  Purchase:    { bg: PALETTE.amber100, icon: PALETTE.amber600 },
  Land:        { bg: PALETTE.purple100,icon: PALETTE.purple600 },
  'Accounts & Finance': { bg: PALETTE.green100, icon: PALETTE.green600 },
  'Club 1000': { bg: '#80DEEA', icon: '#00838F' },
  Reports:     { bg: PALETTE.green100, icon: PALETTE.green600 },
  Settings:    { bg: PALETTE.purple100,icon: PALETTE.purple600 },
  Admin:       { bg: PALETTE.blue100,  icon: PALETTE.blue500 },
  Projects:    { bg: PALETTE.green100, icon: PALETTE.green600 },
  Sites:       { bg: PALETTE.info100,  icon: PALETTE.info600 },
  Contractors: { bg: PALETTE.amber100, icon: PALETTE.amber600 },
  Inventory:   { bg: PALETTE.gold100,  icon: PALETTE.amber500 },
  Payments:    { bg: PALETTE.green100, icon: PALETTE.green600 },
  Clients:     { bg: PALETTE.blue100,  icon: PALETTE.blue500 },
};

/* ============================================================== *
 *  8. LEGACY — SIZES / FONTS (kept for older imports)           *
 * ============================================================== */
export const SIZES = {
  base:    SPACING.sm,
  font:    FONT_SIZE.md,
  radius:  RADIUS.md,
  padding: SPACING.xl,
};

export const FONTS = {
  regular: 'System',
  medium:  'System',
  bold:    'System',
};

export default {
  PALETTE,
  COLORS,
  SPACING,
  RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  TYPE,
  SHADOWS,
  CARD_SHADOW,
  MODULE_ACCENT,
  SIZES,
  FONTS,
};
