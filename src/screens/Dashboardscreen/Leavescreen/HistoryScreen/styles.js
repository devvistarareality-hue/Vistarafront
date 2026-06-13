import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const NAVY  = '#182350';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';
const LINK  = '#3D5AFE';

const CARD_SHADOW = {
  shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.16, shadowRadius: 10, elevation: 3,
};

export default StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F5F6FA' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, backgroundColor: '#F5F6FA' },

  monthHeader: { fontSize: 15, fontWeight: '800', color: TEXT, marginTop: 20, marginBottom: 12 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 18, padding: 14, marginBottom: 10, ...CARD_SHADOW,
  },

  avatarSection: { alignItems: 'center', width: width * 0.16, marginRight: 12 },
  avatar:        { width: width * 0.12, height: width * 0.12, borderRadius: width * 0.06 },
  avatarPlaceholder: {
    width: width * 0.12, height: width * 0.12, borderRadius: width * 0.06,
    backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 14, fontWeight: '700', color: '#AFD2FA' },
  nameText:       { fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 4, fontWeight: '500' },

  infoSection:  { flex: 1 },
  sessionText:  { fontSize: 11, color: MUTED, marginBottom: 3 },
  dateText:     { fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 3 },
  leaveTypeText:{ fontSize: 11, fontWeight: '700', color: LINK },

  rightSection: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 2, marginLeft: 8 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:   { fontSize: 11, fontWeight: '700' },

  statusApproved:     { backgroundColor: '#E8F5E9' },
  statusTextApproved: { color: '#2E7D32' },
  statusPending:      { backgroundColor: '#FFF8E1' },
  statusTextPending:  { color: '#F9A825' },
  statusRejected:     { backgroundColor: '#FFF0F0' },
  statusTextRejected: { color: '#EF4444' },

  chevronIcon: { width: width * 0.08, height: width * 0.08, resizeMode: 'contain', tintColor: '#D0D5DD', marginTop: 4 },

  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: width * 0.1 },
  emptyContainer: { flex: 1 },
  errorText:      { fontSize: 13, color: '#EF4444', textAlign: 'center' },
  emptyText:      { fontSize: 13, color: MUTED, textAlign: 'center' },
  footerLoader:   { paddingVertical: 20, alignItems: 'center' },
});
