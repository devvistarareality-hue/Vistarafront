import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingVertical: height * 0.025,
    paddingHorizontal: width * 0.06,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: height * 0.00125 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: width * 0.063,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  logoutButton: {
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.042,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: width * 0.037,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: width * 0.06,
  },
  welcomeCard: {
    backgroundColor: COLORS.white,
    padding: width * 0.06,
    borderRadius: 12,
    marginBottom: height * 0.025,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: height * 0.00125 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  welcomeTitle: {
    fontSize: width * 0.074,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: height * 0.02,
  },
  infoText: {
    fontSize: width * 0.042,
    color: COLORS.text,
    marginBottom: height * 0.01,
  },
  infoValue: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  infoBox: {
    backgroundColor: COLORS.primary,
    padding: width * 0.06,
    borderRadius: 12,
  },
  infoBoxText: {
    fontSize: width * 0.042,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: height * 0.03,
  },
});

export default styles;