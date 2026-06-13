import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../../../constants/theme';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: width * 0.04,
    paddingBottom: width * 0.2,
    backgroundColor: '#F0F2F5',
  },

  // Month section header
  monthHeader: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: width * 0.05,
    marginBottom: width * 0.03,
  },

  // Leave card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: width * 0.03,
    padding: width * 0.035,
    marginBottom: width * 0.03,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width * 0.005 },
    shadowOpacity: 0.08,
    shadowRadius: width * 0.01,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    width: width * 0.18,
    marginRight: width * 0.03,
  },
  avatar: {
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: width * 0.07,
  },
  avatarPlaceholder: {
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: width * 0.07,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: width * 0.038,
    fontWeight: '700',
    color: COLORS.white,
  },
  nameText: {
    fontSize: width * 0.028,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: width * 0.015,
    fontWeight: '500',
  },

  // Info section
  infoSection: {
    flex: 1,
  },
  sessionText: {
    fontSize: width * 0.032,
    color: '#888888',
    marginBottom: width * 0.008,
  },
  dateText: {
    fontSize: width * 0.042,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: width * 0.008,
  },
  leaveTypeText: {
    fontSize: width * 0.032,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // Right section
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingVertical: width * 0.01,
    marginLeft: width * 0.02,
  },
  statusBadge: {
    paddingHorizontal: width * 0.03,
    paddingVertical: width * 0.012,
    borderRadius: width * 0.04,
  },
  statusText: {
    fontSize: width * 0.03,
    fontWeight: '600',
  },

  // Approved
  statusApproved: {
    backgroundColor: '#DBEAFE',
  },
  statusTextApproved: {
    color: '#1D4ED8',
  },

  // Pending
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusTextPending: {
    color: '#B45309',
  },

  // Rejected
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusTextRejected: {
    color: '#B91C1C',
  },

  chevronIcon: {
    width: width * 0.1,
    height: width * 0.1,
    resizeMode: 'contain',
    tintColor: '#CCCCCC',
    marginTop: width * 0.02,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: width * 0.1,
  },
  emptyContainer: {
    flex: 1,
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
