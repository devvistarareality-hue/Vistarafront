import { StyleSheet } from 'react-native';

const NAVY  = '#182350';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';
const LINK  = '#3D5AFE';

const CARD_SHADOW = {
  shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};

export default StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6FA' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#F5F6FA',
  },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 12, ...CARD_SHADOW },
  backIcon:    { width: 22, height: 22, tintColor: TEXT },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT },
  addBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', ...CARD_SHADOW },
  addIcon:     { width: 18, height: 18, tintColor: '#fff' },

  /* Search */
  searchRow: { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: {
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 11, fontSize: 14, color: TEXT, ...CARD_SHADOW,
  },

  /* Filter tabs */
  filterRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F5F6FA', gap: 8,
  },
  filterTab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E0E6F0', gap: 4,
    backgroundColor: '#FFFFFF',
  },
  filterTabText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  filterTabTextActive: { color: '#FFFFFF' },
  filterCount: {
    backgroundColor: '#F0F0F0', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  filterCountText: { fontSize: 10, fontWeight: '700', color: MUTED },

  /* List */
  list: { padding: 16, gap: 12, paddingBottom: 32 },

  /* Lead card */
  leadCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderLeftWidth: 4, ...CARD_SHADOW,
  },
  leadCardRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  leadCardInfo: { flex: 1 },
  leadName:     { fontSize: 15, fontWeight: '800', color: TEXT },
  leadPhone:    { fontSize: 12, color: MUTED, marginTop: 2 },

  leadCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  metaChip:     { backgroundColor: '#E8EEFF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipText: { fontSize: 11, color: NAVY, fontWeight: '600' },
  timeAgo:      { fontSize: 11, color: MUTED, marginLeft: 'auto' },

  leadCardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  budget:         { fontSize: 13, fontWeight: '700', color: NAVY },
  assignedTo:     { fontSize: 11, color: MUTED },

  /* Badge */
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  /* Empty */
  empty:     { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: MUTED, fontSize: 14 },

  /* Detail screen */
  detailScroll: { backgroundColor: '#F5F6FA', paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', margin: 16,
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, ...CARD_SHADOW,
  },
  profileAvatar:     { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  profileAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profileInfo:       { flex: 1 },
  profileName:       { fontSize: 18, fontWeight: '800', color: TEXT },
  profilePhone:      { fontSize: 14, color: MUTED, marginTop: 2 },

  stmFlag: {
    backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center',
  },
  stmFlagText: { fontSize: 10, fontWeight: '800', color: '#fff', textAlign: 'center' },

  transferBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1',
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderLeftWidth: 4, borderLeftColor: '#F9A825', gap: 8,
  },
  transferBannerIcon: { fontSize: 16 },
  transferBannerText: { fontSize: 13, color: TEXT, flex: 1 },

  statusHint: { fontSize: 11, color: MUTED, marginTop: 8, textAlign: 'center' },

  sectionCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 18, padding: 16, ...CARD_SHADOW,
  },
  sectionCardTitle: {
    fontSize: 12, fontWeight: '800', color: NAVY, marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  /* Status changer */
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusChip: { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', minWidth: 60 },
  statusChipText: { fontSize: 13, fontWeight: '700' },

  /* Info rows */
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  infoLabel: { fontSize: 13, color: MUTED, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: TEXT, flex: 1.5, textAlign: 'right' },

  notesText: { fontSize: 14, color: TEXT, lineHeight: 21 },

  /* Timeline */
  activityItem:      { flexDirection: 'row', marginBottom: 4 },
  timelineLine:      { alignItems: 'center', width: 20, marginRight: 12 },
  timelineDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: LINK, marginTop: 3 },
  timelineConnector: { flex: 1, width: 2, backgroundColor: '#E0E6F0', marginTop: 2, marginBottom: -4, minHeight: 28 },
  activityContent:   { flex: 1, paddingBottom: 16 },
  activityType:      { fontSize: 12, fontWeight: '700', color: NAVY, marginBottom: 2 },
  activityNote:      { fontSize: 13, color: TEXT, marginBottom: 2 },
  activityTime:      { fontSize: 11, color: MUTED },

  /* Add Lead Form */
  formScroll: { backgroundColor: '#F5F6FA', padding: 16, paddingBottom: 40, gap: 12 },
  formCard:   { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, ...CARD_SHADOW, gap: 4 },
  formSection: {
    fontSize: 12, fontWeight: '800', color: NAVY, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  field:      { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 6 },
  required:   { color: '#EF4444' },
  input: {
    backgroundColor: '#F5F6FA', borderRadius: 12,
    borderWidth: 1, borderColor: '#E0E6F0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT,
  },
  textarea: { height: 90, paddingTop: 12 },

  pickerBtn: {
    backgroundColor: '#F5F6FA', borderRadius: 12, borderWidth: 1, borderColor: '#E0E6F0',
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerValue:       { fontSize: 14, color: TEXT },
  pickerPlaceholder: { fontSize: 14, color: '#C0CAD8' },
  pickerArrow:       { fontSize: 20, color: MUTED, marginTop: -2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, maxHeight: '60%',
  },
  pickerSheetTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 14, textAlign: 'center' },
  pickerOption:     { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  pickerOptionText: { fontSize: 15, color: TEXT },

  submitBtn: {
    backgroundColor: NAVY, borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    shadowColor: NAVY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  /* Filter icon button */
  filterIconBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', ...CARD_SHADOW,
  },
  filterIconBtnActive: { backgroundColor: NAVY },
  filterIconText:      { fontSize: 16, color: TEXT },
  filterBadge: {
    position: 'absolute', top: -4, right: -4, width: 16, height: 16,
    borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  /* Active filter chips */
  activeFiltersRow: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16,
    paddingBottom: 8, gap: 8, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F5F6FA',
  },
  activeFilterChip: {
    backgroundColor: '#E8EEFF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#3D5AFE',
  },
  activeFilterChipText: { fontSize: 12, fontWeight: '600', color: LINK },

  /* Filter bottom sheet */
  filterSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 32, paddingTop: 14, maxHeight: '85%',
  },
  fsHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  fsTitle:       { fontSize: 18, fontWeight: '800', color: TEXT },
  fsClear:       { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  fsSection:     { paddingHorizontal: 20, marginBottom: 20 },
  fsSectionTitle:{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  fsChips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fsChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E0E6F0', backgroundColor: '#F5F6FA',
  },
  fsChipText:   { fontSize: 13, fontWeight: '600', color: MUTED },
  fsFooter:     { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  fsCancelBtn:  { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E6F0', alignItems: 'center' },
  fsCancelText: { fontSize: 15, fontWeight: '600', color: MUTED },
  fsApplyBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: NAVY, alignItems: 'center',
    shadowColor: NAVY, shadowOpacity: 0.28, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 3,
  },
  fsApplyText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* Status sheet */
  sheetOverlay:   { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  statusSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 32,
  },
  sheetHandle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E6F0', alignSelf: 'center', marginBottom: 16 },
  statusSheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  statusSheetTitle:  { fontSize: 18, fontWeight: '800', color: TEXT },
  noteInputLabel:    { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 6 },
  noteOptional:      { fontWeight: '400', color: MUTED },
  noteInput: {
    backgroundColor: '#F5F6FA', borderRadius: 12, borderWidth: 1, borderColor: '#E0E6F0',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, minHeight: 80, marginBottom: 16,
  },
  sheetFooter:      { flexDirection: 'row', gap: 12 },
  sheetCancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E6F0', alignItems: 'center' },
  sheetCancelText:  { fontSize: 15, fontWeight: '600', color: MUTED },
  sheetConfirmBtn:  { flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center', elevation: 3 },
  sheetConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
