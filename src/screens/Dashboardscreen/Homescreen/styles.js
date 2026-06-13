import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const NAVY   = '#1E4080';
const ORANGE = '#D44B1A';
const BG     = '#F0F4F8';

// Calendar cell width: card has 16px padding each side, section has 12px each side
const CAL_CELL_SIZE = Math.floor((width - 24 - 32) / 7);

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: BG },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },

  // ── Header ──
  header: {
    backgroundColor: NAVY,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 52,
  },
  headerCurve: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: BG,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#2D5BA8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText:  { color: '#fff', fontSize: 38, fontWeight: '800' },
  userName:    { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userRole:    { color: '#A8C0E0', fontSize: 13, marginBottom: 12 },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  orgDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 8 },
  orgText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  // ── Stat Cards ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 10,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon:  { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#888', fontWeight: '500' },

  // ── Action Buttons ──
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  actionIcon: { fontSize: 20, color: '#fff', marginBottom: 5 },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // ── Section ──
  section: { paddingHorizontal: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 12, paddingLeft: 2 },

  // ── Tab Row ──
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E4EAF2',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabText:       { fontSize: 13, color: '#888', fontWeight: '600' },
  tabTextActive: { color: NAVY, fontWeight: '700' },

  // ── Today View ──
  todayCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  todayDate: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 20,
    textAlign: 'center',
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayItem:      { flex: 1, alignItems: 'center' },
  todayItemIcon:  { fontSize: 28, marginBottom: 6 },
  todayItemLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 4 },
  todayItemValue: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  todayDivider:   { width: 1, height: 50, backgroundColor: '#F0F0F0' },
  absentBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  absentIcon: { fontSize: 40, marginBottom: 10 },
  absentText: { fontSize: 14, color: '#999', fontWeight: '500' },

  // ── Week View Day Cards ──
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
    width: 90,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    alignItems: 'center',
  },
  dayName:  { fontSize: 12, fontWeight: '800', color: NAVY, letterSpacing: 0.5 },
  dayDate:  { fontSize: 11, color: '#888', marginBottom: 8, marginTop: 2 },
  dayDivider: { height: 1, backgroundColor: '#F0F0F0', width: '100%', marginBottom: 8 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  timeLabel:      { fontSize: 10, color: '#999', fontWeight: '600' },
  timeValue:      { fontSize: 10, color: '#333', fontWeight: '600' },
  totalRowCard:   { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  totalLabelCard: { fontSize: 10, color: ORANGE, fontWeight: '700' },
  totalValueCard: { fontSize: 10, color: ORANGE, fontWeight: '700' },

  // ── Month / Calendar View ──
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  calNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calNavArrow: { fontSize: 22, color: NAVY, fontWeight: '700', lineHeight: 26 },
  calNavTitle: { fontSize: 16, fontWeight: '700', color: NAVY },

  calDayHeaders: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calDayHeader: {
    width: CAL_CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },

  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: CAL_CELL_SIZE,
    height: CAL_CELL_SIZE + 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  calCellToday: {
    backgroundColor: '#EEF4FF',
    borderRadius: 10,
  },
  calCellSelected: {
    backgroundColor: NAVY,
    borderRadius: 10,
  },
  calDayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  calDayNumToday:    { color: NAVY, fontWeight: '800' },
  calDayNumSelected: { color: '#fff', fontWeight: '800' },
  calHours:         { fontSize: 9, fontWeight: '700', marginTop: 2 },
  calHoursPresent:  { color: '#27AE60' },
  calHoursAbsent:   { color: '#CCC' },
  calHoursSelected: { color: 'rgba(255,255,255,0.85)' },

  calLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSample: { fontSize: 11, fontWeight: '800' },
  legendText:   { fontSize: 12, color: '#888', fontWeight: '500' },

  // ── Selected Day Detail ──
  calDetail: {
    marginTop: 14,
    backgroundColor: '#F8FAFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4EAF2',
  },
  calDetailDate: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 14,
    textAlign: 'center',
  },
  calDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calDetailItem:   { flex: 1, alignItems: 'center' },
  calDetailLabel:  { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 4 },
  calDetailValue:  { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  calDetailSep:    { width: 1, height: 36, backgroundColor: '#E0E8F0' },
  calDetailAbsent: { fontSize: 13, color: '#AAB', textAlign: 'center', paddingVertical: 6 },

  // ── User Details Card ──
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailIcon:    { fontSize: 22, marginRight: 14, width: 30, textAlign: 'center' },
  detailText:    { flex: 1 },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  detailValue:   { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },
  detailDivider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 16 },
});

export default styles;
