import { StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/theme';

export default StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: COLORS.primary },
  scroll:       { paddingBottom: 32, backgroundColor: '#F4F6FA' },

  /* Header */
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    backgroundColor:   COLORS.primary,
  },
  backBtn:      { padding: 4, marginRight: 8 },
  backIcon:     { width: 22, height: 22, tintColor: '#fff' },
  headerTitle:  { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  headerActions:{ flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical:    6,
    borderRadius:       8,
    borderWidth:        1,
    borderColor:        'rgba(255,255,255,0.5)',
  },
  headerBtnAccent: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  headerBtnText:   { fontSize: 13, fontWeight: '600', color: '#fff' },

  /* Stats */
  statsGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            12,
    padding:        16,
    backgroundColor: '#F4F6FA',
  },
  statCard: {
    flex:           1,
    minWidth:       '45%',
    borderRadius:   14,
    padding:        16,
    alignItems:     'center',
  },
  statValue:   { fontSize: 28, fontWeight: '800' },
  statLabel:   { fontSize: 12, fontWeight: '600', marginTop: 4 },
  statTapHint: { fontSize: 10, fontWeight: '600', marginTop: 6, opacity: 0.6 },

  /* Section */
  section:       { marginBottom: 8 },
  sectionHeader: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingVertical:   8,
  },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  viewAll:       { fontSize: 13, fontWeight: '600', color: COLORS.accent },

  /* Card container */
  card: {
    marginHorizontal: 16,
    backgroundColor:  '#fff',
    borderRadius:     14,
    paddingHorizontal: 4,
    elevation:        3,
    shadowColor:      '#000',
    shadowOpacity:    0.07,
    shadowOffset:     { width: 0, height: 2 },
    shadowRadius:     8,
  },

  /* Lead row */
  leadRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  avatar: {
    width:         38,
    height:        38,
    borderRadius:  19,
    justifyContent: 'center',
    alignItems:    'center',
    marginRight:   12,
  },
  avatarText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  leadInfo:     { flex: 1 },
  leadName:     { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  leadSub:      { fontSize: 12, color: '#888' },
  leadRight:    { alignItems: 'flex-end', gap: 4 },
  timeAgo:      { fontSize: 11, color: '#AAA', marginTop: 4 },
  divider:      { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 12 },

  /* Status badge */
  badge: {
    paddingHorizontal: 10,
    paddingVertical:    3,
    borderRadius:       20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  /* Project cards */
  projectList:   { paddingHorizontal: 16, paddingBottom: 4 },
  projectCard: {
    width:           200,
    backgroundColor: '#fff',
    borderRadius:    14,
    padding:         14,
    marginRight:     12,
    elevation:       3,
    shadowColor:     '#000',
    shadowOpacity:   0.07,
    shadowOffset:    { width: 0, height: 2 },
    shadowRadius:    8,
  },
  projectCardTop: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'flex-start',
    marginBottom:    6,
  },
  projectCardName:  { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginRight: 6 },
  projectTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      6,
  },
  projectTypeBadgeText: { fontSize: 10, fontWeight: '700' },
  projectCardLocation:  { fontSize: 12, color: '#888', marginBottom: 4 },
  projectCardPrice:     { fontSize: 13, fontWeight: '600', color: '#1E4080', marginBottom: 8 },
  projectCardFooter:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  projectCardLeads:     { fontSize: 12, color: '#555', fontWeight: '600', flex: 1 },
  projectStatusDot:     { width: 7, height: 7, borderRadius: 4 },
  projectStatusText:    { fontSize: 11, color: '#555' },

  /* Team Queue */
  teamRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   12,
    paddingHorizontal: 12,
    overflow:          'hidden',
  },
  teamAvatar: {
    width:          40,
    height:         40,
    borderRadius:   20,
    justifyContent: 'center',
    alignItems:     'center',
    marginRight:    12,
  },
  teamInitials:  { fontSize: 14, fontWeight: '800' },
  teamInfo:      { flex: 1 },
  teamName:      { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  teamRoleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  teamRoleText:  { fontSize: 10, fontWeight: '700' },
  teamLeadBadge: { alignItems: 'center', marginRight: 4 },
  teamLeadCount: { fontSize: 18, fontWeight: '800', color: '#1E4080' },
  teamLeadLabel: { fontSize: 10, color: '#AAA' },
  teamBar: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    height:          3,
    backgroundColor: '#E8EDF6',
    borderRadius:    2,
  },
});
