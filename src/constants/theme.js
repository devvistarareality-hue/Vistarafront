/**
 * Nexora — Design System
 * ------------------------------------------------------------------
 * Single source of truth for colors, spacing, radius, typography and
 * shadows across the whole app. Import from here, never hardcode.
 *
 *   import { COLORS, SPACING, RADIUS, TYPE, SHADOWS } from '../../constants/theme';
 *
 * Brand soul kept (navy + gold) — the same navy and gold the Nexora mark is
 * built from, refreshed into full, cohesive scales.
 * Legacy aliases at the bottom of COLORS keep older imports working
 * while screens are migrated.
 * ------------------------------------------------------------------
 */

/* ============================================================== *
 *  1. PALETTE  —  raw color scales (don't use directly in UI)    *
 * ============================================================== */
export const PALETTE = {
  // Core palette (shared with the web + Labour ledger design)
  blue:        '#A2D2FF',
  green:       '#A4F5A6',
  peach:       '#FFD89D',
  grey:        '#ECEEF0',
  ink:         '#1D1D1F',

  // Brand — "navy" is now ink; the scale steps up towards grey
  navy900: '#1D1D1F',
  navy800: '#1D1D1F', // legacy "navy"
  navy700: '#2C2D30',
  navy600: '#3A3C40',
  navy500: '#55585E',
  navy300: '#9A9EA5',
  navy100: '#DFE2E6',
  navy50:  '#ECEEF0',

  // Brand — Gold (secondary) → peach
  gold700: '#A3671A',
  gold600: '#C98A2E', // legacy "gold"
  gold400: '#FFD89D',
  gold100: '#FFF3E0',
  gold50:  '#FFF8EC',

  // Interactive — Blue
  blue600: '#245A96',
  blue500: '#2F6DB5', // legacy "link"
  blue100: '#E6F2FF',
  blue50:  '#F3F9FF',
  powderBlue: '#A2D2FF',

  // Neutrals / Gray
  gray900: '#1D1D1F', // text primary
  gray700: '#3A3C40',
  gray500: '#6E7278', // text secondary
  gray400: '#9A9EA5',
  gray300: '#DFE2E6',
  gray200: '#E3E5E8',
  gray100: '#ECEEF0',
  gray50:  '#EEF3F5', // screen bg — soft blue/green tint
  white:   '#FFFFFF',
  black:   '#000000',

  // Status — Success (green)
  green600: '#23874A',
  green500: '#34A45D',
  green100: '#E9FBEA',

  // Status — Error (red)
  red600: '#B8323A',
  red500: '#D9434B',
  red100: '#FDECEC',

  // Status — Warning (peach)
  amber600: '#A3671A',
  amber500: '#D98A1F',
  amber100: '#FFF3E0',

  // Status — Info (blue)
  info600: '#2F6DB5',
  info100: '#E6F2FF',

  // Accent — was purple; a deeper blue keeps it distinct from links
  purple600: '#245A96',
  purple100: '#DCEBFA',

  // Status — In progress (neutral grey; distinct from success/error/warning)
  slate600: '#55585E',
  slate400: '#9A9EA5',
  slate100: '#ECEEF0',
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
  overlay:   'rgba(29,29,31,0.45)', // modal scrim (navy900 based)

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
  shadow:      '#8C94A0', // soft shadow tint used app-wide

  // Palette shortcuts
  blue:        PALETTE.blue,
  green:       PALETTE.green,
  peach:       PALETTE.peach,
  grey:        PALETTE.grey,
  ink:         PALETTE.ink,
  primaryButton: PALETTE.ink,

  // Interactive
  link:        PALETTE.blue500,
  linkPressed: PALETTE.blue600,
  linkBg:      PALETTE.blue100,

  // Accent — purple
  purple:    PALETTE.purple600,
  purpleBg:  PALETTE.purple100,

  // Accent — grey (in-progress plot status: soft pick or pending-approval hold)
  inProgress:   PALETTE.slate600,
  inProgressAlt: PALETTE.slate400,
  inProgressBg: PALETTE.slate100,

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
  md:   14,
  lg:   20,
  xl:   28,
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
    shadowColor: '#3C5A82',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
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
  HR:          { bg: PALETTE.blue,  icon: PALETTE.blue600 },
  Sales:       { bg: PALETTE.peach, icon: PALETTE.amber600 },
  Execution:   { bg: PALETTE.green, icon: PALETTE.green600 },
  Purchase:    { bg: PALETTE.peach, icon: PALETTE.amber600 },
  Land:        { bg: PALETTE.blue,  icon: PALETTE.blue600 },
  'Accounts & Finance': { bg: PALETTE.green, icon: PALETTE.green600 },
  'Club 1000': { bg: PALETTE.green, icon: PALETTE.green600 },
  Reports:     { bg: PALETTE.green, icon: PALETTE.green600 },
  Settings:    { bg: PALETTE.grey,  icon: PALETTE.gray700 },
  Admin:       { bg: PALETTE.blue,  icon: PALETTE.blue600 },
  Projects:    { bg: PALETTE.green, icon: PALETTE.green600 },
  Sites:       { bg: PALETTE.blue,  icon: PALETTE.blue600 },
  Contractors: { bg: PALETTE.peach, icon: PALETTE.amber600 },
  Inventory:   { bg: PALETTE.peach, icon: PALETTE.amber600 },
  Payments:    { bg: PALETTE.green, icon: PALETTE.green600 },
  Clients:     { bg: PALETTE.blue,  icon: PALETTE.blue600 },
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
