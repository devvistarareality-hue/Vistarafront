import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../../../constants/theme';

const { width } = Dimensions.get('window');
const NAVY  = COLORS.navy;
const TEXT  = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },

  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.cardBg,
  },
  headerCell:  { fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: COLORS.cardBg },
  separator: { height: 1, backgroundColor: COLORS.screenBg, marginHorizontal: 16 },

  dateCol:    { flex: 1 },
  changeCol:  { width: width * 0.2, textAlign: 'center' },
  balanceCol: { width: width * 0.18, textAlign: 'right' },

  dateText:        { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  leaveTypeText:   { fontSize: 11, fontWeight: '700', color: NAVY, marginBottom: 2 },
  descriptionText: { fontSize: 11, color: MUTED },

  changeCell: { fontSize: 14, fontWeight: '700' },
  positive:   { color: COLORS.success },
  negative:   { color: COLORS.error },

  balanceCell: { fontSize: 14, fontWeight: '600', color: TEXT },

  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: width * 0.1 },
  errorText:  { fontSize: 13, color: COLORS.error, textAlign: 'center' },
  emptyText:  { fontSize: 13, color: MUTED, textAlign: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
