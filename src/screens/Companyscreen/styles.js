import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const NAVY = COLORS.navy;
const TEXT = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const CARD_SHADOW = {
  shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18, shadowRadius: 12, elevation: 4,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  logo: {
    width: width * 0.48,
    height: width * 0.48,
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: MUTED,
    marginBottom: 36,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    height: 54,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: TEXT,
    ...CARD_SHADOW,
  },
  submitButton: {
    width: '100%',
    height: 54,
    backgroundColor: NAVY,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    elevation: 0,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default styles;
