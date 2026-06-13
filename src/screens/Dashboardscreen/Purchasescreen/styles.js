import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../../constants/theme';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.018,
    paddingTop: height * 0.025,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: height * 0.002 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  logoutButton: {
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.04,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: width * 0.037,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default styles;