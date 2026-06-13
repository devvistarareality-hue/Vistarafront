import { StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/theme';

export default StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.primary },

  /* Header */
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    backgroundColor:   COLORS.primary,
  },
  backBtn:     { padding: 4, marginRight: 8 },
  backIcon:    { width: 22, height: 22, tintColor: '#fff' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  addBtn:      { padding: 6, backgroundColor: COLORS.accent, borderRadius: 8 },
  addIcon:     { width: 18, height: 18, tintColor: '#fff' },

  /* Search */
  searchRow: {
    backgroundColor:   COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom:     12,
  },
  searchInput: {
    backgroundColor:   '#fff',
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   9,
    fontSize:          14,
    color:             '#333',
    elevation:         2,
  },

  /* Type filter */
  typeFilterRow: {
    flexDirection:     'row',
    backgroundColor:   '#fff',
    paddingHorizontal: 12,
    paddingVertical:   10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems:        'center',
    gap:               8,
  },
  typeTab: {
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderRadius:      20,
    borderWidth:       1.5,
    borderColor:       '#DDD',
  },
  typeTabActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeTabText:       { fontSize: 13, fontWeight: '600', color: '#555' },
  typeTabTextActive: { color: '#fff' },
  totalCount:        { fontSize: 12, color: '#AAA', marginLeft: 'auto' },

  /* List */
  list:  { padding: 12, gap: 12, backgroundColor: '#F4F6FA', paddingBottom: 32 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#AAA', fontSize: 14 },

  /* Project card */
  projectCard: {
    backgroundColor: '#fff',
    borderRadius:    16,
    padding:         16,
    elevation:       3,
    shadowColor:     '#000',
    shadowOpacity:   0.07,
    shadowOffset:    { width: 0, height: 2 },
    shadowRadius:    8,
  },
  cardTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   12,
  },
  cardTopLeft:   { flex: 1, marginRight: 8 },
  projectName:   { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginBottom: 3 },
  projectLocation: { fontSize: 13, color: '#888' },

  typeBadge: {},
  typeBadgeText: {
    fontSize:          11,
    fontWeight:        '700',
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      8,
    overflow:          'hidden',
  },

  statsRow: {
    flexDirection:   'row',
    backgroundColor: '#F7F8FA',
    borderRadius:    10,
    paddingVertical: 12,
    marginBottom:    12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum:  { fontSize: 14, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
  statLbl:  { fontSize: 11, color: '#888' },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },

  cardFooter: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'space-between',
    gap:            8,
  },
  description: { flex: 1, fontSize: 12, color: '#888', lineHeight: 18 },
  statusPill: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      20,
    gap:               4,
  },
  statusDot:      { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },

  /* ── Add Project Form ── */
  formScroll: { backgroundColor: '#F4F6FA', padding: 16, paddingBottom: 40, gap: 12 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius:    14,
    padding:         16,
    elevation:       2,
    shadowColor:     '#000',
    shadowOpacity:   0.05,
    shadowOffset:    { width: 0, height: 1 },
    shadowRadius:    4,
    gap:             4,
  },
  formSection: {
    fontSize:      13,
    fontWeight:    '700',
    color:         COLORS.primary,
    marginBottom:  8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field:      { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  required:   { color: COLORS.accent },
  input: {
    backgroundColor:   '#F7F8FA',
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       '#E8E8E8',
    paddingHorizontal: 14,
    paddingVertical:   11,
    fontSize:          14,
    color:             '#333',
  },
  textarea: { height: 90, paddingTop: 11 },

  pickerBtn: {
    backgroundColor:   '#F7F8FA',
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       '#E8E8E8',
    paddingHorizontal: 14,
    paddingVertical:   11,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  pickerValue:       { fontSize: 14, color: '#333' },
  pickerPlaceholder: { fontSize: 14, color: '#BBB' },
  pickerArrow:       { fontSize: 20, color: '#AAA', marginTop: -2 },

  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent:  'flex-end',
  },
  pickerSheet: {
    backgroundColor:      '#fff',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding:              16,
    maxHeight:            '50%',
  },
  pickerSheetTitle: {
    fontSize:     16,
    fontWeight:   '700',
    color:        '#1A1A2E',
    marginBottom: 12,
    textAlign:    'center',
  },
  pickerOption: {
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerOptionText: { fontSize: 15, color: '#333' },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius:    14,
    paddingVertical: 15,
    alignItems:      'center',
    elevation:       4,
    shadowColor:     COLORS.primary,
    shadowOpacity:   0.3,
    shadowOffset:    { width: 0, height: 4 },
    shadowRadius:    8,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
