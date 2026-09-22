import { StyleSheet } from 'react-native';
import { COLORS, SHADOWS, RADIUS } from '../constants/theme';

/**
 * Shared styles for every screen. Use these instead of inline `style={{ … }}`.
 *
 *   import common from '../../styles/common';
 *   <SafeAreaView style={common.screen}>
 *     <View style={common.header}>
 *       <TouchableOpacity style={common.iconBtn}>…</TouchableOpacity>
 *       <Text style={common.headerTitle}>Company Management</Text>
 *     </View>
 *
 * Need a variation? Combine: style={[common.card, styles.myCard]} where `styles`
 * is a StyleSheet.create() at the bottom of the screen file. Colours always come
 * from COLORS so light and dark themes keep working.
 */
const common = StyleSheet.create({
  // Layout
  screen:        { flex: 1, backgroundColor: 'transparent' },
  scroll:        { paddingHorizontal: 16, paddingBottom: 32 },
  row:           { flexDirection: 'row', alignItems: 'center' },
  rowBetween:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid2:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gap8:          { gap: 8 },
  center:        { alignItems: 'center', justifyContent: 'center' },

  // Header
  header:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent' },
  // lineHeight keeps descenders (g, y, p) from being clipped when a title is truncated to one line.
  headerTitle:   { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '800', color: COLORS.textPrimary },
  headerTitleCenter: { flex: 1, textAlign: 'center', fontSize: 18, lineHeight: 24, fontWeight: '800', color: COLORS.textPrimary },
  headerSub:     { fontSize: 13, lineHeight: 18, color: COLORS.textSecondary },
  iconBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },

  // Text
  h1:            { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4 },
  h2:            { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  title:         { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  body:          { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  muted:         { fontSize: 13, color: COLORS.textSecondary },
  caption:       { fontSize: 11.5, color: COLORS.textSecondary },
  sectionLabel:  { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },
  link:          { fontSize: 13, fontWeight: '700', color: COLORS.link },

  // Surfaces
  card:          { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.md },
  cardFlat:      { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.surfaceAlt },
  tile:          { width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.md },
  tileBadge:     { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  tileLabel:     { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  divider:       { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

  // Form
  label:         { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input:         { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.inputBg },
  searchBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.inputBg, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },

  // Buttons (tinted glass, same as the website)
  btn:           { borderRadius: RADIUS.md, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnPrimary:    { backgroundColor: COLORS.btnTint, borderWidth: 1, borderColor: COLORS.btnBorder },
  btnPrimaryText:{ color: COLORS.btnText, fontSize: 15, fontWeight: '700' },
  btnSuccess:    { backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess },
  btnSuccessText:{ color: COLORS.btnTextSuccess, fontSize: 15, fontWeight: '700' },
  btnDanger:     { backgroundColor: COLORS.btnTintDanger, borderWidth: 1, borderColor: COLORS.btnBorderDanger },
  btnDangerText: { color: COLORS.btnTextDanger, fontSize: 15, fontWeight: '700' },
  btnSecondary:  { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong },
  btnSecondaryText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },

  // Pills / chips
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn:        { backgroundColor: COLORS.btnTint, borderColor: COLORS.btnBorder },
  chipText:      { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextOn:    { color: COLORS.btnText, fontWeight: '700' },
  badge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText:     { fontSize: 11.5, fontWeight: '700' },

  // Overlays
  overlay:       { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet:         { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, paddingBottom: 36 },
});

export default common;
