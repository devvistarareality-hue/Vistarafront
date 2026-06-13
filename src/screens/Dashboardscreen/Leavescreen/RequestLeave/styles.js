import { StyleSheet, Dimensions, Platform } from 'react-native';
import { COLORS } from '../../../../constants/theme';

const { width } = Dimensions.get('window');

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.035,
  },
  backButton: {
    padding: width * 0.01,
  },
  backIcon: {
    width: width * 0.06,
    height: width * 0.06,
    resizeMode: 'contain',
    tintColor: COLORS.white,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: width * 0.045,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerRight: {
    width: width * 0.08,
  },

  // Body
  body: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: width * 0.04,
    paddingTop: width * 0.04,
    paddingBottom: width * 0.06,
    flexGrow: 1,
  },

  // Toggle card (shared for Leave/WFH, Full/Half/Short, First/Second)
  toggleCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: width * 0.03,
    marginBottom: width * 0.035,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: width * 0.038,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: width * 0.03,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: width * 0.038,
    fontWeight: '500',
    color: '#AAAAAA',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Date picker row
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.042,
    marginBottom: width * 0.035,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  calendarIcon: {
    fontSize: width * 0.05,
    marginRight: width * 0.03,
  },
  dateText: {
    fontSize: width * 0.038,
    color: '#AAAAAA',
  },
  dateTextFilled: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Description
  descCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.03,
    marginBottom: width * 0.035,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    minHeight: width * 0.4,
  },
  descInput: {
    fontSize: width * 0.038,
    color: '#333333',
    flex: 1,
    minHeight: width * 0.35,
  },

  // Footer submit
  footer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.04,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: width * 0.03,
    paddingVertical: width * 0.042,
    alignItems: 'center',
    elevation: 3,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: width * 0.042,
    fontWeight: '700',
    letterSpacing: 0.5,
  },


  // Leave type dropdown card
  dropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: width * 0.042,
    marginBottom: width * 0.035,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  dropdownLabel: {
    fontSize: width * 0.038,
    fontWeight: '600',
    color: COLORS.text,
  },
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.02,
  },
  dropdownValue: {
    fontSize: width * 0.038,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dropdownArrow: {
    width: width * 0.04,
    height: width * 0.04,
    resizeMode: 'contain',
    tintColor: COLORS.primary,
  },

  // Bottom sheet backdrop
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Bottom sheet panel
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: width * 0.06,
    borderTopRightRadius: width * 0.06,
    paddingHorizontal: width * 0.05,
    paddingBottom: Platform.OS === 'ios' ? width * 0.1 : width * 0.06,
    paddingTop: width * 0.03,
    elevation: 20,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: width * 0.12,
    height: width * 0.012,
    borderRadius: width * 0.006,
    backgroundColor: '#DDDDDD',
    marginBottom: width * 0.04,
  },
  sheetTitle: {
    fontSize: width * 0.042,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: width * 0.04,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: width * 0.04,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetOptionText: {
    fontSize: width * 0.04,
    color: '#666666',
    fontWeight: '500',
  },
  sheetOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  sheetCheckDot: {
    width: width * 0.03,
    height: width * 0.03,
    borderRadius: width * 0.015,
    backgroundColor: COLORS.primary,
  },
  sheetCancelBtn: {
    marginTop: width * 0.04,
    paddingVertical: width * 0.038,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: width * 0.03,
  },
  sheetCancelText: {
    fontSize: width * 0.038,
    fontWeight: '600',
    color: '#888888',
  },
});
