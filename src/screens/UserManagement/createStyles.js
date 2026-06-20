import { StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

export default StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.screenBg },

  /* Header */
  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  headerBtn:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surfaceAlt },
  headerTitle:  { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  scrollContent: { padding: 16, paddingBottom: 40 },

  /* Preview card */
  previewCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  previewAvatar:     { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  previewAvatarText: { fontSize: 22, fontWeight: '700', color: COLORS.white },
  previewName:       { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  previewRole:       { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  /* Form */
  label:      { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  inputIcon:  { marginRight: 10 },
  input:      { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  /* Role pills */
  pillRow:   { gap: 8 },
  pill:      { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 22, backgroundColor: COLORS.cardBg, borderWidth: 1.5, borderColor: COLORS.divider },
  pillActive:{ backgroundColor: COLORS.warningAlt, borderColor: COLORS.warningAlt },
  pillText:  { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.white },

  /* Module pills */
  pillGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modulePill:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, backgroundColor: COLORS.cardBg, borderWidth: 1.5, borderColor: COLORS.divider },
  modulePillActive:   { backgroundColor: COLORS.warningAlt, borderColor: COLORS.warningAlt },
  modulePillText:     { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  modulePillTextActive: { color: COLORS.white },

  /* Manager pills */
  managerSubtitle:      { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10, marginTop: -6 },
  managerPill:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, backgroundColor: COLORS.screenBg, borderWidth: 1.5, borderColor: COLORS.divider },
  managerPillActive:    { backgroundColor: COLORS.warningBg, borderColor: COLORS.warningAlt },
  managerPillText:      { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  managerPillTextActive:{ color: COLORS.warningAlt },

  /* Edit mode extras */
  inputDisabled:   { backgroundColor: COLORS.screenBg, opacity: 0.8 },
  editBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: COLORS.linkBg, borderWidth: 1, borderColor: COLORS.powderBlue },
  editBadgeText:   { fontSize: 11, fontWeight: '600', color: COLORS.secondary },
  changePassRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 10 },
  changePassText:  { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
  inputError:      { borderWidth: 1.5, borderColor: COLORS.error },
  errorRow:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  errorMsg:        { fontSize: 12, color: COLORS.error, fontWeight: '500', flex: 1 },

  /* Submit */
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary, borderRadius: 14, paddingVertical: 16, marginTop: 28 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});
