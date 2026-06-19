import { StyleSheet, Dimensions, Platform } from 'react-native';
import { COLORS, CARD_SHADOW } from '../../../../constants/theme';

const { width } = Dimensions.get('window');
const NAVY  = COLORS.navy;
const TEXT  = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;

export default StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.screenBg },

  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt,
  },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle:{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: TEXT },
  headerRight:{ width: 38 },

  body: {
    backgroundColor: COLORS.screenBg, paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 24, flexGrow: 1,
  },

  toggleCard: {
    flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: 12,
    marginBottom: 16, padding: 4,
  },
  toggleBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: COLORS.cardBg, ...CARD_SHADOW },
  toggleText:      { fontSize: 13, fontWeight: '600', color: MUTED },
  toggleTextActive:{ color: NAVY, fontWeight: '800' },

  dateCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 14, ...CARD_SHADOW,
  },
  dateText:     { fontSize: 14, color: COLORS.shadow },
  dateTextFilled: { color: NAVY, fontWeight: '600' },

  descCard: {
    backgroundColor: COLORS.cardBg, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 12, marginBottom: 16, ...CARD_SHADOW, minHeight: 120,
  },
  descInput: { fontSize: 14, color: TEXT, flex: 1, minHeight: 100 },

  footer:    { backgroundColor: COLORS.screenBg, paddingHorizontal: 20, paddingVertical: 16 },
  submitBtn: {
    backgroundColor: NAVY, borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    shadowColor: NAVY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  submitText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  dropdownCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.cardBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 14, ...CARD_SHADOW,
  },
  dropdownLabel: { fontSize: 14, fontWeight: '600', color: TEXT },
  dropdownRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdownValue: { fontSize: 14, fontWeight: '700', color: NAVY },
  dropdownArrow: { width: 16, height: 16, resizeMode: 'contain', tintColor: NAVY },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12, elevation: 20,
  },
  sheetHandle:        { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 16 },
  sheetTitle:         { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 16 },
  sheetOption:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: COLORS.screenBg },
  sheetOptionText:    { fontSize: 15, color: MUTED, fontWeight: '500' },
  sheetOptionTextActive: { color: NAVY, fontWeight: '700' },
  sheetCheckDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: NAVY },
  sheetCancelBtn:     { marginTop: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.screenBg, borderRadius: 14 },
  sheetCancelText:    { fontSize: 14, fontWeight: '600', color: MUTED },
});
