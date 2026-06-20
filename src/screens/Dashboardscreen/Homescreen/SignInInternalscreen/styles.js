import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../../../constants/theme';

const { width } = Dimensions.get('window');
const NAVY = COLORS.navy;
const TEXT = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const SUCCESS = COLORS.success;
const ERROR = COLORS.error;

const CARD_SHADOW = {
  shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },

  mapCard: {
    margin: 16, borderRadius: 18, overflow: 'hidden', ...CARD_SHADOW,
    backgroundColor: COLORS.white,
  },
  map: { width: '100%', height: 220 },
  mapLoader: {
    height: 220, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: COLORS.screenBg,
  },
  mapStatusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexWrap: 'wrap',
  },
  locDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white },
  mapStatusText: { color: COLORS.white, fontWeight: '700', fontSize: 13, flex: 1 },
  mapCoordsText: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  locLoadingText:{ color: MUTED, fontSize: 13 },

  statusRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 12 },
  statusBox: { flex: 1, backgroundColor: NAVY, borderRadius: 14, padding: 14, alignItems: 'center', ...CARD_SHADOW },
  statusBoxRight: { backgroundColor: ERROR },
  statusLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4, fontWeight: '600' },
  statusValue: { color: COLORS.white, fontSize: 18, fontWeight: '800' },

  card: {
    backgroundColor: COLORS.white, marginHorizontal: 16,
    marginBottom: 16, borderRadius: 18, padding: 16, ...CARD_SHADOW,
  },
  timeRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  timeBox: {
    flex: 1, backgroundColor: COLORS.successBg, borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  timeLabel: { fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 4 },
  timeValue: { fontSize: 16, fontWeight: '800', color: NAVY },
  timeMuted: { fontSize: 15, color: MUTED },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 },
  dateRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  dateText:   { fontSize: 15, fontWeight: '700', color: TEXT },
  divider:    { height: 1, backgroundColor: COLORS.screenBg, marginVertical: 12 },

  remarksInput: {
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingVertical: 8, fontSize: 14, color: TEXT, marginBottom: 12, minHeight: 40,
  },

  expandBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.linkBg, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  expandText:  { fontSize: 13, fontWeight: '700', color: NAVY },
  expandArrow: { fontSize: 18, color: NAVY },
  moreDetail:  { padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, marginBottom: 8 },
  moreDetailText: { fontSize: 12, color: MUTED, marginBottom: 4 },

  bottomRow: { flexDirection: 'row', marginHorizontal: 16, gap: 12, marginBottom: 16 },
  bottomBtn: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center', ...CARD_SHADOW },
  signOutBtn:     { backgroundColor: NAVY },
  checkInBtn:     { backgroundColor: SUCCESS },
  btnDisabled:    { opacity: 0.4 },
  bottomBtnText:  { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});

export default styles;
