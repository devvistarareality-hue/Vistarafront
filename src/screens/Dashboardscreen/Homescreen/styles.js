import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: '#1E4080',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D0D8E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 44,
  },
  userName: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  userRole: {
    color: '#B0C4DE',
    fontSize: width * 0.035,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 16,
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statDivider: {
    display: 'none', // spacing handled by padding
  },
  statLabel: {
    color: '#B0C4DE',
    fontSize: width * 0.03,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: width * 0.055,
    fontWeight: 'bold',
  },

  // ── Action Buttons ──
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  signInBtn: { backgroundColor: '#D44B1A' },
  signOutBtn: { backgroundColor: '#D44B1A' },
  leaveBtn:  { backgroundColor: '#D44B1A' },
  actionBtnIcon: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: width * 0.028,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // ── Cards ──
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: width * 0.038,
    fontWeight: '700',
    color: '#1E4080',
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#D44B1A',
    paddingLeft: 10,
  },

  // ── Attendance Table ──
  table: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBg: {
    backgroundColor: '#F8F9FA',
  },
  totalRow: {
    backgroundColor: '#EEF2FA',
    borderTopWidth: 2,
    borderTopColor: '#D44B1A',
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    textAlign: 'center',
    fontSize: width * 0.026,
    color: '#333',
  },
  tableHeader: {
    fontWeight: '700',
    color: '#1E4080',
    fontSize: width * 0.026,
    textAlign: 'center',
  },
  labelCol: {
    width: width * 0.12,
    paddingLeft: 6,
    textAlign: 'left',
  },
  dateCol: {
    flex: 1,
  },
  rowLabel: {
    color: '#555',
    fontWeight: '600',
  },
  timeText: {
    color: '#444',
  },
  totalLabel: {
    fontWeight: 'bold',
    color: '#D44B1A',
  },
  totalText: {
    fontWeight: 'bold',
    color: '#D44B1A',
  },

  // ── User Info ──
  infoRow: {
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: width * 0.03,
    fontWeight: '700',
    color: '#888',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: width * 0.038,
    color: '#222',
    fontWeight: '500',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
});

export default styles;
