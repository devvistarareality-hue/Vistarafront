import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const NAVY   = '#1E4080';
const ORANGE = '#D44B1A';
const BG     = '#F0F4F8';

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
  avatarText: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '800',
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userRole: {
    color: '#A8C0E0',
    fontSize: 13,
    marginBottom: 12,
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  orgDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  orgText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Stats ──
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
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },

  // ── Actions ──
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
  section: {
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 12,
    paddingLeft: 2,
  },

  // ── Attendance Day Cards ──
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
  dayName: {
    fontSize: 12,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 0.5,
  },
  dayDate: {
    fontSize: 11,
    color: '#888',
    marginBottom: 8,
    marginTop: 2,
  },
  dayDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    width: '100%',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  timeValue: {
    fontSize: 10,
    color: '#333',
    fontWeight: '600',
  },
  totalRowCard: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabelCard: { fontSize: 10, color: ORANGE, fontWeight: '700' },
  totalValueCard: { fontSize: 10, color: ORANGE, fontWeight: '700' },

  // ── Detail Card ──
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
  detailIcon: {
    fontSize: 22,
    marginRight: 14,
    width: 30,
    textAlign: 'center',
  },
  detailText:  { flex: 1 },
  detailLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
  },
});

export default styles;
