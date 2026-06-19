import { StyleSheet, Dimensions } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_WEIGHT, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');
const CARD = (width - SPACING.lg * 3) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },

  heading: {
    fontSize: width * 0.05,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.navy,
    marginBottom: SPACING.lg,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.lg,
  },

  moduleBtn: {
    width: CARD,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },

  moduleIcon: {
    fontSize: width * 0.1,
    marginBottom: SPACING.md,
  },

  moduleName: {
    fontSize: width * 0.035,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
});

export default styles;
