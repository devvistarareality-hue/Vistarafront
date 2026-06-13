import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const NAVY  = '#182350';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E6F0',
    backgroundColor: '#FFFFFF',
  },
  headerCell:  { fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#FFFFFF' },
  separator: { height: 1, backgroundColor: '#F5F6FA', marginHorizontal: 16 },

  dateCol:    { flex: 1 },
  changeCol:  { width: width * 0.2, textAlign: 'center' },
  balanceCol: { width: width * 0.18, textAlign: 'right' },

  dateText:        { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  leaveTypeText:   { fontSize: 11, fontWeight: '700', color: NAVY, marginBottom: 2 },
  descriptionText: { fontSize: 11, color: MUTED },

  changeCell: { fontSize: 14, fontWeight: '700' },
  positive:   { color: '#2E7D32' },
  negative:   { color: '#EF4444' },

  balanceCell: { fontSize: 14, fontWeight: '600', color: TEXT },

  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: width * 0.1 },
  errorText:  { fontSize: 13, color: '#EF4444', textAlign: 'center' },
  emptyText:  { fontSize: 13, color: MUTED, textAlign: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
