import { StyleSheet } from 'react-native';

const NAVY = '#182350';
const TEXT = '#1A1A2E';
const MUTED = '#8492A6';
const LINK = '#3D5AFE';

const CARD_SHADOW = {
  shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};

export default StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll:   { paddingBottom: 32 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#F5F6FA',
  },
  backBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 12, ...CARD_SHADOW },
  backIcon: { width: 22, height: 22, tintColor: TEXT },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8EEFF',
  },
  headerBtnAccent: { backgroundColor: NAVY, borderColor: NAVY },
  headerBtnText:   { fontSize: 13, fontWeight: '600', color: TEXT },

  /* Stats */
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 20,
  },
  statCard: {
    flex: 1, minWidth: '45%', borderRadius: 18, padding: 16, alignItems: 'center',
    backgroundColor: '#FFFFFF', ...CARD_SHADOW,
  },
  statValue:   { fontSize: 28, fontWeight: '800' },
  statLabel:   { fontSize: 12, fontWeight: '600', marginTop: 4 },
  statTapHint: { fontSize: 10, fontWeight: '600', marginTop: 6, opacity: 0.6 },

  /* Section */
  section:       { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 8, marginBottom: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  viewAll:      { fontSize: 13, fontWeight: '600', color: LINK },

  /* Card container */
  card: {
    marginHorizontal: 20, backgroundColor: '#FFFFFF', borderRadius: 18,
    paddingHorizontal: 4, ...CARD_SHADOW,
  },

  /* Lead row */
  leadRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  leadInfo:   { flex: 1 },
  leadName:   { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  leadSub:    { fontSize: 12, color: MUTED },
  leadRight:  { alignItems: 'flex-end', gap: 4 },
  timeAgo:    { fontSize: 11, color: MUTED, marginTop: 4 },
  divider:    { height: 1, backgroundColor: '#F5F6FA', marginHorizontal: 14 },

  /* Badge */
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  /* Project cards */
  projectList: { paddingHorizontal: 20, paddingBottom: 4 },
  projectCard: {
    width: 200, backgroundColor: '#FFFFFF', borderRadius: 18,
    padding: 16, marginRight: 12, ...CARD_SHADOW,
  },
  projectCardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  projectCardName:     { flex: 1, fontSize: 14, fontWeight: '800', color: TEXT, marginRight: 6 },
  projectTypeBadge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  projectTypeBadgeText:{ fontSize: 10, fontWeight: '700' },
  projectCardLocation: { fontSize: 12, color: MUTED, marginBottom: 4 },
  projectCardPrice:    { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 10 },
  projectCardFooter:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  projectCardLeads:    { fontSize: 12, color: MUTED, fontWeight: '600', flex: 1 },
  projectStatusDot:    { width: 7, height: 7, borderRadius: 4 },
  projectStatusText:   { fontSize: 11, color: MUTED },

  /* Team Queue */
  teamRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 14, overflow: 'hidden',
  },
  teamAvatar:    { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  teamInitials:  { fontSize: 14, fontWeight: '800' },
  teamInfo:      { flex: 1 },
  teamName:      { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 4 },
  teamRoleBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  teamRoleText:  { fontSize: 10, fontWeight: '700' },
  teamLeadBadge: { alignItems: 'center', marginRight: 4 },
  teamLeadCount: { fontSize: 18, fontWeight: '800', color: NAVY },
  teamLeadLabel: { fontSize: 10, color: MUTED },
  teamBar: {
    position: 'absolute', bottom: 0, left: 0, height: 3,
    backgroundColor: '#E8EEFF', borderRadius: 2,
  },
});
