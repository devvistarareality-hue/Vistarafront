import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../../constants/theme';

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
  backIconImage: {
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
    letterSpacing: width * 0.001,
  },
  headerRight: {
    width: width * 0.08,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: width * 0.03,
  },
  tabLabel: {
    fontSize: width * 0.038,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
  },
  tabLabelActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: width * 0.008,
    width: '60%',
    borderRadius: width * 0.004,
    backgroundColor: COLORS.accent,
  },

  // TabView fills remaining space
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: width * 0.07,
    right: width * 0.06,
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: width * 0.07,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: width * 0.008 },
    shadowOpacity: 0.25,
    shadowRadius: width * 0.01,
  },
  fabIcon: {
    width: width * 0.07,
    height: width * 0.07,
    resizeMode: 'contain',
    tintColor: COLORS.white,
  },
});
