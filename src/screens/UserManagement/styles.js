import { StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

export default StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.screenBg },

  /* Header */
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  headerBtn:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surfaceAlt },
  addBtn:      { backgroundColor: COLORS.secondary },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  /* Search */
  searchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginTop: 14, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  /* Tabs */
  tabsScroll:   { marginTop: 14 },
  tabsContent:  { paddingHorizontal: 16, gap: 8 },
  tab:          { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.divider },
  tabActive:    { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  tabText:      { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive:{ color: COLORS.white },

  /* Count */
  countText:  { marginHorizontal: 16, marginTop: 14, marginBottom: 4, fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },

  /* List */
  listContent: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 4 },

  /* Card */
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  avatar:      { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:  { fontSize: 18, fontWeight: '700', color: COLORS.white },
  cardInfo:    { flex: 1 },
  userName:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  userEmail:   { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },

  badgeRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleBadge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleBadgeText:  { fontSize: 11, fontWeight: '600' },
  managerBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: COLORS.warningAlt, backgroundColor: COLORS.screenBg },
  managerBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.warningAlt },

  cardRight:    { alignItems: 'flex-end', gap: 4 },
  moduleCount:  { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },

  errorText: { textAlign: 'center', marginTop: 40, color: COLORS.error, fontSize: 14 },
});
