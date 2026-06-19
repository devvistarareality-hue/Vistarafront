import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');
const NAVY  = '#182350';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';

const CARD_SHADOW = {
  shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};

export default StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#182350',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backIcon:   { width: 22, height: 22, resizeMode: 'contain', tintColor: '#fff' },
  headerTitle:{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#fff' },
  headerRight:{ width: 38 },

  body: {
    backgroundColor: '#F5F6FA', paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 24, flexGrow: 1,
  },

  toggleCard: {
    flexDirection: 'row', backgroundColor: '#EAECF2', borderRadius: 12,
    marginBottom: 16, padding: 4,
  },
  toggleBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#FFFFFF', ...CARD_SHADOW },
  toggleText:      { fontSize: 13, fontWeight: '600', color: MUTED },
  toggleTextActive:{ color: NAVY, fontWeight: '800' },

  dateCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 14, ...CARD_SHADOW,
  },
  calendarIcon: { fontSize: 20, marginRight: 12 },
  dateText:     { fontSize: 14, color: '#C0CAD8' },
  dateTextFilled: { color: NAVY, fontWeight: '600' },

  descCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 12, marginBottom: 16, ...CARD_SHADOW, minHeight: 120,
  },
  descInput: { fontSize: 14, color: TEXT, flex: 1, minHeight: 100 },

  footer:    { backgroundColor: '#F5F6FA', paddingHorizontal: 20, paddingVertical: 16 },
  submitBtn: {
    backgroundColor: NAVY, borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    shadowColor: NAVY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  dropdownCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 14, ...CARD_SHADOW,
  },
  dropdownLabel: { fontSize: 14, fontWeight: '600', color: TEXT },
  dropdownRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dropdownValue: { fontSize: 14, fontWeight: '700', color: NAVY },
  dropdownArrow: { width: 16, height: 16, resizeMode: 'contain', tintColor: NAVY },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12, elevation: 20,
  },
  sheetHandle:        { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E6F0', marginBottom: 16 },
  sheetTitle:         { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 16 },
  sheetOption:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  sheetOptionText:    { fontSize: 15, color: MUTED, fontWeight: '500' },
  sheetOptionTextActive: { color: NAVY, fontWeight: '700' },
  sheetCheckDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: NAVY },
  sheetCancelBtn:     { marginTop: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: '#F5F6FA', borderRadius: 14 },
  sheetCancelText:    { fontSize: 14, fontWeight: '600', color: MUTED },
});
