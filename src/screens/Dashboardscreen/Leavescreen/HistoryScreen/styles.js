import { StyleSheet, Dimensions } from 'react-native';
import { COLORS, CARD_SHADOW } from '../../../../constants/theme';

const { width } = Dimensions.get('window');
const NAVY  = COLORS.navy;
const TEXT  = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const LINK  = COLORS.link;

export default StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.screenBg },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, backgroundColor: COLORS.screenBg },

  monthHeader: { fontSize: 15, fontWeight: '800', color: TEXT, marginTop: 20, marginBottom: 12 },

  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg,
    borderRadius: 18, padding: 14, marginBottom: 10, ...CARD_SHADOW,
  },

  avatarSection: { alignItems: 'center', width: width * 0.16, marginRight: 12 },
  avatar:        { width: width * 0.12, height: width * 0.12, borderRadius: width * 0.06 },
  avatarPlaceholder: {
    width: width * 0.12, height: width * 0.12, borderRadius: width * 0.06,
    backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 14, fontWeight: '700', color: COLORS.powderBlue },
  nameText:       { fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 4, fontWeight: '500' },

  infoSection:  { flex: 1 },
  sessionText:  { fontSize: 11, color: MUTED, marginBottom: 3 },
  dateText:     { fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 3 },
  leaveTypeText:{ fontSize: 11, fontWeight: '700', color: LINK },

  rightSection: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 2, marginLeft: 8 },
  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText:   { fontSize: 11, fontWeight: '700' },

  statusApproved:     { backgroundColor: COLORS.successBg },
  statusTextApproved: { color: COLORS.success },
  statusPending:      { backgroundColor: COLORS.warningBg },
  statusTextPending:  { color: COLORS.warningAlt },
  statusRejected:     { backgroundColor: COLORS.screenBg },
  statusTextRejected: { color: COLORS.error },

  chevronIcon: { marginTop: 4 },

  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: width * 0.1 },
  emptyContainer: { flex: 1 },
  errorText:      { fontSize: 13, color: COLORS.error, textAlign: 'center' },
  emptyText:      { fontSize: 13, color: MUTED, textAlign: 'center' },
  footerLoader:   { paddingVertical: 20, alignItems: 'center' },
});
