import { StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT, SHADOWS } from '../../constants/theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },
  header: {
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md + 2,
  },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.heavy, color: COLORS.textPrimary },
  logoutBtn: {
    width: 36, height: 36, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1, padding: SPACING.xl },
  welcomeCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xxl,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  welcomeIconRow: { marginBottom: SPACING.md },
  welcomeIcon: {
    width: 64, height: 64, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.successBg,
    justifyContent: 'center', alignItems: 'center',
  },
  welcomeTitle: { fontSize: FONT_SIZE['2xl'], fontWeight: FONT_WEIGHT.heavy, color: COLORS.textPrimary, marginBottom: SPACING.md },
  infoText: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary, marginBottom: SPACING.xs + 2 },
  infoValue: { fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  infoBox: {
    backgroundColor: COLORS.navy,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  infoBoxText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textInverse,
    textAlign: 'center',
    lineHeight: LINE_HEIGHT.normal,
  },
});

export default styles;
