import { StyleSheet, Dimensions } from 'react-native';
import { COLORS, CARD_SHADOW } from '../../../constants/theme';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },

  locationCard: {
    backgroundColor: COLORS.cardBg,
    margin: 20,
    marginBottom: 0,
    borderRadius: 18,
    padding: 16,
    ...CARD_SHADOW,
  },
  locLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locLoadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  locStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locDot: { width: 14, height: 14, borderRadius: 7 },
  locStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  locCoords: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  locIcon: { fontSize: 22, fontWeight: 'bold' },

  statusRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 14,
  },
  statusBox: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statusBoxRight: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    alignItems: 'flex-end',
  },
  statusLabel: {
    color: COLORS.powderBlue,
    fontSize: 11,
    letterSpacing: 0.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },

  card: {
    backgroundColor: COLORS.cardBg,
    margin: 20,
    borderRadius: 18,
    padding: 16,
    ...CARD_SHADOW,
  },

  timeRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
  },
  timeBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  timeValueMuted: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  dateText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceAlt,
    marginVertical: 14,
  },

  remarksInput: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 36,
    marginBottom: 8,
  },

  expandBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  expandBtnArrow: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  moreDetailContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  moreDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingVertical: 3,
  },

  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 10,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...CARD_SHADOW,
  },
  signOutBtn: {
    backgroundColor: COLORS.navy,
  },
  checkInBtn: {
    backgroundColor: COLORS.success,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  bottomBtnText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});

export default styles;
