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
  // Daylight Azure — same design as the dark theme, in blue on near-white (matches web)
  inkRgb: '12,24,43',
  screenBg: '#EEF3FA', surface: '#FFFFFF', surface2: '#F6F9FE', surface3: '#ECF2FA',
  border: 'rgba(12,24,43,0.09)', borderStrong: 'rgba(12,24,43,0.18)', cardBorder: 'rgba(12,24,43,0.09)', inputBg: '#F7FAFE',
  text: '#0B1524', text2: '#1E2C42', text3: '#3D4C63', muted: '#5B6A81', faint: '#8794A8',
  strong: '#2F6DB5', strong2: '#245A96',
  primary: '#2F6DB5', primaryTop: '#4E90E0', primaryDeep: '#245A96', accent: '#1F5FA8', accentDeep: '#17497F',
  navActiveBg: 'rgba(47,109,181,0.13)', navActiveFg: '#0B3E76',
  blue: 'rgba(47,109,181,0.10)', blue2: 'rgba(47,109,181,0.18)', accentSoft: 'rgba(47,109,181,0.09)', accentSofter: 'rgba(47,109,181,0.045)',
  success: '#1B7A45', successSolid: '#23874A', successDeep: '#125730', green: 'rgba(27,122,69,0.12)', success2: 'rgba(27,122,69,0.20)', successSoft: 'rgba(27,122,69,0.07)',
  danger: '#C8323C', dangerSolid: '#D9434B', dangerDeep: '#9A242C', danger2: 'rgba(200,50,60,0.22)', dangerSoft: 'rgba(200,50,60,0.06)',
  warning: '#96601A', warningSolid: '#B8741E', warningDeep: '#6B420C', warning2: '#C07D1D', peach: 'rgba(192,125,29,0.14)', peach2: '#F5B453', warningSoft: 'rgba(192,125,29,0.07)',
  mutedSolid: '#5B6A81', mutedSolid2: '#3D4C63', faintSolid: '#8794A8',
  shadow: '#2F6DB5', glow: '#2F6DB5',
};
const DARK = {
  // Obsidian Ember — true-black panels, warm ember accent, one top glow (matches web)
  inkRgb: '240,238,236',
  screenBg: '#040404', surface: '#0A0A0A', surface2: '#0F0E0E', surface3: '#171514',
  border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(255,255,255,0.15)', cardBorder: 'rgba(255,255,255,0.09)', inputBg: '#0C0B0B',
  text: '#F7F5F3', text2: '#E0DCD8', text3: '#B6AFA9', muted: '#8C8681', faint: '#5E5955',
  strong: '#E8541C', strong2: '#C4390C',
  primary: '#C4390C', primaryTop: '#E8541C', primaryDeep: '#9E2C08', accent: '#FF9264', accentDeep: '#FFC2A6',
  navActiveBg: 'rgba(255,110,45,0.14)', navActiveFg: '#FFD8C6',
  blue: 'rgba(255,122,61,0.12)', blue2: 'rgba(255,122,61,0.22)', accentSoft: 'rgba(255,122,61,0.10)', accentSofter: 'rgba(255,122,61,0.045)',
  success: '#6FDFA0', successSolid: '#1E9159', successDeep: '#AFF2CC', green: 'rgba(111,223,160,0.12)', success2: 'rgba(111,223,160,0.20)', successSoft: 'rgba(111,223,160,0.07)',
  danger: '#FF7B7B', dangerSolid: '#D93A3A', dangerDeep: '#FFB3B3', danger2: 'rgba(255,123,123,0.26)', dangerSoft: 'rgba(255,123,123,0.07)',
  warning: '#FFC97E', warningSolid: '#B8741E', warningDeep: '#FFE0B0', warning2: '#FFBB5C', peach: 'rgba(255,201,126,0.14)', peach2: '#F5B453', warningSoft: 'rgba(255,201,126,0.07)',
  mutedSolid: '#211D1B', mutedSolid2: '#2A2523', faintSolid: '#3A3431',
  shadow: '#000000', glow: '#FF5C1A',
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
