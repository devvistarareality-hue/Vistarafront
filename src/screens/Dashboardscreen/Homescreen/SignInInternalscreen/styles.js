import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const NAVY = '#182350';
const TEXT = '#1A1A2E';
const MUTED = '#8492A6';
const SUCCESS = '#2E7D32';
const ERROR = '#EF4444';

const CARD_SHADOW = {
  shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  mapCard: {
    margin: 16, borderRadius: 18, overflow: 'hidden', ...CARD_SHADOW,
    backgroundColor: '#FFFFFF',
  },
  map: { width: '100%', height: 220 },
  mapLoader: {
    height: 220, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: '#F5F6FA',
  },
  mapStatusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexWrap: 'wrap',
  },
  locDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  mapStatusText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, flex: 1 },
  mapCoordsText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  locLoadingText:{ color: MUTED, fontSize: 13 },

  statusRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 12 },
  statusBox: { flex: 1, backgroundColor: NAVY, borderRadius: 14, padding: 14, alignItems: 'center', ...CARD_SHADOW },
  statusBoxRight: { backgroundColor: ERROR },
  statusLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4, fontWeight: '600' },
  statusValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  card: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16,
    marginBottom: 16, borderRadius: 18, padding: 16, ...CARD_SHADOW,
  },
  timeRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  timeBox: {
    flex: 1, backgroundColor: '#E8F5E9', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  timeLabel: { fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 4 },
  timeValue: { fontSize: 16, fontWeight: '800', color: NAVY },
  timeMuted: { fontSize: 15, color: MUTED },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 },
  dateRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  dateText:   { fontSize: 15, fontWeight: '700', color: TEXT },
  divider:    { height: 1, backgroundColor: '#F5F6FA', marginVertical: 12 },

  remarksInput: {
    borderBottomWidth: 1, borderBottomColor: '#E0E6F0',
    paddingVertical: 8, fontSize: 14, color: TEXT, marginBottom: 12, minHeight: 40,
  },

  expandBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#E8EEFF', borderRadius: 12, padding: 14, marginBottom: 8,
  },
  expandText:  { fontSize: 13, fontWeight: '700', color: NAVY },
  expandArrow: { fontSize: 18, color: NAVY },
  moreDetail:  { padding: 12, backgroundColor: '#F5F6FA', borderRadius: 10, marginBottom: 8 },
  moreDetailText: { fontSize: 12, color: MUTED, marginBottom: 4 },

  bottomRow: { flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 16 },
  bottomBtn: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...CARD_SHADOW },
  signOutBtn:     { backgroundColor: NAVY },
  checkInBtn:     { backgroundColor: SUCCESS },
  btnDisabled:    { opacity: 0.4 },
  bottomBtnText:  { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default styles;
