import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  // Location status card
  locationCard: {
    backgroundColor: '#fff',
    margin: 14,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  locLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locLoadingText: {
    color: '#555',
    fontSize: 14,
  },
  locStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  locStatusTitle: {
    fontSize: width * 0.038,
    fontWeight: '700',
    color: '#222',
  },
  locCoords: {
    fontSize: width * 0.028,
    color: '#888',
    marginTop: 2,
  },
  locIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  // Work Hours / Status bar
  statusRow: {
    flexDirection: 'row',
    backgroundColor: '#1E4080',
  },
  statusBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusBoxRight: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
    alignItems: 'flex-end',
  },
  statusLabel: {
    color: '#B0C4DE',
    fontSize: width * 0.028,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statusValue: {
    color: '#fff',
    fontSize: width * 0.05,
    fontWeight: 'bold',
  },

  // Detail Card
  card: {
    backgroundColor: '#fff',
    margin: 14,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  // In / Out time boxes
  timeRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  timeBox: {
    flex: 1,
    backgroundColor: '#E4EAF5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: width * 0.03,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  timeValue: {
    fontSize: width * 0.038,
    fontWeight: '600',
    color: '#111',
  },
  timeValueMuted: {
    fontSize: width * 0.038,
    fontWeight: '500',
    color: '#888',
  },

  // Date row
  fieldLabel: {
    fontSize: width * 0.032,
    color: '#888',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  dateText: {
    fontSize: width * 0.048,
    fontWeight: '400',
    color: '#111',
  },
  calIcon: {
    fontSize: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginVertical: 14,
  },

  // Remarks
  remarksInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#CDCDCD',
    paddingVertical: 6,
    fontSize: width * 0.035,
    color: '#222',
    minHeight: 36,
    marginBottom: 8,
  },

  // Expand buttons
  expandBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E4EAF5',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  expandBtnText: {
    fontSize: width * 0.034,
    fontWeight: '700',
    color: '#111',
    letterSpacing: 0.3,
  },
  expandBtnArrow: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  moreDetailContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  moreDetailText: {
    fontSize: width * 0.033,
    color: '#555',
    paddingVertical: 3,
  },

  // Bottom buttons
  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 10,
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  signOutBtn: {
    backgroundColor: '#1E4080',
  },
  checkInBtn: {
    backgroundColor: '#D44B1A',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  bottomBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: width * 0.035,
    letterSpacing: 0.5,
  },

  // Geofence hint
  geoHint: {
    marginHorizontal: 14,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  geoHintText: {
    fontSize: width * 0.033,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default styles;
