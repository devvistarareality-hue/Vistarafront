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
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#F5F6FA',
  },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 12, ...CARD_SHADOW },
  backIcon:    { width: 22, height: 22, tintColor: TEXT },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT },
  addBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', ...CARD_SHADOW },
  addIcon:     { width: 18, height: 18, tintColor: '#fff' },

  /* Search */
  searchRow:   { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: {
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 11, fontSize: 14, color: TEXT, ...CARD_SHADOW,
  },

  /* Type filter */
  typeFilterRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 14,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F6FA',
    alignItems: 'center', gap: 8,
  },
  typeTab:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E6F0' },
  typeTabActive:     { backgroundColor: NAVY, borderColor: NAVY },
  typeTabText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  typeTabTextActive: { color: '#fff' },
  totalCount:        { fontSize: 12, color: MUTED, marginLeft: 'auto' },

  /* List */
  list:      { padding: 16, gap: 12, paddingBottom: 32 },
  empty:     { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: MUTED, fontSize: 14 },

  /* Project card */
  projectCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, ...CARD_SHADOW },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTopLeft: { flex: 1, marginRight: 8 },
  projectName:     { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 3 },
  projectLocation: { fontSize: 13, color: MUTED },

  typeBadge:     {},
  typeBadgeText: { fontSize: 11, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },

  statsRow:    { flexDirection: 'row', backgroundColor: '#F5F6FA', borderRadius: 12, paddingVertical: 12, marginBottom: 12 },
  statItem:    { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 2 },
  statLbl:     { fontSize: 11, color: MUTED },
  statDivider: { width: 1, backgroundColor: '#E0E6F0' },

  cardFooter:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  description:   { flex: 1, fontSize: 12, color: MUTED, lineHeight: 18 },
  statusPill:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  statusDot:     { width: 7, height: 7, borderRadius: 4 },
  statusPillText:{ fontSize: 12, fontWeight: '700' },

  /* Form */
  formScroll:  { backgroundColor: '#F5F6FA', padding: 16, paddingBottom: 40, gap: 12 },
  formCard:    { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, ...CARD_SHADOW, gap: 4 },
  formSection: { fontSize: 12, fontWeight: '800', color: NAVY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },

  field:      { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 6 },
  required:   { color: '#EF4444' },
  input: {
    backgroundColor: '#F5F6FA', borderRadius: 12, borderWidth: 1, borderColor: '#E0E6F0',
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
  pickerSheet:  { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '50%' },
  pickerSheetTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 14, textAlign: 'center' },
  pickerOption:     { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  pickerOptionText: { fontSize: 15, color: TEXT },

  submitBtn: {
    backgroundColor: NAVY, borderRadius: 16, paddingVertical: 15, alignItems: 'center',
    shadowColor: NAVY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
