import { Appearance } from 'react-native';
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
 *  0. THEME MODE — light (blue) or dark (black)                  *
 *  Picked once at startup (Root.js sets global.__NX_THEME__ from  *
 *  the saved preference before any screen module loads), so every *
 *  StyleSheet below is built with the right colours. Switching    *
 *  theme saves the choice and reloads the app (see lib/appTheme). *
 * ============================================================== */
const saved = global.__NX_THEME__;
export const THEME_MODE = saved === 'dark' || saved === 'light'
  ? saved
  : (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
export const IS_DARK = THEME_MODE === 'dark';

/* ============================================================== *
 *  1. PALETTE  —  raw colors (don't use directly in UI)          *
 * ============================================================== */
const LIGHT = {
  inkRgb: '12,24,43',
  screenBg: '#F3F6FB', surface: '#FFFFFF', surface2: '#F6F9FD', surface3: '#EDF2F8',
  border: '#E2E9F2', borderStrong: '#CBD7E6', cardBorder: '#E4EBF4', inputBg: '#F7FAFD',
  text: '#0C182B', text2: '#1F2E45', text3: '#3E4E66', muted: '#5A6A81', faint: '#8A98AD',
  strong: '#2F6DB5', strong2: '#245A96',
  primary: '#2F6DB5', primaryTop: '#4A8BD8', primaryDeep: '#245A96', accent: '#2466B0', accentDeep: '#1D5392',
  navActiveBg: '#A2D2FF', navActiveFg: '#0A2A4F',
  blue: '#A2D2FF', blue2: '#CFE6FF', accentSoft: '#E8F3FF', accentSofter: '#F3F9FF',
  success: '#1F8047', successSolid: '#23874A', successDeep: '#145A32', green: '#B5F3B7', success2: '#CBF5CC', successSoft: '#EAFAEC',
  danger: '#D13C45', dangerSolid: '#D9434B', dangerDeep: '#A52A31', danger2: '#F7C6C9', dangerSoft: '#FDEDEE',
  warning: '#9C6116', warningSolid: '#B8741E', warningDeep: '#6B420C', warning2: '#C77D1A', peach: '#FFE2B5', peach2: '#F5B453', warningSoft: '#FFF5E5',
  mutedSolid: '#5A6A81', mutedSolid2: '#3E4E66', faintSolid: '#8A98AD',
  shadow: '#2F6DB5', glow: '#2F6DB5',
};
const DARK = {
  // Midnight Aurora — blue-black base, indigo-tinted surfaces, blue→violet accent (matches web)
  inkRgb: '226,232,255',
  screenBg: '#070B18', surface: '#0F1629', surface2: '#131B33', surface3: '#1A2340',
  border: 'rgba(150,175,240,0.12)', borderStrong: 'rgba(150,175,240,0.22)', cardBorder: 'rgba(160,190,255,0.16)', inputBg: '#0A1022',
  text: '#EEF2FF', text2: '#D3DAEE', text3: '#A9B3CC', muted: '#8791AD', faint: '#5B6583',
  strong: '#4F7FE8', strong2: '#3D68CF',
  primary: '#6E6BFF', primaryTop: '#5AA2FF', primaryDeep: '#4A63E0', accent: '#A9C8FF', accentDeep: '#D6E4FF',
  navActiveBg: 'rgba(110,140,255,0.18)', navActiveFg: '#DDE8FF',
  blue: 'rgba(140,170,255,0.12)', blue2: 'rgba(140,170,255,0.22)', accentSoft: 'rgba(140,170,255,0.11)', accentSofter: 'rgba(140,170,255,0.05)',
  success: '#6FE3A8', successSolid: '#22A06B', successDeep: '#B8F5D2', green: 'rgba(111,227,168,0.13)', success2: 'rgba(111,227,168,0.22)', successSoft: 'rgba(111,227,168,0.08)',
  danger: '#FF8A9B', dangerSolid: '#E5485F', dangerDeep: '#FFB6C1', danger2: 'rgba(255,138,155,0.28)', dangerSoft: 'rgba(255,138,155,0.08)',
  warning: '#FFCF86', warningSolid: '#C98A2E', warningDeep: '#FFE4B8', warning2: '#FFBE5E', peach: 'rgba(255,207,134,0.15)', peach2: '#F5B453', warningSoft: 'rgba(255,207,134,0.08)',
  mutedSolid: '#262C3D', mutedSolid2: '#2E3548', faintSolid: '#3F475C',
  shadow: '#000000', glow: '#6E6BFF',
};
const T = IS_DARK ? DARK : LIGHT;

export const PALETTE = {
  // Core palette (shared with the web)
  blue:        T.blue,
  green:       T.green,
  peach:       T.peach,
  grey:        T.surface3,
  ink:         T.text,

  navy900: T.strong2,
  navy800: T.strong, // legacy "navy"
  navy700: T.strong2,
  navy600: T.text2,
  navy500: T.text3,
  navy300: T.faint,
  navy100: T.border,
  navy50:  T.surface3,

  gold700: T.warning,
  gold600: T.warning2, // legacy "gold"
  gold400: T.peach2,
  gold100: T.warningSoft,
  gold50:  T.warningSoft,

  blue600: T.accentDeep,
  blue500: T.accent, // legacy "link"
  blue100: T.accentSoft,
  blue50:  T.accentSofter,
  powderBlue: '#A2D2FF',

  gray900: T.text,
  gray700: T.text2,
  gray500: T.muted,
  gray400: T.faint,
  gray300: T.borderStrong,
  gray200: T.border,
  gray100: T.surface3,
  gray50:  T.screenBg,
  white:   '#FFFFFF',
  black:   '#000000',

  green600: T.success,
  green500: T.successSolid,
  green100: T.successSoft,

  red600: T.dangerDeep,
  red500: T.danger,
  red100: T.dangerSoft,

  amber600: T.warning,
  amber500: T.warning2,
  amber100: T.warningSoft,

  info600: T.accent,
  info100: T.accentSoft,

  purple600: T.accentDeep,
  purple100: T.blue2,

  slate600: T.muted,
  slate400: T.faint,
  slate100: T.surface3,
};

/* ============================================================== *
 *  2. SEMANTIC COLORS  —  use these in components                *
 * ============================================================== */
export const COLORS = {
  mode: THEME_MODE,
  isDark: IS_DARK,
  inkRgb: T.inkRgb,
  statusBar: IS_DARK ? 'light-content' : 'dark-content',

  // Surfaces / backgrounds
  screenBg:  T.screenBg,
  surface:   T.surface,       // cards, sheets
  surface2:  T.surface2,
  surface3:  T.surface3,
  surfaceAlt: T.surface3,     // subtle raised areas, inputs
  cardBg:    T.surface,
  overlay:   IS_DARK ? 'rgba(0,0,0,0.62)' : 'rgba(14,27,46,0.38)',
  glass:     IS_DARK ? 'rgba(18,20,24,0.9)' : 'rgba(255,255,255,0.9)',

  // Text
  textPrimary:   T.text,
  text2:         T.text2,
  text3:         T.text3,
  textSecondary: T.muted,
  textTertiary:  T.faint,
  textInverse:   '#FFFFFF',
  textOnBrand:   '#FFFFFF',

  // Borders / dividers
  border:      T.border,
  cardBorder:  T.cardBorder,
  inputBg:     T.inputBg,
  primaryTop:  T.primaryTop,
  navActiveBg: T.navActiveBg,
  navActiveFg: T.navActiveFg,
  glow:        T.glow,
  borderLight: T.surface3,
  borderStrong: T.borderStrong,
  divider:     T.borderStrong,

  // "Strong" surfaces: headers, active states, primary buttons — blue in light
  strong:      T.strong,
  strong2:     T.strong2,
  navy:        T.strong,
  navyDark:    T.strong2,
  navyMedium:  T.text3,
  navyLight:   T.border,
  gold:        T.warning2,
  goldDark:    T.warning,
  goldLight:   T.peach2,
  goldBg:      T.warningSoft,
  powderBlue:  '#A2D2FF',
  black:       '#000000',
  shadow:      T.shadow,

  // Palette shortcuts
  blue:        T.blue,
  blue2:       T.blue2,
  green:       T.green,
  peach:       T.peach,
  peach2:      T.peach2,
  grey:        T.surface3,
  ink:         T.text,
  primaryButton: T.primary,
  primaryDeep: T.primaryDeep,
  accentDeep:  T.accentDeep,
  accentSoft:  T.accentSoft,
  accentSofter: T.accentSofter,
  mutedSolid:  T.mutedSolid,
  mutedSolid2: T.mutedSolid2,
  faintSolid:  T.faintSolid,

  // Interactive
  link:        T.accent,
  linkPressed: T.accentDeep,
  linkBg:      T.accentSoft,

  // Accent — was purple
  purple:    T.accentDeep,
  purpleBg:  T.blue2,

  // Accent — grey (in-progress plot status: soft pick or pending-approval hold)
  inProgress:   T.muted,
  inProgressAlt: T.faint,
  inProgressBg: T.surface3,

  // Semantic status (color + matching tint background)
  success:     T.success,
  successAlt:  T.successSolid,
  successSolid: T.successSolid,
  successDeep: T.successDeep,
  success2:    T.success2,
  successBg:   T.successSoft,
  error:       T.danger,
  errorStrong: T.dangerDeep,
  errorSolid:  T.dangerSolid,
  error2:      T.danger2,
  errorBg:     T.dangerSoft,
  warning:     T.warning,
  warningAlt:  T.warning2,
  warningSolid: T.warningSolid,
  warningDeep: T.warningDeep,
  warningBg:   T.warningSoft,
  info:        T.accent,
  infoBg:      T.accentSoft,

  // ---- Legacy aliases (keep so existing imports still work) ----
  primary:    T.primary,
  accent:     T.warning2,
  secondary:  T.accent,
  white:      '#FFFFFF',
  background: T.screenBg,
  text:       T.text,
  lightGray:  T.border,
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
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: IS_DARK ? 0.4 : 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: IS_DARK ? '#000000' : '#0E1B2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: IS_DARK ? 0.5 : 0.18,
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
  THEME_MODE,
  IS_DARK,
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

// Tint any theme colour: withAlpha('#2F6DB5', '18') or withAlpha('rgba(1,2,3,0.5)', '18').
// Screens used to do `color + '18'`, which breaks for dark-mode rgba tokens.
export function withAlpha(color, hh) {
  const a = parseInt(hh, 16) / 255;
  if (typeof color !== 'string') return color;
  if (color[0] === '#') {
    let h = color.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return `#${h.slice(0, 6)}${hh}`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return color;
  const [r, g, b, al = 1] = m[1].split(',').map((x) => parseFloat(x));
  return `rgba(${r},${g},${b},${+(al * a).toFixed(3)})`;
}
