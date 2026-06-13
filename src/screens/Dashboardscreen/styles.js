import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const NAVY = '#182350';
const TEXT = '#1A1A2E';
const MUTED = '#8492A6';
const CARD_SHADOW = {
  shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#F5F6FA',
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    ...CARD_SHADOW,
  },
  logoutText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 6,
  },
  infoValue: {
    fontWeight: '700',
    color: TEXT,
  },
  infoBox: {
    backgroundColor: NAVY,
    padding: 20,
    borderRadius: 18,
    ...CARD_SHADOW,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default styles;
