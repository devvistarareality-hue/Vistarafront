import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../../../constants/theme';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Table header row
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.03,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  headerCell: {
    fontSize: width * 0.035,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Data row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.035,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: width * 0.04,
  },

  // Column widths
  dateCol: {
    flex: 1,
  },
  changeCol: {
    width: width * 0.2,
    textAlign: 'center',
  },
  balanceCol: {
    width: width * 0.18,
    textAlign: 'right',
  },

  // Date column content
  dateText: {
    fontSize: width * 0.038,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: width * 0.008,
  },
  leaveTypeText: {
    fontSize: width * 0.032,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: width * 0.005,
  },
  descriptionText: {
    fontSize: width * 0.03,
    color: '#888888',
  },

  // Change column
  changeCell: {
    fontSize: width * 0.038,
    fontWeight: '600',
  },
  positive: {
    color: '#2E7D32',
  },
  negative: {
    color: '#C62828',
  },

  // Balance column
  balanceCell: {
    fontSize: width * 0.038,
    fontWeight: '500',
    color: COLORS.text,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: width * 0.1,
  },
  errorText: {
    fontSize: width * 0.035,
    color: '#C62828',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: width * 0.035,
    color: '#888888',
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: width * 0.05,
    alignItems: 'center',
  },
});
